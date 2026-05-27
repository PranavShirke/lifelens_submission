import logging
import json
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from lifelens.config import GROQ_API_KEY
from lifelens.agents.graph_schema import GraphState
from lifelens.utils.agent_utils import Intent, CriticVerdict
# Need retriever logic for the retriever node
from lifelens.agents.retriever import _parse_filters
from lifelens.retrieval.search_engine import search_memories
from lifelens.agents.executor import _generate_answer

logger = logging.getLogger(__name__)

# --- Pydantic Schemas for Structured Output ---

class PlannerOutput(BaseModel):
    intent: str = Field(description="Intent of the query, e.g. memory_recall, general_greeting")
    needs_retrieval: bool = Field(description="Whether searching the vector DB is needed to answer")
    temporal_scope: str = Field(description="Time scope for the search, e.g. last_week, anytime, last_month")
    entities: List[str] = Field(description="List of people, places, or objects mentioned, capitalized")
    confidence_threshold: float = Field(description="Required similarity score threshold, e.g. 0.75")
    fallback: str = Field(description="Action to take if retrieval fails, e.g. ask_caretaker")
    filters: List[str] = Field(default_factory=list, description="Filters like 'time:last_week', 'type:image'")


class CriticOutput(BaseModel):
    verdict: str = Field(description="Must be exactly APPROVED, RETRY, or IGNORE")
    reason: str = Field(description="Reasoning for the verdict")


# --- Node Functions ---

def init_llm(temperature=0.2):
    return ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=temperature)

def planner_node(state: GraphState) -> Dict[str, Any]:
    """LangGraph node for generating a plan."""
    logger.info("--- PLANNER NODE ---")
    query = state["user_query"]
    
    llm = init_llm(temperature=0.2)
    structured_llm = llm.with_structured_output(PlannerOutput)
    
    system_prompt = """You are the Planner Agent for Ask LifeLens, an AI memory assistant for dementia patients.
Analyze the user's query and output a strategic plan in JSON format.
If the query asks about past events, people, or memories -> needs_retrieval=true.
If the query is a greeting -> needs_retrieval=false.
Generate filters like 'time:last_week', 'type:image' if specified.
"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"User Query: {query}")
    ]
    
    try:
        plan: PlannerOutput = structured_llm.invoke(messages)
        plan_dict = plan.dict()
        # Add max_retries default if not set
        if "max_retries" not in plan_dict:
            plan_dict["max_retries"] = 2
            
        logger.info(f"Generated Plan: {plan_dict}")
        return {"plan": plan_dict}
    except Exception as e:
        logger.error(f"Planner failed: {e}")
        # Fallback plan
        fallback = {
            "intent": "memory_recall",
            "needs_retrieval": True,
            "temporal_scope": "anytime",
            "entities": [],
            "confidence_threshold": 0.5,
            "fallback": "ask_caretaker",
            "filters": []
        }
        return {"plan": fallback}

def replanner_node(state: GraphState) -> Dict[str, Any]:
    """LangGraph node for replanning after a RETRY verdict."""
    logger.info("--- REPLANNER NODE ---")
    query = state["user_query"]
    critic_reason = state.get("critic_reasoning", "No reason provided")
    previous_plan = state.get("plan", {})
    
    llm = init_llm(temperature=0.3)
    structured_llm = llm.with_structured_output(PlannerOutput)
    
    system_prompt = """You are the Planner Agent. The previous plan failed with this feedback:
{feedback}
Adjust your plan (e.g., broaden temporal_scope, relax filters) to try again.
""".format(feedback=critic_reason)
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Original Query: {query}\nPrevious Plan: {json.dumps(previous_plan)}")
    ]
    
    try:
        plan: PlannerOutput = structured_llm.invoke(messages)
        plan_dict = plan.dict()
        logger.info(f"Replanned: {plan_dict}")
        return {"plan": plan_dict, "retry_count": state.get("retry_count", 0) + 1}
    except Exception as e:
        logger.error(f"Replanner failed: {e}")
        return {"retry_count": state.get("retry_count", 0) + 1}


def retriever_node(state: GraphState) -> Dict[str, Any]:
    """LangGraph node to fetch from Qdrant based on plan."""
    logger.info("--- RETRIEVER NODE ---")
    plan = state["plan"]
    query = state["user_query"]
    
    if not plan.get("needs_retrieval", True):
        return {"retrieved_memories": []}
        
    try:
        from lifelens.qdrant.client import get_qdrant_client
        client = get_qdrant_client()
        
        filters = _parse_filters(plan.get("filters", []), query)
        results = search_memories(
            client=client,
            query=query,
            filters=filters,
            top_k=5,
            patient_id=state["patient_id"]
        )
        
        # Inject medication scheduling context directly into results if queried
        q_lower = query.lower()
        if "medic" in q_lower or "pill" in q_lower or "rx" in q_lower or plan.get("intent") == "medication_query":
            try:
                from lifelens.agents.medication_scheduler import get_todays_medications
                meds = get_todays_medications(client, state["patient_id"])
                
                med_summary = "MEDICATION SCHEDULE FOR TODAY:\n"
                if not meds:
                    med_summary += "No medications scheduled for today."
                for m in meds:
                    status = m.get("status", "pending")
                    time = m.get("dose_time", "unknown time")
                    rx = m.get("medication_name", m.get("name", "Medicine"))
                    med_summary += f"- {rx} at {time} (Status: {status})\n"
                
                from datetime import datetime
                results.insert(0, {
                    "id": "meds_today_live_schedule",
                    "type": "text",
                    "content": med_summary,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as med_err:
                logger.error(f"Failed to inject medication context: {med_err}")

        return {"retrieved_memories": results}
    except Exception as e:
        logger.error(f"Retriever failed: {e}")
        return {"retrieved_memories": []}


def executor_node(state: GraphState) -> Dict[str, Any]:
    """LangGraph node to generate answer based on retrieved memories."""
    logger.info("--- EXECUTOR NODE ---")
    memories = state.get("retrieved_memories", [])
    query = state["user_query"]
    plan = state["plan"]
    
    answer = _generate_answer(query, memories, {"retrieve": plan.get("needs_retrieval", True)})
    return {"answer": answer}


def critic_node(state: GraphState) -> Dict[str, Any]:
    """LangGraph node to validate response groundedness."""
    logger.info("--- CRITIC NODE ---")
    answer = state.get("answer", "")
    memories = state.get("retrieved_memories", [])
    query = state["user_query"]
    
    if not memories and state["plan"].get("needs_retrieval", True):
        # Empty retrieval
        if any(phrase in answer.lower() for phrase in ["don't have", "no memories", "couldn't find"]):
            return {"critic_verdict": "APPROVED", "critic_reasoning": "Acknowledged lack of data correctly"}
        return {"critic_verdict": "RETRY", "critic_reasoning": "Answered confidentally despite no memories retrieved (hallucination)"}
        
    llm = init_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(CriticOutput)
    
    memory_summary = "\n".join([f"- {m.get('content', '')[:100]}" for m in memories[:5]])
    
    system_prompt = """You are the Critic Agent for LifeLens.
EVALUATE IF THIS ANSWER IS SAFE AND GROUNDED IN THE PROVIDED RELEVANT MEMORIES.
1. Does it only use provided info without hallucination?
2. Is the content safe, harmless, and free of unethical or harmful suggestions?
3. Does it strictly adhere to safety policies (no violent, hateful, or explicit language)?
If any of these fail, verdict MUST be RETRY. Otherwise APPROVED. (IGNORE if irrelevant).
"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Query: {query}\nMemories: {memory_summary}\nSuggested Answer: {answer}")
    ]
    
    try:
        eval_result: CriticOutput = structured_llm.invoke(messages)
        return {
            "critic_verdict": eval_result.verdict,
            "critic_reasoning": eval_result.reason
        }
    except Exception as e:
        logger.error(f"Critic failed: {e}")
        return {"critic_verdict": "APPROVED", "critic_reasoning": "Fallback approval safely"}


def trigger_node(state: GraphState) -> Dict[str, Any]:
    """Optional LangGraph node for generating notifications if needed."""
    return {"triggers": []}

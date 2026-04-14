"""
LangGraph Orchestrator for Ask LifeLens
"""
import uuid
import logging
from langgraph.graph import StateGraph, START, END
from typing import Dict, Any

from lifelens.agents.graph_schema import GraphState
from lifelens.agents.langgraph_nodes import (
    planner_node,
    retriever_node,
    executor_node,
    critic_node,
    trigger_node,
    replanner_node
)

# For logging logic compatibility
from lifelens.utils.agent_utils import log_agent_decision

logger = logging.getLogger(__name__)

def should_retrieve(state: GraphState):
    """Condition: If Planner says we need retrieval."""
    plan = state.get("plan", {})
    return "retrieve" if plan.get("needs_retrieval", True) else "executor"

def should_retry(state: GraphState):
    """Condition: Check critic verdict and retry count."""
    verdict = state.get("critic_verdict", "APPROVED")
    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 2)
    
    if verdict == "RETRY" and retry_count < max_retries:
        return "replan"
    return "trigger"

def build_graph():
    workflow = StateGraph(GraphState)
    
    # Add Nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("retriever", retriever_node)
    workflow.add_node("executor", executor_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("replanner", replanner_node)
    workflow.add_node("trigger", trigger_node)
    
    # Add Edges
    workflow.add_edge(START, "planner")
    workflow.add_conditional_edges(
        "planner",
        should_retrieve,
        {
            "retrieve": "retriever",
            "executor": "executor"
        }
    )
    workflow.add_edge("retriever", "executor")
    workflow.add_edge("executor", "critic")
    workflow.add_conditional_edges(
        "critic",
        should_retry,
        {
            "replan": "replanner",
            "trigger": "trigger"
        }
    )
    workflow.add_edge("replanner", "retriever")
    workflow.add_edge("trigger", END)
    
    return workflow.compile()

# Compile the graph
agent_graph = build_graph()

def run_agentic_flow(user_query: str, patient_id: str, qdrant_client, max_retries: int = 2) -> Dict[str, Any]:
    """Entry point matching exactly the old orchestrator.py signature."""
    session_id = str(uuid.uuid4())
    logger.info(f"Starting LangGraph run_agentic_flow for session {session_id}")
    
    initial_state = {
        "user_query": user_query,
        "patient_id": patient_id,
        "session_id": session_id,
        "max_retries": max_retries,
        "retry_count": 0,
        "plan": {},
        "retrieved_memories": [],
        "answer": "",
        "critic_verdict": "",
        "critic_reasoning": "",
        "triggers": [],
        "recommendations": []
    }
    
    final_state = agent_graph.invoke(initial_state)
    logger.info(f"LangGraph execution finished. Verdict: {final_state.get('critic_verdict')}")
    
    plan = final_state.get("plan", {})
    
    # Optional: Log the orchestrator decision at the end matching existing behavior
    try:
        log_agent_decision(
            client=qdrant_client,
            patient_id=patient_id,
            agent="orchestrator",
            session_id=session_id,
            verdict="OK" if final_state.get("critic_verdict") == "APPROVED" else "RETRY",
            attempt=final_state.get("retry_count", 0),
            reasoning=f"LangGraph completed with verdict: {final_state.get('critic_verdict')}",
            metadata={
                "query": user_query,
                "total_attempts": final_state.get("retry_count", 0) + 1,
                "sources_count": len(final_state.get("retrieved_memories", [])),
                "plan": plan
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log orchestrator decision: {e}")
    
    # Map state to expected output format for main.py backwards compatibility
    return {
        "answer": final_state.get("answer", "No answer generated."),
        "sources": final_state.get("retrieved_memories", []),
        "triggers": final_state.get("triggers", []),
        "recommendations": final_state.get("recommendations", []),
        "plan": plan,
        "verdict": final_state.get("critic_verdict", "APPROVED"),
        "retry_count": final_state.get("retry_count", 0),
        "session_id": final_state.get("session_id", session_id)
    }

"""
Orchestrator - Multi-Agent Coordination

Coordinates agent interactions in an autonomous loop:
1. Planner decides strategy
2. Retriever searches (if requested)
3. Executor generates answer
4. Critic evaluates
5. Retry if needed
6. Trigger agent generates proactive alerts

Compliant with multiagent.md Fix #2 - Retry & Replanning Loop
"""

import logging
import uuid
import time
from typing import Dict, List, Optional
from qdrant_client import QdrantClient
from lifelens.agents import planner, retriever, executor, critic, trigger, recommender
from lifelens.utils.agent_utils import CriticVerdict, log_agent_decision, should_trigger

logger = logging.getLogger(__name__)


def _format_duration(start: float, end: float) -> str:
    return f"{(end - start) * 1000:.1f}ms"


def run_agentic_flow(user_query: str, patient_id: str, qdrant_client: QdrantClient, 
                     max_retries: int = 2) -> Dict:
    """
    Main orchestration loop for multi-agent system.
    Implements multiagent.md Fix #2 - Retry & Replanning Loop.
    
    Args:
        user_query: User's question or request
        patient_id: Patient identifier
        qdrant_client: Qdrant client instance
        max_retries: Maximum number of retry attempts (default: 2)
        
    Returns:
        Dictionary containing:
        - answer: Generated answer string
        - sources: Retrieved memories (can be empty)
        - triggers: List of generated triggers
        - plan: Planner's strategy
        - verdict: Critic's evaluation (CriticVerdict enum value)
        - retry_count: Number of retries performed
        - session_id: Unique session identifier for tracing
    """
    
    # Generate session ID for tracking this entire flow
    session_id = str(uuid.uuid4())
    logger.info(f"Starting agentic flow [session: {session_id}] for query: '{user_query}'")
    trace = []
    
    # Step 1: Planner decides strategy
    planner_start = time.perf_counter()
    plan = planner.plan(user_query, patient_id, qdrant_client, session_id=session_id)
    planner_end = time.perf_counter()
    logger.info(f"Plan: {plan.get('reasoning', 'No reasoning')}")
    trace.append({
        "agent": "Planner",
        "action": "Initial plan",
        "input": user_query,
        "output": plan.get("reasoning", "Planning complete"),
        "duration": _format_duration(planner_start, planner_end),
        "status": "success",
    })
    
    # Initialize loop variables
    attempt = 0
    verdict = None
    retrieved = []
    result = ""
    max_attempts = plan.get("max_retries", max_retries)
    
    #Retry/replanning loop (multiagent.md Fix #2)
    while attempt <= max_attempts:
        logger.info(f"Attempt {attempt + 1}/{max_attempts + 1}")
        
        # Step 2: Conditional retrieval (multiagent.md Fix #5)
        retrieval_start = time.perf_counter()
        if plan.get("needs_retrieval", True) or plan.get("retrieve", True):
            retrieved = retriever.search(user_query, patient_id, plan, qdrant_client, session_id=session_id)
            logger.info(f"Retrieved {len(retrieved)} memories")
            retrieval_output = f"Retrieved {len(retrieved)} memories"
            retrieval_status = "success"
        else:
            logger.info("Plan decided: no retrieval needed")
            retrieved = []
            retrieval_output = "Skipped retrieval by plan"
            retrieval_status = "warning"
        retrieval_end = time.perf_counter()
        trace.append({
            "agent": "Retriever",
            "action": "Memory retrieval",
            "input": f"filters={plan.get('filters', [])}",
            "output": retrieval_output,
            "duration": _format_duration(retrieval_start, retrieval_end),
            "status": retrieval_status,
        })
        
        # Step 3: Executor generates answer
        executor_start = time.perf_counter()
        result = executor.execute(plan, retrieved, user_query, patient_id, qdrant_client, session_id=session_id)
        executor_end = time.perf_counter()
        logger.info(f"Executor generated answer: {result[:100]}...")
        trace.append({
            "agent": "Executor",
            "action": "Generate answer",
            "input": f"memories={len(retrieved)}",
            "output": result[:220],
            "duration": _format_duration(executor_start, executor_end),
            "status": "success",
        })
        
        # Step 4: Critic evaluates
        critic_start = time.perf_counter()
        verdict = critic.evaluate(user_query, result, retrieved, session_id, patient_id, qdrant_client)
        critic_end = time.perf_counter()
        logger.info(f"Critic verdict: {verdict.value if isinstance(verdict, CriticVerdict) else verdict}")
        
        # Convert string verdict to enum if needed (backward compatibility)
        if isinstance(verdict, str):
            verdict_mapping = {
                "OK": CriticVerdict.OK,
                "RETRY_RETRIEVAL": CriticVerdict.RETRY,
                "SUGGEST_TRIGGER": CriticVerdict.SUGGEST_TRIGGER,
                "REQUEST_MORE_DATA": CriticVerdict.NOT_ENOUGH_EVIDENCE
            }
            verdict = verdict_mapping.get(verdict, CriticVerdict.OK)

        trace.append({
            "agent": "Critic",
            "action": "Evaluate response",
            "input": f"answer_length={len(result)}",
            "output": f"Verdict: {verdict.value if isinstance(verdict, CriticVerdict) else verdict}",
            "duration": _format_duration(critic_start, critic_end),
            "status": "success" if verdict == CriticVerdict.OK else "warning",
        })
        
        # Check if done
        if verdict == CriticVerdict.OK:
            logger.info("Critic approved answer - flow complete")
            break
        
        # Step 5: Replan if retry needed
        if verdict == CriticVerdict.RETRY and attempt < max_attempts:
            logger.info(f"Critic requested RETRY - replanning (attempt {attempt + 1}/{max_attempts})...")
            replan_start = time.perf_counter()
            plan = planner.replan(user_query, patient_id, result, verdict.value, qdrant_client)
            replan_end = time.perf_counter()
            trace.append({
                "agent": "Planner",
                "action": "Replan",
                "input": f"attempt={attempt + 1}",
                "output": plan.get("reasoning", "Replan complete"),
                "duration": _format_duration(replan_start, replan_end),
                "status": "warning",
            })
            attempt += 1
        else:
            logger.info("Max retries reached or verdict doesn't require retry")
            break
    
            logger.info("Max retries reached or verdict doesn't require retry")
            break
    
    # Step 6: Conditional trigger generation (multiagent.md Fix #7)
    triggers = []
    if should_trigger(verdict):
        logger.info("Trigger conditions met - generating proactive alerts")
        trigger_start = time.perf_counter()
        triggers = trigger.generate(verdict, patient_id, qdrant_client, session_id=session_id)
        trigger_end = time.perf_counter()
        logger.info(f"Generated {len(triggers)} triggers")
        trace.append({
            "agent": "Trigger",
            "action": "Generate alerts",
            "input": f"verdict={verdict.value if isinstance(verdict, CriticVerdict) else verdict}",
            "output": f"Generated {len(triggers)} triggers",
            "duration": _format_duration(trigger_start, trigger_end),
            "status": "success",
        })
    else:
        logger.info(f"Trigger conditions not met for verdict: {verdict.value if isinstance(verdict, CriticVerdict) else verdict}")
    
    # Step 7: Generate recommendations (if needed)
    recommendations = []
    if plan.get("generate_recommendations", False) or plan.get("trigger_if_missing", False) or \
       verdict in (CriticVerdict.NOT_ENOUGH_EVIDENCE, CriticVerdict.SUGGEST_TRIGGER):
        try:
            recommendation_start = time.perf_counter()
            recommendations = recommender.suggest_captures(patient_id, qdrant_client, session_id=session_id)
            recommendation_end = time.perf_counter()
            logger.info(f"Generated {len(recommendations)} capture recommendations")
            trace.append({
                "agent": "Recommender",
                "action": "Suggest captures",
                "input": f"patient_id={patient_id}",
                "output": f"Generated {len(recommendations)} recommendations",
                "duration": _format_duration(recommendation_start, recommendation_end),
                "status": "success",
            })
        except Exception as e:
            logger.warning(f"Failed to generate recommendations: {e}")
            trace.append({
                "agent": "Recommender",
                "action": "Suggest captures",
                "input": f"patient_id={patient_id}",
                "output": f"Failed: {str(e)}",
                "duration": "0ms",
                "status": "error",
            })
    
    # Log final orchestrator decision
    try:
        log_agent_decision(
            client=qdrant_client,
            patient_id=patient_id,
            agent="orchestrator",
            session_id=session_id,
            verdict=verdict,
            attempt=attempt,
            reasoning=f"Flow completed after {attempt + 1} attempts with verdict: {verdict.value if isinstance(verdict, CriticVerdict) else verdict}",
            metadata={
                "query": user_query,
                "total_attempts": attempt + 1,
                "sources_count": len(retrieved),
                "triggers_count": len(triggers),
                "recommendations_count": len(recommendations)
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log orchestrator decision: {e}")
    
    return {
        "answer": result,
        "sources": retrieved if retrieved else [],
        "triggers": triggers,
        "recommendations": recommendations,
        "plan": plan,
        "trace": trace,
        "verdict": verdict.value if isinstance(verdict, CriticVerdict) else verdict,
        "retry_count": attempt,
        "session_id": session_id  # Include for UI tracing
    }


def _log_decision(qdrant_client: QdrantClient, patient_id: str, query: str, 
                  plan: Dict, verdict: str, answer: str):
    """
    Logs agent decision to Qdrant for learning and analytics using Learning Agent.
    
    Args:
        qdrant_client: Qdrant client instance
        patient_id: Patient identifier
        query: User query
        plan: Planner's decision
        verdict: Critic's verdict
        answer: Generated answer
    """
    
    try:
        from lifelens.agents import log_agent_decision
        
        # Use learning agent to log decision
        log_agent_decision(
            client=qdrant_client,
            agent_name="orchestrator",
            decision_type="query_flow",
            context={
                "query": query,
                "plan_reasoning": plan.get("reasoning", ""),
                "retrieve": plan.get("retrieve", True),
                "keywords": plan.get("keywords", [])
            },
            outcome={
                "verdict": verdict,
                "answer_preview": answer[:200],
                "answer_length": len(answer)
            },
            patient_id=patient_id
        )
        
        logger.info("Logged agent decision via Learning Agent")
        
    except Exception as e:
        logger.error(f"Failed to log decision: {e}")
        # Don't raise - logging is optional

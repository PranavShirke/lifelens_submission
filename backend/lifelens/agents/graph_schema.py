from typing import Dict, List, Any, Optional
from typing_extensions import TypedDict

class GraphState(TypedDict):
    """
    State dictionary for the Ask LifeLens LangGraph flow.
    """
    user_query: str
    patient_id: str
    session_id: str
    max_retries: int
    retry_count: int
    
    # Planner outputs
    plan: Dict[str, Any]
    
    # Retriever outputs
    retrieved_memories: List[Dict[str, Any]]
    
    # Executor outputs
    answer: str
    
    # Critic outputs
    critic_verdict: str  # "APPROVED", "RETRY", "IGNORE"
    critic_reasoning: str
    
    # Trigger/Recommendations outputs
    triggers: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]

import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict
from qdrant_client.http import models
from lifelens.qdrant.client import get_qdrant_client
from lifelens.config import QDRANT_COLLECTION_NAME, GROQ_API_KEY
from lifelens.ingestion.upsert_memory import upsert_memory
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

def consolidate_memories(patient_id: str, days_back: int = 7) -> bool:
    """
    Hierarchical Memory Consolidation:
    Fetches the past `days_back` of memories, synthesizes them into long-term summaries,
    and optionally deletes the raw noisy logs.
    """
    client = get_qdrant_client()
    now = datetime.utcnow()
    past_date = now - timedelta(days=days_back)
    past_timestamp = int(past_date.timestamp())
    
    # 1. Fetch memories from the past N days
    try:
        search_result = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="patient_id",
                        match=models.MatchValue(value=patient_id)
                    ),
                    models.FieldCondition(
                        key="timestamp",
                        range=models.Range(gte=past_timestamp)
                    )
                ]
            ),
            limit=100,
            with_payload=True
        )
        points = search_result[0]
        
        # Filter out already summarized data
        points = [p for p in points if p.payload.get("type") != "long_term_summary"]
        
        if not points:
            logger.info("No recent memories to consolidate.")
            return False
            
    except Exception as e:
        logger.error(f"Failed to fetch memories for consolidation: {e}")
        return False
        
    # 2. Prepare text for LLM
    memories_text = ""
    for p in points:
        content = p.payload.get("content") or p.payload.get("caption") or p.payload.get("transcript") or p.payload.get("analysis", "")
        ts = p.payload.get("timestamp", 0)
        dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
        memories_text += f"[{dt}] {p.payload.get('type')}: {content}\n"
        
    # 3. Synthesize via LLM
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY not set, cannot consolidate.")
        return False
        
    try:
        llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=0.2)
        system_prompt = """You are an expert cognitive summarizer for LifeLens.
Your task is to take a noisy list of daily logs/memories over the past week and synthesize them into a concise, high-level Long-Term Summary.
Focus on:
1. Routine patterns (e.g., "Ate breakfast around 9 AM every day").
2. Key events or visitors (e.g., "Anita visited twice").
3. Overall mood and adherence (e.g., "Mood was generally positive").
Do NOT list individual timestamps. Write 1-3 cohesive paragraphs."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Logs to summarize:\n{memories_text}")
        ]
        
        response = llm.invoke(messages)
        summary = response.content
        
    except Exception as e:
        logger.error(f"LLM synthesis failed: {e}")
        return False
        
    # 4. Store the new Long-Term Summary Memory
    try:
        summary_data = {
            "patient_id": patient_id,
            "content": f"WEEKLY CONSOLIDATED SUMMARY ({past_date.strftime('%b %d')} - {now.strftime('%b %d')}):\n{summary}",
            "is_milestone": True
        }
        # Use 'text' type but we can add a tag or identifier to mark it as summary
        # Upsert memory expects data dictionary
        upsert_memory(client, "text", summary_data)
        logger.info("Successfully created long-term consolidated memory.")
        
        # Optional: Delete the old raw logs to save vector DB space/reduce noise
        # This implements the "Garbage Collection" mentioned in the architecture upgrades
        point_ids = [p.id for p in points]
        client.delete(
            collection_name=QDRANT_COLLECTION_NAME,
            points_selector=models.PointIdsList(points=point_ids)
        )
        logger.info(f"Cleaned up {len(point_ids)} raw short-term memories.")
        
    except Exception as e:
        logger.error(f"Failed to save summary or cleanup: {e}")
        return False
        
    return True

if __name__ == "__main__":
    # Example usage:
    # consolidate_memories("patient_1", days_back=7)
    pass

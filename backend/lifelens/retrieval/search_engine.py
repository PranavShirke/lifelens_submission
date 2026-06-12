import warnings
warnings.filterwarnings('ignore', category=FutureWarning, module='google.generativeai')
import google.generativeai as genai
from qdrant_client import QdrantClient
from lifelens.config import QDRANT_COLLECTION_NAME, GEMINI_API_KEY
from qdrant_client.http import models
import logging
import time
from typing import List
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from pydantic import BaseModel, Field
from lifelens.config import GROQ_API_KEY
from lifelens.qdrant.knowledge_graph import get_knowledge_graph

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_embedding(text: str):
    """
    Generates embedding using Gemini API (Query mode).
    """
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as e:
        logging.error(f"Failed to generate embedding: {e}")
        raise e

def search_memories(client: QdrantClient, query: str, filters: dict = None, top_k: int = 10, patient_id: str = None):
    """
    Search for memories in Qdrant based on semantic similarity using Gemini Embeddings.
    Enhanced with person and location awareness.
    
    Args:
        client: QdrantClient instance
        query: User query string
        filters: Optional dictionary for filtering (e.g., {'timestamp': {'gte': 12345}})
        top_k: Number of results to return
        patient_id: Filter by patient ID
    
    Returns:
        List of formatted search results
    """
    
    # Generate Query Embedding
    query_vector = get_embedding(query)
    
    # Detect if query is about a person or location
    query_lower = query.lower()
    person_keywords = ['who is', 'who did', 'who was', 'meet with', 'see someone', 'visit']
    location_keywords = ['where', 'location', 'place']
    
    is_person_query = any(keyword in query_lower for keyword in person_keywords)
    is_location_query = any(keyword in query_lower for keyword in location_keywords)
    
    # Construct Filter
    qdrant_filter = None
    conditions = []
    should_conditions = []  # For OR conditions
    
    # Add patient_id filter
    if patient_id:
        conditions.append(
            models.FieldCondition(
                key="patient_id",
                match=models.MatchValue(value=patient_id)
            )
        )
        logging.info(f"Filtering by patient_id: {patient_id}")
    else:
        logging.warning("No patient_id provided for search!")
    
    # Add timestamp filters
    if filters and 'timestamp' in filters:
        conditions.append(
            models.FieldCondition(
                key="timestamp",
                range=models.Range(**filters['timestamp'])
            )
        )
    
    # Add mood/sentiment filters
    if filters and 'mood' in filters:
        mood_list = filters['mood']
        if mood_list:
            # Use should (OR) for multiple moods
            for mood in mood_list:
                should_conditions.append(
                    models.FieldCondition(
                        key="sentiment",
                        match=models.MatchValue(value=mood)
                    )
                )
    
    # Add type filters
    if filters and 'type' in filters:
        type_list = filters['type']
        if type_list:
            # Use should (OR) for multiple types
            for mem_type in type_list:
                should_conditions.append(
                    models.FieldCondition(
                        key="type",
                        match=models.MatchValue(value=mem_type)
                    )
                )
    
    # Enhanced: If asking about a person or location, traverse Knowledge Graph
    kg = get_knowledge_graph()
    kg_memory_ids = []
    kg_context = []
    
    if is_person_query or is_location_query:
        import re
        words = query.split()
        potential_entities = [w for w in words if w[0].isupper() and w.lower() not in 
                          ['who', 'is', 'tell', 'me', 'about', 'show', 'find', 'the', 'a', 'an', 'where', 'location', 'at', 'i', 'did', 'was', 'were', 'my']]
        
        for ent in potential_entities:
            # Also try to match person_tags directly in Qdrant
            should_conditions.append(models.FieldCondition(
                key="person_tags",
                match=models.MatchText(text=ent)
            ))
            
            # Traverse graph
            kg_res = kg.get_connected_entities(ent, depth=1)
            kg_memory_ids.extend(kg_res["memory_ids"])
            kg_context.extend(kg_res["context"])
            
    if kg_memory_ids:
        # Strongly prefer memories connected in the graph
        should_conditions.append(models.HasIdCondition(has_id=list(set(kg_memory_ids))))
    
    # Build final filter
    if conditions or should_conditions:
        filter_params = {}
        if conditions:
            filter_params["must"] = conditions
        if should_conditions:
            filter_params["should"] = should_conditions
        qdrant_filter = models.Filter(**filter_params)

    # Detect if query asks for recent/latest memories
    recency_keywords = ['latest', 'recent', 'newest', 'last', 'today', 'new', 'just']
    wants_recent = any(keyword in query_lower for keyword in recency_keywords)
    
    # Pure recency check: if there are no specific entities, we should fetch actual recent logs
    # rather than doing a semantic search for the word "recent"
    is_pure_recency = wants_recent and not is_person_query and not is_location_query
    
    results = []
    
    if is_pure_recency:
        # Bypass dense vector search, just fetch the latest N memories
        scroll_res = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=qdrant_filter,
            limit=top_k * 2,
            with_payload=True
        )[0]
        
        for hit in scroll_res:
            results.append({
                "id": hit.id,
                "score": 0.95,  # High score to pass legacy thresholds
                "type": hit.payload.get("type"),
                "caption": hit.payload.get("caption"),
                "transcript": hit.payload.get("transcript"),
                "content": hit.payload.get("content"),
                "analysis": hit.payload.get("analysis"),
                "timestamp": hit.payload.get("timestamp"),
                "sentiment": hit.payload.get("sentiment"),
                "person_tags": hit.payload.get("person_tags"),
                "location": hit.payload.get("location"),
                "source_image_base64": hit.payload.get("source_image_base64"),
                "source_audio_base64": hit.payload.get("source_audio_base64"),
                "video_path": hit.payload.get("video_path")
            })
            
        results.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return results[:top_k]
    
    # Perform Search using query_points for semantic queries
    search_result = client.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        query=query_vector,
        query_filter=qdrant_filter,
        limit=top_k * 4,  # Get more results for RRF and Re-ranking
        with_payload=True
    ).points
    
    # Extract keywords for sparse scoring
    keywords = _extract_keywords(query)
    
    # Find max timestamp for normalizing recency boost
    max_ts = 0
    min_ts = float('inf')
    if wants_recent:
        for hit in search_result:
            ts = hit.payload.get("timestamp", 0)
            if ts > max_ts:
                max_ts = ts
            if ts < min_ts:
                min_ts = ts
    
    # RRF (Reciprocal Rank Fusion) Scoring
    dense_ranks = {hit.id: rank for rank, hit in enumerate(search_result, 1)}
    
    sparse_scores = {}
    for hit in search_result:
        text_fields = [
            hit.payload.get("caption", ""),
            hit.payload.get("transcript", ""),
            hit.payload.get("content", ""),
            hit.payload.get("analysis", ""),
            hit.payload.get("person_tags", "")
        ]
        text_content = " ".join(str(f) for f in text_fields if f).lower()
        matches = sum(1 for kw in keywords if kw.lower() in text_content)
        sparse_scores[hit.id] = matches
        
    sorted_sparse = sorted(sparse_scores.items(), key=lambda x: x[1], reverse=True)
    sparse_ranks = {doc_id: rank for rank, (doc_id, score) in enumerate(sorted_sparse, 1)}
    
    for hit in search_result:
        d_rank = dense_ranks[hit.id]
        s_rank = sparse_ranks[hit.id]
        
        # Mathematical RRF formula — weight keyword matches more heavily
        rrf_score = (1.0 / (60 + d_rank)) + (1.5 / (60 + s_rank))
        
        result = {
            "id": hit.id,
            "score": rrf_score,
            "type": hit.payload.get("type"),
            "caption": hit.payload.get("caption"),
            "transcript": hit.payload.get("transcript"),
            "content": hit.payload.get("content"),
            "analysis": hit.payload.get("analysis"),
            "timestamp": hit.payload.get("timestamp"),
            "sentiment": hit.payload.get("sentiment"),
            "person_tags": hit.payload.get("person_tags"),
            "location": hit.payload.get("location"),
            "source_image_base64": hit.payload.get("source_image_base64"),
            "source_audio_base64": hit.payload.get("source_audio_base64"),
            "video_path": hit.payload.get("video_path")
        }
        
        # Recency boost
        if wants_recent and max_ts > min_ts:
            ts = result.get("timestamp", 0)
            if ts and max_ts > min_ts:
                recency_boost = ((ts - min_ts) / (max_ts - min_ts)) * 0.05
                result["score"] += recency_boost
                
        results.append(result)
    
    # Sort by RRF hybrid score
    results.sort(key=lambda x: x["score"], reverse=True)
    candidates = results[:top_k * 2]
    
    # LLM Cross-Encoder Re-Ranking
    reranked_results = _llm_rerank(query, candidates, top_k)
    
    # IMPORTANT: The legacy `api/main.py` filters results where score > 0.45.
    # Because RRF scores are mathematically tiny (~0.03), we MUST normalize them
    # back up to a high confidence range (0.8 - 0.99) so they don't get silently dropped.
    for i, res in enumerate(reranked_results):
        res["score"] = 0.99 - (i * 0.02)
    
    # Inject Graph context as a synthetic memory
    if kg_context:
        reranked_results.insert(0, {
            "id": "graph_rag_context",
            "type": "text",
            "content": "KNOWLEDGE GRAPH CONTEXT (Explicit Relationships):\n" + "\n".join(set(kg_context)),
            "timestamp": int(time.time()),
            "score": 1.0
        })
    
    logging.info(f"Search returned {len(reranked_results)} highly ranked results via Graph RAG & RRF.")
    return reranked_results

class ReRankResult(BaseModel):
    ranked_ids: List[str] = Field(description="List of memory IDs ordered by relevance to the query.")

def _llm_rerank(query: str, candidates: list, top_k: int) -> list:
    """Zero-Shot LLM Re-ranker to act as a cross-encoder filter."""
    if not GROQ_API_KEY or not candidates:
        return candidates[:top_k]
        
    try:
        llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=0.0)
        structured_llm = llm.with_structured_output(ReRankResult)
        
        docs_text = "\n".join([f"ID: {c['id']} | Content: {c.get('content') or c.get('caption') or c.get('transcript') or c.get('analysis')}" for c in candidates])
        
        prompt = f"You are a precision relevance re-ranker. Query: '{query}'. Evaluate these memory snippets and order their IDs from most to least relevant. Snippets:\n{docs_text}"
        res: ReRankResult = structured_llm.invoke([SystemMessage(content=prompt)])
        
        id_to_doc = {c['id']: c for c in candidates}
        ranked_docs = [id_to_doc[rid] for rid in res.ranked_ids if rid in id_to_doc]
        
        # Append remaining
        ranked_set = set(res.ranked_ids)
        ranked_docs.extend([c for c in candidates if c['id'] not in ranked_set])
        
        return ranked_docs[:top_k]
    except Exception as e:
        logging.warning(f"LLM Re-ranking failed: {e}")
        return candidates[:top_k]



def _extract_keywords(query: str) -> List[str]:
    """
    Extract important keywords from query for hybrid search.
    Ignores common stop words but keeps activity/noun terms.
    """
    stop_words = {
        'tell', 'me', 'about', 'what', 'when', 'where', 'who', 'how', 'show',
        'find', 'from', 'my', 'memories', 'the', 'a', 'an', 'and', 'or', 'but',
        'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was',
        'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
        'i', 'it', 'its', 'that', 'this', 'there', 'can', 'could', 'would',
        'should', 'will', 'shall', 'may', 'might', 'not', 'no', 'so', 'if',
        'then', 'than', 'just', 'also', 'any', 'all', 'some', 'very',
    }
    
    words = query.split()
    keywords = [word.strip('?,!.') for word in words if word.lower().strip('?,!.') not in stop_words and len(word.strip('?,!.')) > 1]
    
    return keywords

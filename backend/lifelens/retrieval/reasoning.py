import os
from groq import Groq
from lifelens.config import GROQ_API_KEY

def get_answer(query: str, memories: list) -> str:
    """
    Generates an answer using Groq LLaMA 3 based on retrieved memories.
    """
    if not GROQ_API_KEY:
        return "Error: GROQ_API_KEY is not set."
    
    # CRITICAL: Refuse to answer if no memories are found
    if not memories or len(memories) == 0:
        return "I couldn't find any relevant memories to answer your question. Please try rephrasing your query or add more memories to your collection."

    client = Groq(api_key=GROQ_API_KEY)

    # Format Memories for Context
    memory_context = ""
    for idx, mem in enumerate(memories):
        mem_type = mem.get('type')
        content = ""
        if mem_type == 'image':
            content = f"Image Caption: {mem.get('caption')}"
        elif mem_type == 'audio':
            content = f"Audio Transcript: {mem.get('transcript')}"
        elif mem_type == 'text':
            content = f"Note: {mem.get('content')}"
        elif mem_type == 'video':
            content = f"Video Analysis: {mem.get('analysis')}"
            
        timestamp = mem.get('timestamp')
        
        # Add person tags if available
        person_info = ""
        if mem.get('person_tags'):
            person_info = f" | People: {mem.get('person_tags')}"
        
        # Add location if available
        location_info = ""
        if mem.get('location'):
            loc = mem.get('location')
            if isinstance(loc, dict):
                location_info = f" | Location: {loc.get('name', str(loc.get('lat')) + ', ' + str(loc.get('lon')))}"
            
        memory_context += f"{idx+1}. [{mem_type.upper()}] {content}{person_info}{location_info} (Timestamp: {timestamp})\n"

    system_prompt = f"""
You are the LifeLens Cognitive Synthesis Engine. Your goal is to provide EXTREMELY CLEAR, highly detailed, and deeply contextualized answers based strictly on the user's stored memories.

CRITICAL RULES:
1. NO HALLUCINATION: You must ONLY use the provided memories and knowledge graph context. Do not use outside knowledge.
2. SYNTHESIZE TIMELINES: If multiple memories relate to the query, synthesize them into a coherent timeline or narrative. Explicitly connect the dots using the provided Knowledge Graph Context if present.
3. CITATION: You MUST cite your sources clearly for every fact. For example: "According to a photo taken on [Oct 12]..." or "Based on a graph connection..."
4. CLARITY: Use Markdown formatting extensively. Use bold text, bullet points, and logical groupings to make the answer highly readable for a patient or caretaker.
5. EXHAUSTIVE DETAIL: Pull out EVERY relevant detail from the context. Do not leave out mentioned people, locations, emotions, or medications. If it's in the context, synthesize it.
6. HONESTY: If the retrieved memories do not contain the answer, kindly and clearly state that you don't have stored memories about that. Do not guess.
7. SAFETY AND BOUNDARIES: You must strictly maintain a safe, harmless, and ethical tone. Do not generate violent, hateful, explicit, or harmful instructions. Refuse unsafe queries safely.

User Query:
{query}

Context Database:
{memory_context}

Analyze the context deeply. Construct a masterful, detailed, and completely grounded response.
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are the LifeLens Cognitive Synthesis Engine. You provide highly detailed, beautifully formatted, and 100% grounded answers based purely on the provided context."},
                {"role": "user", "content": system_prompt}
            ],
            temperature=0.1,  # Ultra-low temperature for factual synthesis
            max_tokens=1024,
            top_p=1,
            stream=False,
            stop=None,
        )
        
        return completion.choices[0].message.content
        
    except Exception as e:
        return f"Error generating answer: {str(e)}"

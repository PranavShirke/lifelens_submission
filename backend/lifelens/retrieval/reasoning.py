import os
from groq import Groq
from lifelens.config import GROQ_API_KEY

def get_answer(query: str, memories: list) -> str:
    """
    Generates an answer using Groq LLaMA 3 based on retrieved memories.
    """
    if not GROQ_API_KEY:
        return "Error: GROQ_API_KEY is not set."
    
    # We now allow queries without memories to act as a general helpful chatbot.
    
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
You are the LifeLens Cognitive Synthesis Engine. Your goal is to provide EXTREMELY CLEAR, warm, simple, and deeply contextualized answers. If memories are provided, synthesize them into the answer. If no memories are provided or the user asks a general question (e.g. how to make noodles), act as a warm, helpful, general AI assistant for a dementia patient. Provide a simple, comforting answer.

Since the user is a dementia patient, your response MUST be structured to significantly reduce cognitive load, use clear visual headers, and be highly reassuring and warm.

CRITICAL RULES:
1. USE MEMORIES WHEN AVAILABLE: If memories relate to the query, use them. If not, provide a helpful general answer from your world knowledge.
2. SYNTHESIZE TIMELINES: If multiple memories relate to the query, synthesize them into a coherent timeline or narrative.
3. CITATION: Cite your sources warmly and naturally (e.g., "From a photo in May...", "Based on a note from yesterday..."). Do not use technical/dry citations.
4. FORMATTING AND STRUCTURE: You MUST strictly format your response into the following three distinct sections, separated by blank lines. Use the exact headers below (including the emojis):

### 🌟 Summary
[A very friendly, reassuring, simple 1-2 sentence direct answer in a warm and positive tone. Avoid any complex words or long sentences.]

### 🔍 Memory Details
[Use standard bullet points with these exact keys if information is available in the memories. If a key is completely unknown, omit that bullet point]:
* 📅 **When:** [When it happened, warmly stated]
* 📍 **Where:** [Where it happened]
* 👥 **Who:** [Who was there with you]
* 💡 **What happened:** [1-2 simple sentences of the key activity or findings]

### 💭 Reflection
[A warm, comforting, and encouraging closing sentence to support the patient, e.g., "It sounds like you had a wonderful day!", "What a lovely memory to look back on!"]

5. HONESTY: If the retrieved memories do not contain the answer, kindly and clearly state that in the "Summary" section (e.g. "I couldn't find any stored memories about that, but we can make new ones anytime!"), and omit the "Memory Details" and "Reflection" sections.
6. SAFETY AND BOUNDARIES: Maintain a safe, harmless, and ethical tone.

User Query:
{query}

Context Database:
{memory_context}

Construct a comforting, perfectly structured response.
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

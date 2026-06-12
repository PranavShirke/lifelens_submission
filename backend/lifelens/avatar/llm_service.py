import os
from groq import Groq
from lifelens.avatar.config import settings

class LLMService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
        print(f"DEBUG LLM: API Key Loaded? {bool(self.api_key)}")
        if self.api_key:
             print(f"DEBUG LLM: Key starts with {self.api_key[:4]}...")
        
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
                print("DEBUG LLM: Groq Client Initialized")
            except Exception as e:
                print(f"DEBUG LLM: Failed to init Groq: {e}")
        
    def generate_response(self, user_text: str, context: dict = None) -> str:
        """
        Generates a conversational response using Groq (Llama3).
        """
        if not self.client:
            print("DEBUG LLM: No Client, using Fallback")
            return self._fallback_response(context)
            
        try:
            print("DEBUG LLM: Sending request to Groq...")
            # Construct System Prompt
            system_prompt = (
                "You are an empathetic memory assistant and warm conversational companion for an elderly person with dementia. "
                "Your goal is to be exceptionally kind, reassuring, and helpful. "
                "Always reduce cognitive load for the user. Use clear visual layouts. "
                "\n"
                "CRITICAL INSTRUCTIONS FOR GREETINGS AND GENERAL DAY-TO-DAY QUESTIONS:\n"
                "- If the user's query is a normal day-to-day question, greeting, or everyday chat (e.g., 'how to make noodles', 'making soup', cooking, general hobbies, how are you, weather, friendly talk), act as a helpful and warm personal chatbot companion. "
                "- Give direct, simple, and comforting answers. Avoid complex vocabulary.\n"
                "\n"
                "FORMATTING RULES:\n"
                "You MUST format your output strictly in these three sections, using these exact headings (including the emojis) separated by blank lines:\n"
                "\n"
                "### 🌟 Summary\n"
                "[A very friendly, comforting, simple 1-2 sentence direct answer. If a recipe or task, state that you'd love to help them with it.]\n"
                "\n"
                "### 🔍 Memory Details\n"
                "[Use standard bullet points with these exact keys if information is available in the memory context OR if you are outlining simple step-by-step instructions for a task/recipe]:\n"
                "* 📅 **When:** [When it happened OR 'Anytime you are hungry!' or similar]\n"
                "* 📍 **Where:** [Where it happened OR 'In your cozy kitchen' or similar]\n"
                "* 👥 **Who:** [Who was there OR 'By yourself' or similar]\n"
                "* 💡 **What happened:** [1-3 very simple, short sentences outlining the activity, findings, or step-by-step instructions]\n"
                "\n"
                "### 💭 Reflection\n"
                "[A warm, comforting, and encouraging closing sentence to support the patient, e.g., 'I hope you enjoy your warm noodles!', 'What a lovely day to think about!']\n"
                "\n"
                "If the query is a friendly greeting or simple response where 'Memory Details' is completely irrelevant, you may omit the 'Memory Details' section but you must still output the 'Summary' and 'Reflection' sections.\n"
                "\n"
                "Do NOT mention 'database' or 'records'. Speak naturally."
            )
            
            # Construct Context String
            context_str = "No specific memory found."
            if context:
                name = context.get("name", "Unknown")
                relation = context.get("relation", "Unspecified")
                notes = context.get("notes", "")
                location = context.get("location", "")
                has_audio = context.get("has_audio", False)
                has_image = context.get("has_image", False)
                context_str = f"Memory: Name={name}, Relation={relation}, Notes={notes}, Location={location}, Has Audio={has_audio}, Has Image={has_image}"
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context: {context_str}\n\nUser: {user_text}"}
            ]
            
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.1-8b-instant",
                temperature=0.7,
                max_tokens=250,
            )
            
            return chat_completion.choices[0].message.content
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return self._fallback_response(context)

    def _fallback_response(self, context: dict) -> str:
        """Rule-based responses when LLM is offline."""
        if not context:
            return "I am listening."
            
        name = context.get("name", "them")
        return f"That is {name}. {context.get('notes', '')}"

llm_service = LLMService()

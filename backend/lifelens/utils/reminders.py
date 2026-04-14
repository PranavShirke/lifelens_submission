from groq import Groq
from lifelens.config import GROQ_API_KEY
import json
import os
import uuid
from datetime import datetime

REMINDERS_FILE = "reminders.json"

def load_reminders():
    if os.path.exists(REMINDERS_FILE):
        try:
            with open(REMINDERS_FILE, "r") as f:
                data = json.load(f)
                # Migration: if old format (list of {task, time}), convert
                if data and isinstance(data, list) and data[0] and "id" not in data[0]:
                    migrated = []
                    for item in data:
                        migrated.append({
                            "id": f"rem-{uuid.uuid4().hex[:8]}",
                            "patient_id": "patient_1",
                            "task": item.get("task", ""),
                            "time": item.get("time", ""),
                            "completed": False,
                            "created_at": datetime.now().isoformat()
                        })
                    save_reminders(migrated)
                    return migrated
                return data
        except:
            return []
    return []

def save_reminders(reminders):
    with open(REMINDERS_FILE, "w") as f:
        json.dump(reminders, f, indent=2)

def get_reminders_for_patient(patient_id, include_completed=False):
    """Get reminders for a specific patient."""
    reminders = load_reminders()
    filtered = [r for r in reminders if r.get("patient_id") == patient_id]
    if not include_completed:
        filtered = [r for r in filtered if not r.get("completed", False)]
    return filtered

def add_reminder(patient_id, task, time_str):
    """Add a new reminder for a patient."""
    reminders = load_reminders()
    new_reminder = {
        "id": f"rem-{uuid.uuid4().hex[:8]}",
        "patient_id": patient_id,
        "task": task,
        "time": time_str,
        "completed": False,
        "created_at": datetime.now().isoformat()
    }
    reminders.append(new_reminder)
    save_reminders(reminders)
    return new_reminder

def complete_reminder(reminder_id):
    """Mark a reminder as completed."""
    reminders = load_reminders()
    for r in reminders:
        if r.get("id") == reminder_id:
            r["completed"] = True
            r["completed_at"] = datetime.now().isoformat()
            save_reminders(reminders)
            return True
    return False

def delete_reminder(reminder_id):
    """Delete a reminder."""
    reminders = load_reminders()
    new_list = [r for r in reminders if r.get("id") != reminder_id]
    if len(new_list) == len(reminders):
        return False
    save_reminders(new_list)
    return True

def save_reminder(reminder):
    """Legacy function: appends a raw reminder dict."""
    reminders = load_reminders()
    reminders.append(reminder)
    save_reminders(reminders)

def extract_reminder(text):
    """
    Uses LLM to check if the text contains a future task.
    Returns dict or None.
    """
    if not GROQ_API_KEY:
        return None
        
    client = Groq(api_key=GROQ_API_KEY)
    
    prompt = f"""
    Analyze the following text. Does it contain a future task, appointment, or reminder?
    If yes, return a JSON object with keys "task" (short description) and "time" (when it is due).
    If no, return {{ "is_reminder": false }}.
    
    Text: "{text}"
    
    Return ONLY VALID JSON.
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts reminders to JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(completion.choices[0].message.content)
        
        if result.get("is_reminder") is False:
            return None
            
        # Check if task key exists (sometimes LLM structure varies slightly despite instructions)
        if "task" in result:
            return result
            
        return None
        
    except Exception as e:
        print(f"Reminder Extraction Error: {e}")
        return None

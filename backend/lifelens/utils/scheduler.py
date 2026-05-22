import asyncio
import logging
from datetime import datetime
from lifelens.utils.reminders import load_reminders, save_reminders
from lifelens.utils.ntfy_notifications import send_nagging_notification

logger = logging.getLogger(__name__)

# Nag every 10 minutes (600 seconds)
NAGGING_INTERVAL = 600

async def nagging_loop():
    """
    Background loop that nags for incomplete general reminders every 10 minutes.
    This replaces the need for a separate medication_scheduler_service script.
    """
    logger.info("🚀 LifeLens Nagging Scheduler Started")
    
    while True:
        try:
            # Load current reminders
            reminders = load_reminders()
            now = datetime.now()
            updated = False
            
            for r in reminders:
                # Only nag for incomplete reminders
                if not r.get("completed", False):
                    # Use last_notified_at or fallback to creation time
                    last_notified_str = r.get("last_notified_at") or r.get("created_at")
                    if not last_notified_str:
                        continue
                        
                    try:
                        last_notified = datetime.fromisoformat(last_notified_str)
                    except ValueError:
                        # Fallback if parsing fails
                        last_notified = now
                        
                    if (now - last_notified).total_seconds() >= NAGGING_INTERVAL:
                        patient_id = r.get("patient_id", "patient_1")
                        
                        logger.info(f"Nagging for reminder: {r['task']}")
                        success = send_nagging_notification(
                            title=r['task'],
                            message=f"You have an active task: {r['task']}",
                            patient_id=patient_id
                        )
                        
                        if success:
                            # Update timestamp so we don't nag again for another 10 mins
                            r["last_notified_at"] = now.isoformat()
                            updated = True
            
            # Save if any timestamps were updated
            if updated:
                save_reminders(reminders)
                
        except Exception as e:
            logger.error(f"Error in reminder nagging loop: {e}", exc_info=True)
            
        # Check every 60 seconds (conservative tick)
        await asyncio.sleep(60)

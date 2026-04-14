"""
Background Medication Scheduler

Continuously monitors for upcoming medication doses and sends reminders.
Runs as a background service.
"""

import logging
import time
import sys
import os
from datetime import datetime
from typing import List

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from lifelens.qdrant.client import get_qdrant_client
from lifelens.auth.users import get_all_patients
from lifelens.agents.medication_scheduler import get_upcoming_doses, check_missed_doses
from lifelens.agents.medication_reminder import send_medication_reminder, send_missed_dose_alert
from lifelens.agents.medication_adherence import run_nightly_analysis
from lifelens.agents.medication_critic import evaluate_and_alert
from lifelens.utils.ntfy_notifications import send_nagging_notification
from lifelens.utils.reminders import load_reminders, save_reminders
from qdrant_client.http import models
from lifelens.config import NTFY_TOPIC_URL

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Configuration
REMINDER_CHECK_INTERVAL = 60  # Check every 1 minute
MISSED_DOSE_CHECK_INTERVAL = 300  # Check every 5 minutes
NAGGING_INTERVAL = 600  # Nag every 10 minutes
NIGHTLY_ANALYSIS_HOUR = 23  # Run at 11 PM
LAST_NIGHTLY_RUN_DATE = None


def get_all_patient_ids(client) -> List[str]:
    """
    Gets list of all patient IDs in the system.
    """
    try:
        # Get all active medications and extract unique patient IDs
        results = client.scroll(
            collection_name="medications",
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="active",
                        match=models.MatchValue(value=True)
                    )
                ]
            ),
            limit=1000
        )[0]
        
        patient_ids = list(set([point.payload.get("patient_id") for point in results if point.payload.get("patient_id")]))
        logger.info(f"Found {len(patient_ids)} patients with active medications: {patient_ids}")
        return patient_ids
    except Exception as e:
        logger.error(f"Error getting patient IDs: {e}")
        return []


def check_and_send_reminders(client):
    """
    Checks for upcoming medication doses and sends reminders.
    """
    try:
        patient_ids = get_all_patient_ids(client)
        
        if not patient_ids:
            logger.debug("No patients with active medications found")
            return
        
        total_reminders_sent = 0
        
        for patient_id in patient_ids:
            # Get upcoming doses (within next 10 minutes)
            upcoming = get_upcoming_doses(client, patient_id, look_ahead_minutes=10)
            
            if upcoming:
                logger.info(f"Found {len(upcoming)} upcoming doses for patient {patient_id}")
            
            # Send reminders for each upcoming dose
            for dose in upcoming:
                logger.info(f"Attempting to send reminder: {dose['medication_name']} at {dose['scheduled_time']} for {patient_id}")
                success = send_medication_reminder(client, dose)
                if success:
                    total_reminders_sent += 1
                    logger.info(f"✅ Sent reminder for {dose['medication_name']} to {patient_id}")
                else:
                    logger.error(f"❌ Failed to send reminder for {dose['medication_name']} to {patient_id}")
        
        if total_reminders_sent > 0:
            logger.info(f"📊 Total reminders sent: {total_reminders_sent}")
            
    except Exception as e:
        logger.error(f"Error in reminder check: {e}", exc_info=True)


def check_for_missed_doses(client):
    """
    Checks for missed doses and sends alerts to caretakers.
    """
    try:
        patient_ids = get_all_patient_ids(client)
        
        for patient_id in patient_ids:
            missed = check_missed_doses(client, patient_id)
            
            if len(missed) >= 2:  # Alert after 2 consecutive misses
                logger.warning(f"Patient {patient_id} has {len(missed)} missed doses")
                send_missed_dose_alert(client, patient_id, missed)
                
    except Exception as e:
        logger.error(f"Error checking missed doses: {e}")


def check_and_nag_reminders():
    """Nag for incomplete general reminders every 10 minutes."""
    try:
        reminders = load_reminders()
        now = datetime.now()
        updated = False
        
        for r in reminders:
            if not r.get("completed", False):
                last_notified = datetime.fromisoformat(r.get("last_notified_at", r["created_at"]))
                if (now - last_notified).total_seconds() >= NAGGING_INTERVAL:
                    patient_id = r.get("patient_id", "patient_1")
                    topic = NTFY_TOPIC_URL if "lifelens-caregiver-alerts" not in NTFY_TOPIC_URL else \
                            NTFY_TOPIC_URL.replace("lifelens-caregiver-alerts", f"lifelens-med-{patient_id}")
                    
                    logger.info(f"Nagging for reminder: {r['task']}")
                    send_nagging_notification(
                        title=f"Reminder: {r['task']}",
                        message=f"You have an active task: {r['task']}",
                        topic_url=topic
                    )
                    r["last_notified_at"] = now.isoformat()
                    updated = True
        
        if updated:
            save_reminders(reminders)
            
    except Exception as e:
        logger.error(f"Error in reminder nagging: {e}")


def check_and_nag_medications(client):
    """Nag for overdue medications every 10 minutes."""
    try:
        patient_ids = get_all_patient_ids(client)
        now = datetime.now()
        
        for patient_id in patient_ids:
            from lifelens.agents.medication_scheduler import get_todays_medications
            todays_meds = get_todays_medications(client, patient_id)
            
            for dose in todays_meds:
                if dose["is_overdue"] and dose["status"] == "pending":
                    # Check the last notification log in Qdrant
                    results = client.scroll(
                        collection_name="lifelens_memory",
                        scroll_filter=models.Filter(
                            must=[
                                models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id)),
                                models.FieldCondition(key="type", match=models.MatchValue(value="medication_reminder_sent")),
                                models.FieldCondition(key="medication_id", match=models.MatchValue(value=dose["medication_id"])),
                                models.FieldCondition(key="dose_time", match=models.MatchValue(value=dose["scheduled_time"]))
                            ]
                        ),
                        limit=1,
                        order_by=models.OrderBy(field="timestamp", direction=models.Direction.DESC)
                    )[0]
                    
                    if results:
                        last_log = results[0].payload
                        last_notified_ts = last_log.get("timestamp")
                        if (now.timestamp() - last_notified_ts) >= NAGGING_INTERVAL:
                            topic = NTFY_TOPIC_URL if "lifelens-caregiver-alerts" not in NTFY_TOPIC_URL else \
                                    NTFY_TOPIC_URL.replace("lifelens-caregiver-alerts", f"lifelens-med-{patient_id}")
                            
                            logger.info(f"Nagging for medication: {dose['medication_name']}")
                            send_nagging_notification(
                                title=f"Medication: {dose['medication_name']}",
                                message=f"It's time to take your {dose['medication_name']} ({dose['dosage']}).",
                                topic_url=topic
                            )
                            # Log the new notification so we don't nag again for 10 mins
                            from lifelens.agents.medication_reminder import _log_reminder
                            _log_reminder(client, {
                                "patient_id": patient_id,
                                "medication_id": dose["medication_id"],
                                "medication_name": dose["medication_name"],
                                "scheduled_time": dose["scheduled_time"]
                            })
                            
    except Exception as e:
        logger.error(f"Error in medication nagging: {e}")


def run_nightly_analytics(client):
    """
    Runs nightly adherence analysis for all patients.
    """
    global LAST_NIGHTLY_RUN_DATE
    
    try:
        current_date = datetime.now().date()
        current_hour = datetime.now().hour
        
        # Run at specified hour and only once per day
        if current_hour >= NIGHTLY_ANALYSIS_HOUR and LAST_NIGHTLY_RUN_DATE != current_date:
            logger.info("Running nightly adherence analysis...")
            
            patient_ids = get_all_patient_ids(client)
            results = run_nightly_analysis(client, patient_ids)
            
            logger.info(f"Nightly analysis complete: {results}")
            
            # Run critic evaluation for each patient
            for patient_id in patient_ids:
                from lifelens.agents.medication_adherence import analyze_adherence
                
                try:
                    adherence = analyze_adherence(client, patient_id, days_lookback=7)
                    decision = evaluate_and_alert(client, patient_id, adherence)
                    
                    if decision:
                        logger.info(f"Critic decision for {patient_id}: {decision['verdict']}")
                        
                except Exception as e:
                    logger.error(f"Error in critic evaluation for {patient_id}: {e}")
            
            LAST_NIGHTLY_RUN_DATE = current_date
            
    except Exception as e:
        logger.error(f"Error in nightly analytics: {e}")


def main():
    """
    Main scheduler loop.
    """
    logger.info("Starting Medication Scheduler Service...")
    
    try:
        client = get_qdrant_client()
        logger.info("Connected to Qdrant")
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")
        return
    
    # Initialize collections
    from lifelens.qdrant.schema import create_medication_collections_if_not_exist
    try:
        create_medication_collections_if_not_exist(client)
        logger.info("Medication collections initialized")
    except Exception as e:
        logger.error(f"Failed to initialize collections: {e}")
    
    reminder_counter = 0
    missed_dose_counter = 0
    nagging_counter = 0  # Separate counter for nagging checks
    
    logger.info("Scheduler service running. Press Ctrl+C to stop.")
    
    try:
        while True:
            current_time = datetime.now()
            logger.debug(f"Scheduler tick at {current_time}")
            
            # Check for upcoming reminders every minute
            if reminder_counter >= REMINDER_CHECK_INTERVAL:
                logger.info("Checking for upcoming medication reminders...")
                check_and_send_reminders(client)
                reminder_counter = 0
            
            # Check for missed doses every 5 minutes
            if missed_dose_counter >= MISSED_DOSE_CHECK_INTERVAL:
                logger.info("Checking for missed doses...")
                check_for_missed_doses(client)
                missed_dose_counter = 0
            
            # Run nagging checks every 60 seconds (separate counter)
            if nagging_counter >= 60:
                logger.info("Running nagging checks for reminders and medications...")
                check_and_nag_reminders()
                check_and_nag_medications(client)
                nagging_counter = 0
            
            # Run nightly analytics
            run_nightly_analytics(client)
            
            # Sleep for 1 second
            time.sleep(1)
            reminder_counter += 1
            missed_dose_counter += 1
            nagging_counter += 1
            
    except KeyboardInterrupt:
        logger.info("Scheduler service stopped by user")
    except Exception as e:
        logger.error(f"Scheduler service error: {e}")
        raise


if __name__ == "__main__":
    main()


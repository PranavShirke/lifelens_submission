from qdrant_client import QdrantClient
from qdrant_client.http import models
from lifelens.config import QDRANT_COLLECTION_NAME, EXCLUDED_MEMORY_TYPES
from datetime import datetime, timedelta
from collections import Counter
import pandas as pd

def get_memory_stats(client, patient_id: str):
    """Get comprehensive memory statistics for a patient."""
    
    # Fetch all memories for patient, excluding system/medication types
    results = client.scroll(
        collection_name=QDRANT_COLLECTION_NAME,
        limit=1000,
        with_payload=models.PayloadSelectorExclude(
            exclude=["image_base64", "source_image_base64", "audio_base64", "source_audio_base64", "base64", "content_embedding"]
        ),
        with_vectors=False,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="patient_id",
                    match=models.MatchValue(value=patient_id)
                )
            ],
            must_not=[
                models.FieldCondition(
                    key="type",
                    match=models.MatchValue(value=t)
                )
                for t in EXCLUDED_MEMORY_TYPES
            ]
        )
    )[0]
    
    if not results:
        return {
            "total_count": 0,
            "type_counts": {},
            "mood_distribution": {},
            "daily_counts": {},
            "streak": 0,
            "recent_count": 0,
            "memories": []
        }
    
    # Extract data
    memories = [point.payload for point in results]
    
    # Total counts
    total_count = len(memories)
    type_counts = Counter([m.get("type") for m in memories])
    
    # Mood distribution
    sentiments = [m.get("sentiment") for m in memories if m.get("sentiment")]
    mood_distribution = Counter(sentiments)
    
    # Activity by day
    timestamps = [m.get("timestamp", 0) for m in memories]
    dates = [datetime.fromtimestamp(ts).date() for ts in timestamps]
    daily_counts = Counter(dates)
    
    # Memory streak (consecutive days with uploads)
    sorted_dates = sorted(set(dates), reverse=True)
    streak = 0
    if sorted_dates:
        current_date = datetime.now().date()
        # Allow starting from today or yesterday
        check_date = current_date
        if sorted_dates[0] < current_date:
            check_date = sorted_dates[0]
            # Only count if the most recent memory is from today or yesterday
            if (current_date - check_date).days > 1:
                check_date = None
        if check_date is not None:
            for date in sorted_dates:
                if date == check_date:
                    streak += 1
                    check_date = check_date - timedelta(days=1)
                elif date < check_date:
                    break
    
    # Recent activity (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    recent_count = sum(1 for ts in timestamps if datetime.fromtimestamp(ts) > week_ago)
    
    return {
        "total_count": total_count,
        "type_counts": dict(type_counts),
        "mood_distribution": dict(mood_distribution),
        "daily_counts": daily_counts,
        "streak": streak,
        "recent_count": recent_count,
        "memories": memories
    }

def get_activity_dataframe(daily_counts):
    """Convert daily counts to DataFrame for charting."""
    if not daily_counts:
        return pd.DataFrame()
    
    df = pd.DataFrame([
        {"Date": date, "Count": count}
        for date, count in daily_counts.items()
    ])
    df = df.sort_values("Date")
    return df

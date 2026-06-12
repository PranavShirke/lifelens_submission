import os
from pathlib import Path
from deepface import DeepFace

db_path = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces"

# Grab one of Pranav's images as the query
img_path = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Pranav_Shirke/Pranav_Shirke_21948c7a-46da-459e-b539-db8ff87b45d4.jpg"

try:
    results = DeepFace.find(
        img_path=img_path,
        db_path=db_path,
        model_name="Facenet512",
        detector_backend="opencv",
        enforce_detection=False,
        silent=True,
    )
    for i, df in enumerate(results):
        print(f"Face {i}:")
        if df.empty:
            print("  Empty dataframe")
            continue
        print(df[["identity", "distance"]])
except Exception as e:
    print("Error:", e)

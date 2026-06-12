import pickle
import pandas as pd
from deepface import DeepFace

pkl_path = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/ds_model_facenet512_detector_opencv_aligned_normalization_base_expand_0.pkl"
try:
    with open(pkl_path, 'rb') as f:
        data = pickle.load(f)
    print(f"Total representations: {len(data)}")
    for row in data:
        # Check if it's a list or dict
        if isinstance(row, dict):
            print(" -", row.get('identity') or row.get('hash') or list(row.keys()))
        else:
            print(" -", row[0])
except Exception as e:
    print("PKL Error:", e)

print("\nRunning DeepFace.find for Yash...")
yash_img = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Yash/img_71491454.jpg"
try:
    results = DeepFace.find(
        img_path=yash_img,
        db_path="c:/Users/Pranav/Desktop/lifelens/backend/known_faces",
        model_name="Facenet512",
        detector_backend="opencv",
        enforce_detection=False,
        silent=False
    )
    for i, df in enumerate(results):
        print(f"Face {i} matches:")
        print(df.to_string())
except Exception as e:
    print("Find Error:", e)

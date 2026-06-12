import pickle
from deepface import DeepFace
from deepface.modules import representation
import numpy as np

def cosine_distance(source_rep, test_rep):
    a = np.matmul(np.transpose(source_rep), test_rep)
    b = np.sum(np.multiply(source_rep, source_rep))
    c = np.sum(np.multiply(test_rep, test_rep))
    return 1 - (a / (np.sqrt(b) * np.sqrt(c)))

yash_img = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Yash/img_71491454.jpg"

try:
    print("Representing query image...")
    query_reps = DeepFace.represent(
        img_path=yash_img,
        model_name="Facenet512",
        detector_backend="opencv",
        enforce_detection=False
    )
    query_emb = query_reps[0]["embedding"]
    
    pkl_path = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/ds_model_facenet512_detector_opencv_aligned_normalization_base_expand_0.pkl"
    with open(pkl_path, 'rb') as f:
        data = pickle.load(f)
        
    print("\nDistances from query to PKL elements:")
    for row in data:
        identity = row.get('identity') or row.get('hash')
        db_emb = row['embedding']
        dist = cosine_distance(query_emb, db_emb)
        print(f"{identity} -> {dist:.4f}")

except Exception as e:
    print("Error:", e)

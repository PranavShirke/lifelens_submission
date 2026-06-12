import os
from deepface import DeepFace

pranav_img = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Pranav_Shirke/Pranav_Shirke_21948c7a-46da-459e-b539-db8ff87b45d4.jpg"
pragati_img = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Pragati_Shirke/img_e0a2dc77.jpg"

try:
    result = DeepFace.verify(
        img1_path=pranav_img,
        img2_path=pragati_img,
        model_name="Facenet512",
        detector_backend="opencv",
        enforce_detection=False
    )
    print("Verification result:", result)
except Exception as e:
    print("Error:", e)

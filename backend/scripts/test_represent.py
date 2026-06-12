from deepface import DeepFace

yash_img = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Yash/img_71491454.jpg"

try:
    res = DeepFace.represent(
        img_path=yash_img,
        model_name="Facenet512",
        detector_backend="opencv",
        enforce_detection=True
    )
    print("Represented successfully. Faces:", len(res))
except Exception as e:
    print("Error:", e)

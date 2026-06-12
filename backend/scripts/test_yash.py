from deepface import DeepFace

yash_img = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/Yash/img_71491454.jpg"

try:
    res = DeepFace.verify(
        img1_path=yash_img,
        img2_path=yash_img,
        model_name="Facenet512",
        detector_backend="opencv",
        enforce_detection=False
    )
    print("Verify Yash vs Yash:", res)
except Exception as e:
    print(e)

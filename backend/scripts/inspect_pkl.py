import pickle

pkl_path = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces/ds_model_facenet512_detector_opencv_aligned_normalization_base_expand_0.pkl"
try:
    with open(pkl_path, 'rb') as f:
        data = pickle.load(f)
    print(f"Total representations in cache: {len(data)}")
    
    identities = set()
    for row in data:
        # data is a list of lists: [identity, embedding, x, y, w, h]
        identities.add(row[0])
    
    for identity in identities:
        print(f" - {identity}")
except Exception as e:
    print("Error:", e)

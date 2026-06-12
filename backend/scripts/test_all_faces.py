import os
import glob
from pathlib import Path
from deepface import DeepFace

db_path = "c:/Users/Pranav/Desktop/lifelens/backend/known_faces"

# Find one image from each folder
for person_dir in os.listdir(db_path):
    person_path = os.path.join(db_path, person_dir)
    if not os.path.isdir(person_path): continue
    
    images = glob.glob(os.path.join(person_path, "*.jpg"))
    if not images:
        print(f"No images for {person_dir}")
        continue
        
    query_img = images[0]
    print(f"\nTesting {person_dir} using {os.path.basename(query_img)}")
    
    try:
        results = DeepFace.find(
            img_path=query_img,
            db_path=db_path,
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,
            silent=True,
        )
        for i, df in enumerate(results):
            if df.empty:
                print(f"  Face {i}: No matches found")
            else:
                top = df.iloc[0]
                ident = Path(top['identity']).parent.name
                dist = top.get('distance')
                print(f"  Face {i}: Matched {ident} with distance {dist:.4f}")
    except Exception as e:
        print(f"Error testing {person_dir}: {e}")

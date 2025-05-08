import cv2
import os
import numpy as np
from PIL import Image
import pickle

# Initialize recognizer
recognizer = cv2.face.LBPHFaceRecognizer_create()

# Path to dataset folder
dataset_path = "dataset"

# Store images and corresponding labels
faces = []
ids = []
label_ids = {}
current_id = 0

# Scan through dataset folder
for person_name in os.listdir(dataset_path):
    person_path = os.path.join(dataset_path, person_name)

    if os.path.isdir(person_path):
        print(f"[INFO] Processing images for: {person_name}")

        # Assign a new ID only if not already assigned
        if person_name not in label_ids:
            label_ids[person_name] = current_id
            current_id += 1

        id_ = label_ids[person_name]

        for image_file in os.listdir(person_path):
            if image_file.lower().endswith((".png", ".jpg", ".jpeg")):
                try:
                    img_path = os.path.join(person_path, image_file)
                    pil_img = Image.open(img_path).convert("L")  # Grayscale
                    img_numpy = np.array(pil_img, "uint8")
                    faces.append(img_numpy)
                    ids.append(id_)
                except Exception as e:
                    print(f"[ERROR] Failed to process {image_file}: {e}")

# Check if training data exists
print(f"[INFO] Found {len(faces)} faces and {len(ids)} IDs")
if len(faces) == 0 or len(ids) == 0:
    print("[ERROR] No valid face data found! Training aborted.")
    exit()

# Train the recognizer
recognizer.train(faces, np.array(ids))
recognizer.save("trainer.yml")
print("[INFO] Model trained and saved as 'trainer.yml'")

# Save label mappings (ID to Name)
with open("labels.pickle", "wb") as f:
    pickle.dump({v: k for k, v in label_ids.items()}, f)

print("[INFO] Labels saved to 'labels.pickle':")
print({v: k for k, v in label_ids.items()})

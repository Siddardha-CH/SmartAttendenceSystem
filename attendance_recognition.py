import cv2
import numpy as np
import os
import csv
import pickle
from datetime import datetime
import time

# Load trained model
recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read('trainer.yml')

# Load label mappings
with open("labels.pickle", "rb") as f:
    labels = pickle.load(f)

# Flip labels dictionary for reverse lookup
labels = {v: k for k, v in labels.items()}
print("Loaded labels:", labels)

# Initialize webcam
cap = cv2.VideoCapture(1)

if not cap.isOpened():
    print("Error: Could not open webcam")
    exit()

# Attendance file
attendance_file = "attendance.csv"

# Face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Load accepted images for display
def load_accepted_faces():
    accepted_faces = {}
    dataset_path = "dataset"
    for person_name in os.listdir(dataset_path):
        person_dir = os.path.join(dataset_path, person_name)
        if os.path.isdir(person_dir):
            for img_name in os.listdir(person_dir):
                if img_name.endswith((".jpg", ".png")):
                    img_path = os.path.join(person_dir, img_name)
                    img = cv2.imread(img_path)
                    if img is not None:
                        img = cv2.resize(img, (80, 80))
                        accepted_faces[person_name] = img
                        break  # Just take the first image
    return accepted_faces

accepted_faces = load_accepted_faces()

# Attendance logger
def mark_attendance(name):
    if not os.path.exists(attendance_file):
        with open(attendance_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["Name", "Time"])
    with open(attendance_file, 'a', newline='') as f:
        writer = csv.writer(f)
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        writer.writerow([name, current_time])

# Timer for 5-second scanning
last_scan_time = 0
identified_name = None
show_face = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("Error: Failed to capture frame")
        continue

    current_time = time.time()
    if current_time - last_scan_time >= 5:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)

        identified_name = None
        show_face = None

        for (x, y, w, h) in faces:
            roi_gray = gray[y:y + h, x:x + w]
            id_, confidence = recognizer.predict(roi_gray)
            print(f"Confidence: {confidence}")

            if confidence < 60:
                for name, label in labels.items():
                    if label == id_:
                        identified_name = name
                        show_face = accepted_faces.get(name, None)
                        mark_attendance(name)
                        break
            else:
                identified_name = "Unidentified"
                show_face = None

        last_scan_time = current_time

    # Overlay results on the frame
    if identified_name:
        if identified_name == "Unidentified":
            cv2.putText(frame, "Unidentified", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
        else:
            cv2.putText(frame, f"{identified_name} - Accepted", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
            if show_face is not None:
                frame[20:100, frame.shape[1] - 100:frame.shape[1] - 20] = show_face

    cv2.imshow("Smart Attendance", frame)

    key = cv2.waitKey(1)
    if key & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
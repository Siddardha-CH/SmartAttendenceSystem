import cv2
import os

# Try both camera indexes
cap = cv2.VideoCapture(1)
if not cap.isOpened():
    cap = cv2.VideoCapture(1)
if not cap.isOpened():
    print("[ERROR] Could not open any webcam")
    exit()

# Ask for user name in console
try:
    user_name = input("Enter your name: ").strip()
except Exception as e:
    print("[ERROR] Unable to get user input:", e)
    cap.release()
    exit()

# Validate name
if not user_name:
    print("[ERROR] Name cannot be empty.")
    cap.release()
    exit()

folder_path = f"dataset/{user_name}"
os.makedirs(folder_path, exist_ok=True)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

count = 0
max_images = 30

while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Failed to capture frame")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    for (x, y, w, h) in faces:
        face_img = gray[y:y+h, x:x+w]
        count += 1
        img_path = f"{folder_path}/{count}.jpg"
        cv2.imwrite(img_path, face_img)
        print(f"[INFO] Saved: {img_path}")

        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, f"Image {count}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    cv2.imshow("Face Registration", frame)

    if cv2.waitKey(1) & 0xFF == ord('q') or count >= max_images:
        break

cap.release()
cv2.destroyAllWindows()
print(f"[INFO] Collected {count} face images in: {folder_path}")

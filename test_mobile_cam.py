import cv2

# DroidCam usually becomes the default webcam (device 0 or 1)
cap = cv2.VideoCapture(1)  # Try 0 first; if it doesn't work, try 1

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to capture frame")
        break

    cv2.imshow("DroidCam Feed", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

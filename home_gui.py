import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import sys
import os

class AttendanceApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Smart Attendance System")
        self.geometry("600x400")
        self.resizable(False, False)

        # Use a modern theme
        self.style = ttk.Style()
        self.style.theme_use("clam")  # "clam", "alt", "classic", "default"

        self._create_widgets()

    def _create_widgets(self):
        # Main container frame
        main_frame = ttk.Frame(self, padding=20)
        main_frame.pack(fill="both", expand=True)

        # Title label
        title_label = ttk.Label(main_frame, text="Smart Attendance System", font=("Arial", 24, "bold"))
        title_label.pack(pady=30, anchor="center")

        # Button container
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(pady=10, anchor="center")

        # Configure grid layout for buttons
        button_frame.columnconfigure(0, weight=1)
        button_frame.columnconfigure(1, weight=1)

        # Define button style
        self.style.configure("MyButton.TButton", padding=10, font=("Arial", 12))

        # Buttons
        self.capture_button = ttk.Button(button_frame, text="Capture Face Data", command=self.capture_faces, style="MyButton.TButton")
        self.train_button = ttk.Button(button_frame, text="Train Model", command=self.train_model, style="MyButton.TButton")
        self.mark_button = ttk.Button(button_frame, text="Mark Attendance", command=self.mark_attendance, style="MyButton.TButton")
        self.report_button = ttk.Button(button_frame, text="Generate Report", command=self.generate_report, style="MyButton.TButton")
        self.exit_button = ttk.Button(button_frame, text="Exit", command=self.exit_app, style="MyButton.TButton")

        # Grid layout for buttons
        self.capture_button.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.train_button.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        self.mark_button.grid(row=1, column=0, padx=10, pady=10, sticky="ew")
        self.report_button.grid(row=1, column=1, padx=10, pady=10, sticky="ew")
        self.exit_button.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="ew")

        # Status bar
        self.status_label = ttk.Label(main_frame, text="Ready", anchor="center", font=("Arial", 10))
        self.status_label.pack(side="bottom", fill="x", pady=5)

    def _run_script(self, script_name):
        """Helper function to execute external Python scripts."""
        try:
            script_path = os.path.join(os.getcwd(), script_name)
            self._update_status(f"Running {script_name}...")
            subprocess.run([sys.executable, script_path], check=True, capture_output=True)
            self._update_status(f"{script_name} executed successfully.", "success")
        except subprocess.CalledProcessError as e:
            error_message = f"Error running {script_name}:\n{e.stderr.decode()}"
            messagebox.showerror("Error", error_message)
            self._update_status(f"Error: {script_name}", "error")
        except Exception as e:
            error_message = f"Failed to run {script_name}:\n{e}"
            messagebox.showerror("Error", error_message)
            self._update_status(f"Error: {script_name}", "error")

    def _update_status(self, text, status_type="info"):
        """Updates the status label with text and color."""
        self.status_label.config(text=text)
        if status_type == "success":
            self.status_label.config(foreground="green")
        elif status_type == "error":
            self.status_label.config(foreground="red")
        else:
            self.status_label.config(foreground="black")

    def capture_faces(self):
        self._run_script("face_capture.py")

    def train_model(self):
        self._run_script("train_model.py")

    def mark_attendance(self):
        self._run_script("attendance_recognition.py")

    def generate_report(self):
        self._run_script("generate_pdf_report.py")

    def exit_app(self):
        if messagebox.askokcancel("Quit", "Are you sure you want to exit?"):
            self.destroy()

if __name__ == "__main__":
    app = AttendanceApp()
    app.mainloop()

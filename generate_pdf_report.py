import csv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from datetime import datetime

def generate_pdf(filename="attendance_report.pdf"):
    # Read the CSV file
    date_today = datetime.now().strftime("%Y-%m-%d")
    csv_file = f"attendance_{date_today}.csv"
    
    # Create PDF canvas
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title for the PDF
    c.setFont("Helvetica-Bold", 18)
    c.drawString(100, height - 40, f"Attendance Report - {date_today}")
    
    # Add a line
    c.setLineWidth(1)
    c.line(30, height - 50, width - 30, height - 50)

    # Read CSV and add rows to the PDF
    y_position = height - 80
    with open(csv_file, "r") as f:
        reader = csv.reader(f)
        c.setFont("Helvetica", 12)
        
        # Headers
        c.drawString(30, y_position, "Name")
        c.drawString(200, y_position, "Time")
        y_position -= 20
        
        # Rows
        for row in reader:
            c.drawString(30, y_position, row[0])
            c.drawString(200, y_position, row[1])
            y_position -= 20
            if y_position < 100:
                c.showPage()  # Start a new page if the content overflows
                c.setFont("Helvetica", 12)
                y_position = height - 40
                c.drawString(100, y_position, f"Attendance Report - {date_today}")
                c.line(30, height - 50, width - 30, height - 50)
                y_position -= 20

    # Save the PDF
    c.save()
    print(f"[INFO] PDF Report generated successfully: {filename}")

# Generate the PDF
generate_pdf()

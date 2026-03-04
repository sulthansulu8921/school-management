import os
import django
import random

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student

def seed_students():
    demo_students = [
        {"name": "Aarav Sharma", "class": "5", "div": "A", "bus": "1", "fees": 2500},
        {"name": "Aditi Verma", "class": "3", "div": "B", "bus": "2", "fees": 2200},
        {"name": "Ishan Patel", "class": "8", "div": "C", "bus": "1", "fees": 3000},
        {"name": "Ananya Iyer", "class": "2", "div": "A", "bus": "3", "fees": 2100},
        {"name": "Vihaan Gupta", "class": "10", "div": "B", "bus": "4", "fees": 3500},
        {"name": "Saanvi Reddy", "class": "4", "div": "C", "bus": "5", "fees": 2400},
        {"name": "Arjun Malhotra", "class": "6", "div": "A", "bus": "2", "fees": 2700},
        {"name": "Kavya Nair", "class": "1", "div": "B", "bus": "3", "fees": 2000},
        {"name": "Reyansh Das", "class": "9", "div": "A", "bus": "1", "fees": 3200},
        {"name": "Diya Kapoor", "class": "7", "div": "C", "bus": "4", "fees": 2800},
        {"name": "Aryan Singh", "class": "4", "div": "B", "bus": "2", "fees": 2400},
        {"name": "Meera Joshi", "class": "3", "div": "A", "bus": "5", "fees": 2200},
        {"name": "Zoya Khan", "class": "5", "div": "C", "bus": "1", "fees": 2500},
        {"name": "Devansh Bhatia", "class": "6", "div": "B", "bus": "3", "fees": 2700},
        {"name": "Prisha Mehta", "class": "2", "div": "A", "bus": "4", "fees": 2100},
    ]

    for i, s in enumerate(demo_students, 1):
        admission_no = f"2026{100 + i}"
        phone = f"9876543{100 + i}"
        
        student, created = Student.objects.get_or_create(
            admission_no=admission_no,
            defaults={
                "name": s["name"],
                "student_class": s["class"],
                "division": s["div"],
                "phone_number": phone,
                "bus_number": s["bus"],
                "bus_fee": s["fees"],
                "tuition_fee": random.choice([1500, 1800, 2000, 2500]),
                "status": "Active"
            }
        )
        if created:
            print(f"Created student: {s['name']} ({admission_no})")
        else:
            print(f"Student already exists: {s['name']} ({admission_no})")

if __name__ == "__main__":
    seed_students()

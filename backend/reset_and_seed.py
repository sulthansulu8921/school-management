import os
import django
import random
from datetime import date, timedelta
from django.utils import timezone

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student
from payments.models import (
    FeeCategory, CCAActivity, PaymentStatus, 
    StudentFeeMapping, Receipt, ReceiptItem,
    DailyCollection, MonthlyCollection
)

def reset_and_seed():
    print("Clearing all data...")
    ReceiptItem.objects.all().delete()
    Receipt.objects.all().delete()
    StudentFeeMapping.objects.all().delete()
    Student.objects.all().delete()
    FeeCategory.objects.all().delete()
    CCAActivity.objects.all().delete()
    PaymentStatus.objects.all().delete()
    DailyCollection.objects.all().delete()
    MonthlyCollection.objects.all().delete()

    print("Seeding Payment Statuses...")
    paid_status, _ = PaymentStatus.objects.get_or_create(name='Paid')
    unpaid_status, _ = PaymentStatus.objects.get_or_create(name='Unpaid')
    partial_status, _ = PaymentStatus.objects.get_or_create(name='Partial')

    print("Seeding Fee Categories...")
    fee_cats = {}
    for cat_name in ['Tuition', 'Bus', 'CCA', 'Lab', 'Library', 'Sports']:
        cat, _ = FeeCategory.objects.get_or_create(name=cat_name)
        fee_cats[cat_name] = cat

    print("Seeding CCA Activities...")
    cca_list = []
    for cca_name in ['Music', 'Dance', 'Karate', 'Robotics', 'Archery']:
        cca, _ = CCAActivity.objects.get_or_create(name=cca_name)
        cca_list.append(cca)

    print("Seeding Students and Fee Mappings...")
    demo_students_data = [
        {"name": "Aarav Sharma", "class": "5", "div": "A", "bus": "1", "bus_fee": 2500, "tuition_fee": 3500},
        {"name": "Aditi Verma", "class": "3", "div": "B", "bus": "2", "bus_fee": 2200, "tuition_fee": 3200},
        {"name": "Ishan Patel", "class": "8", "div": "C", "bus": "1", "bus_fee": 3000, "tuition_fee": 4500},
        {"name": "Ananya Iyer", "class": "2", "div": "A", "bus": "3", "bus_fee": 2100, "tuition_fee": 3000},
        {"name": "Vihaan Gupta", "class": "10", "div": "B", "bus": "4", "bus_fee": 3500, "tuition_fee": 5500},
        {"name": "Saanvi Reddy", "class": "4", "div": "C", "bus": "5", "bus_fee": 2400, "tuition_fee": 3800},
        {"name": "Arjun Malhotra", "class": "6", "div": "A", "bus": "2", "bus_fee": 2700, "tuition_fee": 4200},
        {"name": "Kavya Nair", "class": "1", "div": "B", "bus": "3", "bus_fee": 2000, "tuition_fee": 2800},
        {"name": "Reyansh Das", "class": "9", "div": "A", "bus": "1", "bus_fee": 3200, "tuition_fee": 4800},
        {"name": "Diya Kapoor", "class": "7", "div": "C", "bus": "4", "bus_fee": 2800, "tuition_fee": 4000},
    ]

    months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
    academic_year = "2024-25"

    all_students = []
    for i, data in enumerate(demo_students_data, 1):
        admission_no = f"2024{100 + i}"
        phone = f"98765432{i:02d}"
        
        student = Student.objects.create(
            admission_no=admission_no,
            name=data["name"],
            student_class=data["class"],
            division=data["div"],
            phone_number=phone,
            bus_number=data["bus"],
            bus_fee=data["bus_fee"],
            tuition_fee=data["tuition_fee"],
            status='Active'
        )
        # Randomly assign CCAs
        student.cca_activities.set(random.sample(cca_list, random.randint(0, 2)))
        all_students.append(student)

        # Create Fee Mappings for this student for last 4 months (April to July)
        for month in months[:4]:
            # Tuition Fee
            StudentFeeMapping.objects.create(
                student=student,
                fee_category=fee_cats['Tuition'],
                amount=student.tuition_fee,
                month=month,
                academic_year=academic_year,
                is_paid=False
            )
            # Bus Fee
            if student.bus_fee > 0:
                StudentFeeMapping.objects.create(
                    student=student,
                    fee_category=fee_cats['Bus'],
                    amount=student.bus_fee,
                    month=month,
                    academic_year=academic_year,
                    is_paid=False
                )

    print("Seeding some Paid Receipts for Dashboard Graphs...")
    # Pay for April for all students
    # And May for some
    
    # April payments
    april_date = date.today().replace(month=4, day=15)
    for student in all_students:
        mappings_to_pay = StudentFeeMapping.objects.filter(student=student, month="April")
        total_amount = sum(m.amount for m in mappings_to_pay)
        
        receipt = Receipt.objects.create(
            student=student,
            total_amount=total_amount,
            payment_status=paid_status,
            academic_year=academic_year,
            date=april_date
        )

        for mapping in mappings_to_pay:
            ReceiptItem.objects.create(
                receipt=receipt,
                fee_category=mapping.fee_category,
                amount=mapping.amount,
                month=mapping.month
            )
            mapping.is_paid = True
            mapping.save()
            
        # Update Collections
        daily, _ = DailyCollection.objects.get_or_create(date=receipt.date)
        daily.total_amount += total_amount
        daily.save()

        monthly, _ = MonthlyCollection.objects.get_or_create(month=receipt.date.month, year=receipt.date.year)
        monthly.total_amount += total_amount
        monthly.save()

    # May payments for half students
    may_date = date.today().replace(month=5, day=15)
    for student in all_students[:5]:
        mappings_to_pay = StudentFeeMapping.objects.filter(student=student, month="May")
        total_amount = sum(m.amount for m in mappings_to_pay)
        
        receipt = Receipt.objects.create(
            student=student,
            total_amount=total_amount,
            payment_status=paid_status,
            academic_year=academic_year,
            date=may_date
        )

        for mapping in mappings_to_pay:
            ReceiptItem.objects.create(
                receipt=receipt,
                fee_category=mapping.fee_category,
                amount=mapping.amount,
                month=mapping.month
            )
            mapping.is_paid = True
            mapping.save()
            
        # Update Collections
        daily, _ = DailyCollection.objects.get_or_create(date=receipt.date)
        daily.total_amount += total_amount
        daily.save()

        monthly, _ = MonthlyCollection.objects.get_or_create(month=receipt.date.month, year=receipt.date.year)
        monthly.total_amount += total_amount
        monthly.save()

    print("Data Reset and Seeding Complete!")

if __name__ == "__main__":
    reset_and_seed()

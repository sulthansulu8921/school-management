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
    cca_data = [
        ('Music', 500),
        ('Dance', 600),
        ('Karate', 800),
        ('Drawing', 400),
        ('Yoga', 550),
        ('Chess', 500),
        ('Violin', 700),
        ('Keyboard', 700),
        ('Abacus', 600),
        ('Skating', 750),
        ('Football', 800)
    ]
    for name, fee in cca_data:
        cca, _ = CCAActivity.objects.get_or_create(name=name, defaults={'monthly_fee': fee})
        cca_list.append(cca)

    print("Seeding Students and Fee Mappings...")
    demo_names = [
        "Aarav Sharma", "Aditi Verma", "Ishan Patel", "Ananya Iyer", "Vihaan Gupta",
        "Saanvi Reddy", "Arjun Malhotra", "Kavya Nair", "Reyansh Das", "Diya Kapoor",
        "Rahul Nair", "Priya Pillai", "Sneha Menon", "Gautam Iyer", "Meera Krishnan",
        "Varun Sivakumar", "Maya Balakrishnan", "Karthik Rajan", "Anjali Murali", "Deepak George",
        "Riya Chacko", "Nithin Scaria", "Tessa Joseph", "Mathew Varghese", "Sara Kurian",
        "Manu Bhaskar", "Divya Sreekumar", "Achu Shaji", "Nimmy Thomas", "Jithu Jose",
        "Amala Paul", "Unni Mukundan", "Mamta Mohandas", "Dulquer Salmaan", "Nivin Pauly",
        "Fahadh Faasil", "Nazriya Nazim", "Parvathy Thiruvothu", "Tovino Thomas", "Prithviraj Sukumaran",
        "Manju Warrier", "Shobhana", "Mohanlal", "Mammootty", "Jayaram", "Suresh Gopi",
        "Dileep", "Kunchacko Boban", "Asif Ali", "Indrajith Sukumaran"
    ]

    months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
    academic_year = "2024-25"

    all_students = []
    for i, name in enumerate(demo_names, 1):
        admission_no = f"2024{100 + i}"
        phone = f"98765432{i:02d}"
        student_class = str((i % 10) + 1) # Class 1 to 10
        division = random.choice(['A', 'B'])
        
        # Tuition fee based on class level
        tuition_fee = 2000 + (int(student_class) * 300)
        
        # Bus or not
        has_bus = random.choice([True, False])
        bus_fee = 1500 if has_bus else 0
        bus_no = str(random.randint(1, 10)) if has_bus else ""

        student = Student.objects.create(
            admission_no=admission_no,
            name=name,
            student_class=student_class,
            division=division,
            phone_number=phone,
            bus_number=bus_no,
            bus_fee=bus_fee,
            tuition_fee=tuition_fee,
            status='Active'
        )
        # Randomly assign CCAs
        student.cca_activities.set(random.sample(cca_list, random.randint(0, 2)))
        all_students.append(student)

        # Create Fee Mappings for this student for last 10 months (April to Jan)
        for month in months[:10]:
            # Tuition Fee
            StudentFeeMapping.objects.get_or_create(
                student=student,
                fee_category=fee_cats['Tuition'],
                month=month,
                academic_year=academic_year,
                defaults={'amount': student.tuition_fee, 'is_paid': False}
            )
            # Bus Fee
            if student.bus_fee > 0:
                StudentFeeMapping.objects.get_or_create(
                    student=student,
                    fee_category=fee_cats['Bus'],
                    month=month,
                    academic_year=academic_year,
                    defaults={'amount': student.bus_fee, 'is_paid': False}
                )

    print("Seeding Paid Receipts for Dashboard Graphs...")
    # Payment percentages for each month to make graphs look realistic
    payment_probs = {
        "April": 0.95, "May": 0.90, "June": 0.85, "July": 0.80, 
        "August": 0.75, "September": 0.70, "October": 0.65, "November": 0.60,
        "December": 0.55, "January": 0.50
    }
    
    for month_idx, month in enumerate(months[:10]):
        # Calculate a date in that month
        # April 2024 (idx 0), Jan 2025 (idx 9)
        year = 2024 if month_idx < 9 else 2025
        payment_month_num = (month_idx + 4) % 12
        if payment_month_num == 0: payment_month_num = 12
        
        prob = payment_probs.get(month, 0.5)
        
        for student in all_students:
            if random.random() < prob:
                mappings_to_pay = StudentFeeMapping.objects.filter(student=student, month=month, is_paid=False)
                if not mappings_to_pay.exists(): continue
                
                total_amount = sum(m.amount for m in mappings_to_pay)
                payment_date = date(year, payment_month_num, random.randint(5, 25))

                receipt = Receipt.objects.create(
                    student=student,
                    total_amount=total_amount,
                    payment_status=paid_status,
                    academic_year=academic_year,
                    date=payment_date
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

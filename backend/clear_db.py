import os
import sys
import django

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student
from payments.models import Receipt, ReceiptItem, StudentFeeMapping, DailyCollection, MonthlyCollection

def clear_data():
    print("Clearing all data from the database...")
    
    # Delete in order of dependency
    ReceiptItem.objects.all().delete()
    Receipt.objects.all().delete()
    StudentFeeMapping.objects.all().delete()
    DailyCollection.objects.all().delete()
    MonthlyCollection.objects.all().delete()
    Student.objects.all().delete()
    
    print("Database cleared successfully!")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL students and payment records? (yes/no): ")
    if confirm.lower() == 'yes':
        clear_data()
    else:
        print("Operation cancelled.")

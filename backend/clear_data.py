import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student
from payments.models import (
    StudentFeeMapping, Receipt, ReceiptItem,
    DailyCollection, MonthlyCollection
)

def clear_all_data():
    print("Clearing all records...")
    
    # Delete in order of dependency
    ReceiptItem.objects.all().delete()
    print("- Deleted all Receipt Items")
    
    Receipt.objects.all().delete()
    print("- Deleted all Receipts")
    
    StudentFeeMapping.objects.all().delete()
    print("- Deleted all Student Fee Mappings")
    
    Student.objects.all().delete()
    print("- Deleted all Students")
    
    DailyCollection.objects.all().delete()
    print("- Deleted all Daily Collections")
    
    MonthlyCollection.objects.all().delete()
    print("- Deleted all Monthly Collections")

    print("\nDatabase is now clean!")

if __name__ == "__main__":
    clear_all_data()
    
    # Try to automate migrations as well
    try:
        print("\nAttempting to run migrations...")
        os.system("python manage.py makemigrations")
        os.system("python manage.py migrate")
        print("Migrations completed!")
    except Exception as e:
        print(f"Could not run migrations automatically: {e}")
        print("Please run 'python manage.py makemigrations' and 'python manage.py migrate' manually.")

    print("\nYou can now add students manually in the app.")

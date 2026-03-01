from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Student
from payments.models import StudentFeeMapping, FeeCategory

@receiver(post_save, sender=Student)
def create_student_fees(sender, instance, created, **kwargs):
    if created:
        # Create fee mappings for the next 12 months
        months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
        academic_year = "2024-25" # Could be dynamic
        
        # Get or create categories
        tuition_cat, _ = FeeCategory.objects.get_or_create(name='Tuition')
        bus_cat, _ = FeeCategory.objects.get_or_create(name='Bus')
        
        # Filter months based on starting_month
        try:
            start_index = months.index(instance.starting_month)
            months_to_create = months[start_index:]
        except ValueError:
            months_to_create = months
        
        for month in months_to_create:
            try:
                # Try creating with full fields (paid_amount)
                try:
                    StudentFeeMapping.objects.get_or_create(
                        student=instance,
                        fee_category=tuition_cat,
                        month=month,
                        academic_year=academic_year,
                        defaults={'amount': instance.tuition_fee, 'is_paid': False, 'paid_amount': 0}
                    )
                except Exception:
                    # Fallback for missing column
                    StudentFeeMapping.objects.get_or_create(
                        student=instance,
                        fee_category=tuition_cat,
                        month=month,
                        academic_year=academic_year,
                        defaults={'amount': instance.tuition_fee, 'is_paid': False}
                    )
                
                # Bus Fee Mapping (if applicable)
                if instance.bus_fee > 0:
                    try:
                        StudentFeeMapping.objects.get_or_create(
                            student=instance,
                            fee_category=bus_cat,
                            month=month,
                            academic_year=academic_year,
                            defaults={'amount': instance.bus_fee, 'is_paid': False, 'paid_amount': 0}
                        )
                    except Exception:
                        # Fallback for missing column
                        StudentFeeMapping.objects.get_or_create(
                            student=instance,
                            fee_category=bus_cat,
                            month=month,
                            academic_year=academic_year,
                            defaults={'amount': instance.bus_fee, 'is_paid': False}
                        )
            except Exception as e:
                print(f"Error creating fee mappings for student {instance.name}: {e}")

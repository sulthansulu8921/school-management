from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.db.models import Sum
from .models import Student
from payments.models import StudentFeeMapping, FeeCategory
from payments.utils import MONTH_MAP

@receiver(post_save, sender=Student)
def create_student_fees(sender, instance, created, **kwargs):
    months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
    academic_year = instance.academic_year 
    
    # Get or create categories
    tuition_cat, _ = FeeCategory.objects.get_or_create(name='Tuition')
    bus_cat, _ = FeeCategory.objects.get_or_create(name='Bus')
    cca_cat, _ = FeeCategory.objects.get_or_create(name='CCA')
    
    # Determine which months should have fees (Always 12 months for a full cycle)
    start_num = MONTH_MAP.get(instance.starting_month, 4)
    valid_months = []
    for i in range(12):
        m_num = (start_num + i - 1) % 12 + 1
        name = [name for name, num in MONTH_MAP.items() if num == m_num][0]
        valid_months.append(name)
    
    # In the current logic, everything in valid_months is part of the 12-month AY cycle.
    invalid_months = [] 

    if not created:
        # Cleanup mappings for invalid months (only if unpaid)
        StudentFeeMapping.objects.filter(
            student=instance,
            month__in=invalid_months,
            academic_year=academic_year,
            is_paid=False
        ).delete()

    # Create or update mappings for valid months
    for month in valid_months:
        # Tuition Fee
        mapping, _ = StudentFeeMapping.objects.get_or_create(
            student=instance,
            fee_category=tuition_cat,
            month=month,
            academic_year=academic_year,
            defaults={'amount': instance.tuition_fee, 'is_paid': False, 'paid_amount': 0}
        )
        if not mapping.is_paid and mapping.amount != instance.tuition_fee:
            mapping.amount = instance.tuition_fee
            mapping.save()
        
        # Bus Fee
        if instance.bus_fee > 0:
            mapping, _ = StudentFeeMapping.objects.get_or_create(
                student=instance,
                fee_category=bus_cat,
                month=month,
                academic_year=academic_year,
                defaults={'amount': instance.bus_fee, 'is_paid': False, 'paid_amount': 0}
            )
            if not mapping.is_paid and mapping.amount != instance.bus_fee:
                mapping.amount = instance.bus_fee
                mapping.save()
        else:
            # Delete unpaid bus mappings if fee is set to 0
            StudentFeeMapping.objects.filter(
                student=instance,
                fee_category=bus_cat,
                month=month,
                academic_year=academic_year,
                is_paid=False
            ).delete()
        
        # CCA Fee (Initial creation only if student has fee set)
        if instance.cca_fee > 0:
            StudentFeeMapping.objects.get_or_create(
                student=instance,
                fee_category=cca_cat,
                month=month,
                academic_year=academic_year,
                defaults={'amount': instance.cca_fee, 'is_paid': False, 'paid_amount': 0}
            )

@receiver(m2m_changed, sender=Student.cca_activities.through)
def update_student_cca_fee(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        # Recalculate total CCA fee
        total_cca = instance.cca_activities.aggregate(total=Sum('monthly_fee'))['total'] or 0
        instance.cca_fee = total_cca
        instance.save(update_fields=['cca_fee'])
        
        # Update or create mappings for all 12 months in the cycle
        cca_cat, _ = FeeCategory.objects.get_or_create(name='CCA')
        
        start_num = MONTH_MAP.get(instance.starting_month, 4)
        relevant_months = []
        for i in range(12):
            m_num = (start_num + i - 1) % 12 + 1
            name = [name for name, num in MONTH_MAP.items() if num == m_num][0]
            relevant_months.append(name)

        for month in relevant_months:
            mapping, created = StudentFeeMapping.objects.get_or_create(
                student=instance,
                fee_category=cca_cat,
                month=month,
                academic_year=instance.academic_year,
                defaults={'amount': total_cca, 'is_paid': False, 'paid_amount': 0}
            )
            if not created and not mapping.is_paid:
                mapping.amount = total_cca
                mapping.save()

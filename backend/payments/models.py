from django.db import models
from django.utils import timezone
from students.models import Student

class FeeCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class CCAActivity(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class PaymentStatus(models.Model):
    name = models.CharField(max_length=50, unique=True) # e.g. Paid, Unpaid, Partial
    
    def __str__(self):
        return self.name

class StudentFeeMapping(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fee_mappings')
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    month = models.CharField(max_length=20)
    is_paid = models.BooleanField(default=False)
    academic_year = models.CharField(max_length=10, default='2024-25')

    class Meta:
        unique_together = ('student', 'fee_category', 'month', 'academic_year')

    def __str__(self):
        return f"{self.student.name} - {self.fee_category.name} ({self.month})"

class Receipt(models.Model):
    receipt_no = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    date = models.DateField(db_index=True, default=timezone.now)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='receipts')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.ForeignKey(PaymentStatus, on_delete=models.SET_NULL, null=True)
    academic_year = models.CharField(max_length=10, default='2024-25')
    
    def save(self, *args, **kwargs):
        from django.db import transaction
        if not self.receipt_no:
            with transaction.atomic():
                date_str = self.date.strftime('%d%m%y')
                prefix = f"REC{date_str}"
                # Get indices of all receipts for today
                receipt_nos = Receipt.objects.filter(receipt_no__startswith=prefix).values_list('receipt_no', flat=True)
                
                max_index = 0
                for r_no in receipt_nos:
                    try:
                        # Extract part after prefix
                        suffix = r_no[9:]
                        idx = int(suffix)
                        if idx > max_index:
                            max_index = idx
                    except (ValueError, IndexError):
                        continue
                
                next_index = str(max_index + 1).zfill(2)
                
                self.receipt_no = f"{prefix}{next_index}"
                print(f"Generated Receipt Number: {self.receipt_no} for date {self.date}")
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

class ReceiptItem(models.Model):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='items')
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.CharField(max_length=20)

class DailyCollection(models.Model):
    date = models.DateField(unique=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

class MonthlyCollection(models.Model):
    month = models.PositiveSmallIntegerField() # 1-12
    year = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        unique_together = ('month', 'year')

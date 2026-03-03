from django.db import models
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
    name = models.CharField(max_length=50, unique=True) # e.g. Paid, Unpaid
    
    def __str__(self):
        return self.name

class Receipt(models.Model):
    receipt_no = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateField(db_index=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='receipts')
    fee_type = models.ForeignKey(FeeCategory, on_delete=models.SET_NULL, null=True, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.CharField(max_length=20) # e.g., 'January', 'February'
    payment_status = models.ForeignKey(PaymentStatus, on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        return self.receipt_no

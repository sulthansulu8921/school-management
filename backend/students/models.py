from django.db import models

class Student(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )

    admission_no = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    student_class = models.CharField(max_length=50, db_index=True)
    division = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=20)
    bus_number = models.CharField(max_length=50, blank=True, null=True)
    bus_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    starting_month = models.CharField(max_length=20, default='April')
    cca_activities = models.ManyToManyField('payments.CCAActivity', blank=True, related_name='students')

    def __str__(self):
        return f"{self.admission_no} - {self.name}"

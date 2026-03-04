from django.db import models

class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)
    start_year = models.IntegerField(db_index=True, default=2024)
    end_year = models.IntegerField(default=2025)
    start_date = models.DateField(default='2024-04-01')
    end_date = models.DateField(default='2025-03-31')
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_year']

    def __str__(self):
        return self.name

class SchoolClass(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Student(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )

    admission_no = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=150)
    student_class = models.CharField(max_length=50, db_index=True)
    division = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=20)
    bus_number = models.CharField(max_length=50, blank=True, null=True)
    bus_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cca_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    starting_month = models.CharField(max_length=20, default='April')
    starting_year = models.IntegerField(default=2024)
    academic_year = models.CharField(max_length=10, default='2024-25', db_index=True)
    cca_activities = models.ManyToManyField('payments.CCAActivity', blank=True, related_name='students')

    class Meta:
        unique_together = ('admission_no', 'academic_year')

    def __str__(self):
        return f"[{self.academic_year}] {self.admission_no} - {self.name}"

class StudentAcademicRecord(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='academic_records')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    student_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    division = models.CharField(max_length=20)
    class_fee_start_date = models.DateField()
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    bus_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cca_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    carry_forward_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Student.STATUS_CHOICES, default='Active')

    class Meta:
        unique_together = ('student', 'academic_year')

    def __str__(self):
        return f"{self.student.name} - {self.academic_year.name}"

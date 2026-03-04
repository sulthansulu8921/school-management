from rest_framework import serializers
from django.db.models import Sum
from .models import Student, AcademicYear, SchoolClass, StudentAcademicRecord

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'

class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    pending_balance = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_pending_balance(self, obj):
        from payments.models import StudentFeeMapping
        return obj.fee_mappings.filter(is_paid=False).aggregate(Sum('amount'))['amount__sum'] or 0

class StudentAcademicRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAcademicRecord
        fields = '__all__'

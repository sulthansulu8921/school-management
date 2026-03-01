from rest_framework import serializers
from django.db.models import Sum
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    pending_balance = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_pending_balance(self, obj):
        from payments.models import StudentFeeMapping
        return obj.fee_mappings.filter(is_paid=False).aggregate(Sum('amount'))['amount__sum'] or 0

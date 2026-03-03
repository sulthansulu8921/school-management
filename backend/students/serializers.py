from rest_framework import serializers
from django.db.models import Sum
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    pending_balance = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_pending_balance(self, obj):
        from payments.models import Receipt
        return obj.receipts.filter(payment_status__name='Unpaid').aggregate(Sum('amount'))['amount__sum'] or 0

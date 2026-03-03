from rest_framework import serializers
from .models import FeeCategory, CCAActivity, PaymentStatus, Receipt
from students.serializers import StudentSerializer

class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = '__all__'

class CCAActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CCAActivity
        fields = '__all__'

class PaymentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentStatus
        fields = '__all__'

class ReceiptSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    fee_type_details = FeeCategorySerializer(source='fee_type', read_only=True)
    payment_status_details = PaymentStatusSerializer(source='payment_status', read_only=True)
    
    class Meta:
        model = Receipt
        fields = '__all__'

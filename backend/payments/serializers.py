from rest_framework import serializers
from .models import FeeCategory, CCAActivity, PaymentStatus, Receipt, StudentFeeMapping, ReceiptItem
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

class StudentFeeMappingSerializer(serializers.ModelSerializer):
    fee_category_details = FeeCategorySerializer(source='fee_category', read_only=True)
    class Meta:
        model = StudentFeeMapping
        fields = '__all__'

class ReceiptItemSerializer(serializers.ModelSerializer):
    fee_category_name = serializers.ReadOnlyField(source='fee_category.name')
    class Meta:
        model = ReceiptItem
        fields = '__all__'

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True, read_only=True)
    student_details = StudentSerializer(source='student', read_only=True)
    payment_status_details = PaymentStatusSerializer(source='payment_status', read_only=True)
    fee_type_summary = serializers.SerializerMethodField()
    month_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Receipt
        fields = '__all__'

    def get_fee_type_summary(self, obj):
        categories = obj.items.values_list('fee_category__name', flat=True).distinct()
        return ", ".join(categories)

    def get_month_summary(self, obj):
        months = obj.items.values_list('month', flat=True).distinct()
        # Sort months if needed, but for now just comma separated
        return ", ".join(months)

from rest_framework import serializers
from .models import FeeCategory, CCAActivity, PaymentStatus, Receipt, StudentFeeMapping, ReceiptItem, ReceiptAuditLog
from .utils import get_month_year
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
    month_with_year = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentFeeMapping
        fields = '__all__'

    def get_month_with_year(self, obj):
        return get_month_year(obj.month, obj.academic_year, obj.student.starting_month)

class ReceiptItemSerializer(serializers.ModelSerializer):
    fee_category_name = serializers.ReadOnlyField(source='fee_category.name')
    month_with_year = serializers.SerializerMethodField()
    
    class Meta:
        model = ReceiptItem
        fields = '__all__'

    def get_month_with_year(self, obj):
        return get_month_year(obj.month, obj.receipt.academic_year, obj.receipt.student.starting_month)

class ReceiptAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = ReceiptAuditLog
        fields = '__all__'

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True, read_only=True)
    student_details = StudentSerializer(source='student', read_only=True)
    payment_status_details = PaymentStatusSerializer(source='payment_status', read_only=True)
    fee_type_summary = serializers.SerializerMethodField()
    month_summary = serializers.SerializerMethodField()
    audit_logs = ReceiptAuditLogSerializer(many=True, read_only=True)
    deleted_by_name = serializers.ReadOnlyField(source='deleted_by.username')
    
    class Meta:
        model = Receipt
        fields = '__all__'

    def get_fee_type_summary(self, obj):
        categories = obj.items.values_list('fee_category__name', flat=True).distinct()
        return ", ".join(categories)

    def get_month_summary(self, obj):
        months = obj.items.values_list('month', flat=True).distinct()
        return ", ".join([get_month_year(m, obj.academic_year, obj.student.starting_month) for m in months])

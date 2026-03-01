from django.db import transaction
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import FeeCategory, CCAActivity, PaymentStatus, Receipt, StudentFeeMapping, ReceiptItem, DailyCollection, MonthlyCollection
from .serializers import (
    FeeCategorySerializer, 
    CCAActivitySerializer, 
    PaymentStatusSerializer, 
    ReceiptSerializer,
    StudentFeeMappingSerializer
)

class FeeCategoryViewSet(viewsets.ModelViewSet):
    queryset = FeeCategory.objects.all().order_by('name')
    serializer_class = FeeCategorySerializer

class CCAActivityViewSet(viewsets.ModelViewSet):
    queryset = CCAActivity.objects.all().order_by('name')
    serializer_class = CCAActivitySerializer

class PaymentStatusViewSet(viewsets.ModelViewSet):
    queryset = PaymentStatus.objects.all().order_by('name')
    serializer_class = PaymentStatusSerializer

class StudentFeeMappingViewSet(viewsets.ModelViewSet):
    queryset = StudentFeeMapping.objects.select_related('student', 'fee_category').all()
    serializer_class = StudentFeeMappingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['student', 'is_paid', 'month']

class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.prefetch_related('items', 'items__fee_category').select_related('student', 'payment_status').all().order_by('-date', '-id')
    serializer_class = ReceiptSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'payment_status', 'date']
    search_fields = ['receipt_no', 'student__name', 'student__admission_no']
    ordering_fields = ['date', 'total_amount']

    @transaction.atomic
    def perform_create(self, serializer):
        # Save the receipt first
        receipt = serializer.save()
        
        item_ids = self.request.data.get('item_ids', [])
        # Get remaining balance for selected mappings
        items_to_pay = StudentFeeMapping.objects.filter(id__in=item_ids, student=receipt.student).order_by('id')
        
        remaining_receipt_amount = receipt.total_amount
        
        for mapping in items_to_pay:
            if remaining_receipt_amount <= 0:
                break
                
            # Calculate what's still owed on this mapping
            still_owed = mapping.amount - mapping.paid_amount
            
            # Amount to apply to this mapping from THIS receipt
            amount_to_apply = min(remaining_receipt_amount, still_owed)
            
            if amount_to_apply > 0:
                # Create receipt item with the amount applied in THIS receipt
                ReceiptItem.objects.create(
                    receipt=receipt,
                    fee_category=mapping.fee_category,
                    amount=amount_to_apply,
                    month=mapping.month
                )
                
                # Update mapping's paid_amount
                mapping.paid_amount += amount_to_apply
                if mapping.paid_amount >= mapping.amount:
                    mapping.is_paid = True
                mapping.save()
                
                remaining_receipt_amount -= amount_to_apply
        
        # Update Collections - Use receipt.total_amount for transparency
        today = receipt.date
        daily, _ = DailyCollection.objects.get_or_create(date=today)
        daily.total_amount += receipt.total_amount
        daily.save()
        
        monthly, _ = MonthlyCollection.objects.get_or_create(month=today.month, year=today.year)
        monthly.total_amount += receipt.total_amount
        monthly.save()

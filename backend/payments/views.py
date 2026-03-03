from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import FeeCategory, CCAActivity, PaymentStatus, Receipt
from .serializers import (
    FeeCategorySerializer, 
    CCAActivitySerializer, 
    PaymentStatusSerializer, 
    ReceiptSerializer
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

class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.select_related('student', 'fee_type', 'payment_status').all().order_by('-date', '-id')
    serializer_class = ReceiptSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'fee_type', 'payment_status', 'month', 'date']
    search_fields = ['receipt_no', 'student__name', 'student__admission_no']
    ordering_fields = ['date', 'amount']

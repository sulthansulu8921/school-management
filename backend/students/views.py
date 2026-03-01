from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Student
from .serializers import StudentSerializer

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('-id')
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student_class', 'status']
    search_fields = ['name', 'admission_no', 'phone_number', 'bus_number', 'bus_fee', 'tuition_fee', 'division']
    ordering_fields = ['name', 'admission_no', 'bus_number', 'bus_fee', 'tuition_fee']

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response as DRFResponse
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from .models import Student, AcademicYear, SchoolClass, StudentAcademicRecord
from .serializers import StudentSerializer, AcademicYearSerializer, SchoolClassSerializer

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all().order_by('-start_year')
    serializer_class = AcademicYearSerializer

class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all().order_by('name')
    serializer_class = SchoolClassSerializer

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('-id')
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student_class', 'status', 'academic_year']
    search_fields = ['name', 'admission_no', 'phone_number', 'bus_number', 'bus_fee', 'tuition_fee', 'division']
    ordering_fields = ['name', 'admission_no', 'bus_number', 'bus_fee', 'tuition_fee']

    @action(detail=False, methods=['post'])
    def promote(self, request):
        student_ids = request.data.get('student_ids', [])
        target_year_name = request.data.get('target_year') 
        from_year_name = request.data.get('from_year')
        starting_month = request.data.get('starting_month', 'April')
        starting_year = request.data.get('starting_year')
        keep_fees = request.data.get('keep_fees', False)
        
        if not student_ids or not target_year_name:
            return DRFResponse({"error": "student_ids and target_year are required"}, status=400)
        
        try:
            with transaction.atomic():
                target_year_obj = AcademicYear.objects.get(name=target_year_name)
                
                # Validation: Target year must be > from year if provided
                if from_year_name:
                    from_year_obj = AcademicYear.objects.get(name=from_year_name)
                    if target_year_obj.start_year <= from_year_obj.start_year:
                        return DRFResponse({"error": "Target year must be greater than source year"}, status=400)

                students = Student.objects.filter(id__in=student_ids)
                promoted_count = 0
                errors = []

                for student in students:
                    # Check if already exists in target year
                    if Student.objects.filter(admission_no=student.admission_no, academic_year=target_year_name).exists():
                        errors.append(f"Student {student.admission_no} already exists for {target_year_name}")
                        continue
                    
                    # Determine new class
                    try:
                        import re
                        current_class_str = student.student_class
                        match = re.search(r'\d+', current_class_str)
                        if match:
                            num = int(match.group())
                            new_class_str = current_class_str.replace(str(num), str(num + 1))
                        else:
                            new_class_str = current_class_str
                    except:
                        new_class_str = student.student_class

                    # Create new student record for the new year
                    new_student = Student.objects.create(
                        admission_no=student.admission_no,
                        name=student.name,
                        student_class=new_class_str,
                        division=student.division,
                        phone_number=student.phone_number,
                        bus_number=student.bus_number,
                        bus_fee=student.bus_fee if keep_fees else 0,
                        tuition_fee=student.tuition_fee if keep_fees else 0,
                        status='Active',
                        starting_month=starting_month,
                        starting_year=starting_year or target_year_obj.start_year,
                        academic_year=target_year_name
                    )
                    
                    # Also create StudentAcademicRecord for linkage
                    # Check for SchoolClass object
                    s_class, _ = SchoolClass.objects.get_or_create(name=new_class_str)
                    
                    StudentAcademicRecord.objects.create(
                        student=new_student,
                        academic_year=target_year_obj,
                        student_class=s_class,
                        division=new_student.division,
                        class_fee_start_date=target_year_obj.start_date,
                        tuition_fee=new_student.tuition_fee,
                        bus_fee=new_student.bus_fee,
                        cca_fee=0,
                        status='Active'
                    )
                    
                    promoted_count += 1
                    
                return DRFResponse({
                    "message": f"Successfully promoted {promoted_count} students",
                    "errors": errors
                })
        except Exception as e:
            return DRFResponse({"error": str(e)}, status=400)

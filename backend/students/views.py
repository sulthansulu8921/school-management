from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response as DRFResponse
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Student
from .serializers import StudentSerializer

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
        target_year = request.data.get('target_year')
        starting_month = request.data.get('starting_month', 'April')
        keep_fees = request.data.get('keep_fees', False)
        
        if not student_ids or not target_year:
            return DRFResponse({"error": "student_ids and target_year are required"}, status=400)
        
        students = Student.objects.filter(id__in=student_ids)
        promoted_count = 0
        errors = []

        for student in students:
            # Check if already promoted for this year
            if Student.objects.filter(admission_no=student.admission_no, academic_year=target_year).exists():
                errors.append(f"Student {student.admission_no} already exists for {target_year}")
                continue
            
            # Increment class
            try:
                import re
                current_class_str = student.student_class
                # Try to find a number in the class string
                match = re.search(r'\d+', current_class_str)
                if match:
                    current_class_num = int(match.group())
                    new_class_num = current_class_num + 1
                    new_class_str = current_class_str.replace(str(current_class_num), str(new_class_num))
                else:
                    new_class_str = current_class_str # Fallback
            except:
                new_class_str = student.student_class

            # Create new student record
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
                academic_year=target_year
            )
            # CCA activities are NOT copied as per requirement (initialize as empty)
            promoted_count += 1
            
        return DRFResponse({
            "message": f"Successfully promoted {promoted_count} students",
            "errors": errors
        })

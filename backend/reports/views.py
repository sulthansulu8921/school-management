from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from students.models import Student
from payments.models import Receipt, PaymentStatus, FeeCategory

class DashboardAPIView(APIView):
    def get(self, request):
        today = timezone.now().date()
        total_students = Student.objects.filter(status='Active').count()
        today_collection = Receipt.objects.filter(date=today, payment_status__name='Paid').aggregate(Sum('amount'))['amount__sum'] or 0
        month_collection = Receipt.objects.filter(date__month=today.month, date__year=today.year, payment_status__name='Paid').aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Pending amount simplification: Unpaid receipts amount
        pending_amount = Receipt.objects.filter(payment_status__name='Unpaid').aggregate(Sum('amount'))['amount__sum'] or 0
        
        recent_transactions = Receipt.objects.select_related('student', 'fee_type').order_by('-id')[:5]
        recent_data = [{
            'receipt_no': r.receipt_no,
            'student_name': r.student.name,
            'amount': r.amount,
            'date': r.date.isoformat(),
            'fee_type': r.fee_type.name if r.fee_type else 'N/A'
        } for r in recent_transactions]
        
        return Response({
            'total_students': total_students,
            'today_collection': today_collection,
            'month_collection': month_collection,
            'pending_amount': pending_amount,
            'recent_transactions': recent_data
        })

class DateWiseCollectionAPIView(APIView):
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        student_class = request.query_params.get('class')
        division = request.query_params.get('division')
        fee_type = request.query_params.get('fee_type')
        search = request.query_params.get('search')
        
        receipts = Receipt.objects.select_related('student', 'fee_type', 'payment_status').all()
        
        if start_date:
            receipts = receipts.filter(date__gte=start_date)
        if end_date:
            receipts = receipts.filter(date__lte=end_date)
        if student_class:
            receipts = receipts.filter(student__student_class=student_class)
        if division:
            receipts = receipts.filter(student__division=division)
        if fee_type:
            receipts = receipts.filter(fee_type_id=fee_type)
        if search:
            receipts = receipts.filter(
                Q(student__name__icontains=search) | 
                Q(receipt_no__icontains=search) |
                Q(student__admission_no__icontains=search)
            )
            
        total_amount = receipts.filter(payment_status__name='Paid').aggregate(Sum('amount'))['amount__sum'] or 0
        
        data = [{
            'receipt_no': r.receipt_no,
            'date': r.date.isoformat(),
            'student_name': r.student.name,
            'class': r.student.student_class,
            'division': r.student.division,
            'fee_type': r.fee_type.name if r.fee_type else 'N/A',
            'amount': r.amount,
            'status': r.payment_status.name if r.payment_status else 'N/A',
        } for r in receipts]
        
        return Response({
            'total_amount': total_amount,
            'receipts': data
        })

class FeeTypeReportAPIView(APIView):
    def get(self, request):
        report = Receipt.objects.filter(payment_status__name='Paid').values(
            'fee_type__name'
        ).annotate(
            total_students=Count('student', distinct=True),
            total_amount=Sum('amount')
        )
        return Response(list(report))

class StudentWiseReportAPIView(APIView):
    def get(self, request):
        student_id = request.query_params.get('student_id')
        search = request.query_params.get('search')
        
        if student_id:
            try:
                student = Student.objects.prefetch_related('cca_activities').get(id=student_id)
            except Student.DoesNotExist:
                return Response({'error': 'Student not found'}, status=404)
        elif search:
            try:
                student = Student.objects.prefetch_related('cca_activities').filter(
                    Q(name__icontains=search) | Q(admission_no__icontains=search)
                ).first()
                if not student:
                    return Response({'error': 'Student not found'}, status=404)
            except Exception:
                return Response({'error': 'Search error'}, status=400)
        else:
            return Response({'error': 'Student ID or Search term required'}, status=400)
            
        receipts = Receipt.objects.filter(student=student).select_related('fee_type', 'payment_status').order_by('-date')
        
        pending_receipts = receipts.filter(payment_status__name='Unpaid')
        pending_months = list(pending_receipts.values_list('month', flat=True).distinct())
        
        cca_activities = [cca.name for cca in student.cca_activities.all()]
        
        history = [{
            'receipt_no': r.receipt_no,
            'date': r.date.isoformat(),
            'fee_type': r.fee_type.name if r.fee_type else 'N/A',
            'amount': r.amount,
            'month': r.month,
            'status': r.payment_status.name if r.payment_status else 'N/A',
        } for r in receipts]
        
        return Response({
            'student_name': student.name,
            'admission_no': student.admission_no,
            'class': student.student_class,
            'division': student.division,
            'pending_months': pending_months,
            'cca_activities': cca_activities,
            'history': history,
        })

class ClassWiseReportAPIView(APIView):
    def get(self, request):
        report = Receipt.objects.values('student__student_class').annotate(
            paid_count=Count('id', filter=Q(payment_status__name='Paid')),
            unpaid_count=Count('id', filter=Q(payment_status__name='Unpaid')),
            total_paid=Sum('amount', filter=Q(payment_status__name='Paid')),
        )
        data = [{
            'class': item['student__student_class'],
            'paid_count': item['paid_count'],
            'unpaid_count': item['unpaid_count'],
            'total_paid': item['total_paid'] or 0,
        } for item in report if item['student__student_class']]
        return Response(data)

class MonthlySummaryAPIView(APIView):
    def get(self, request):
        # Simplistic grouping by month field for dashboard charts
        report = Receipt.objects.filter(payment_status__name='Paid').values('month').annotate(
            total_collection=Sum('amount')
        ).order_by('month')
        return Response(list(report))

class PendingReportAPIView(APIView):
    def get(self, request):
        class_name = request.query_params.get('class')
        
        if not class_name:
            # Return class-wise grouping of pending vs paid
            report = Receipt.objects.values('student__student_class').annotate(
                paid_count=Count('id', filter=Q(payment_status__name='Paid')),
                unpaid_count=Count('id', filter=Q(payment_status__name='Unpaid'))
            )
            data = [{
                'class': item['student__student_class'],
                'paid_count': item['paid_count'],
                'unpaid_count': item['unpaid_count']
            } for item in report if item['student__student_class']]
            return Response(data)
        else:
            # Return pending student list for a specific class
            pending_receipts = Receipt.objects.filter(
                payment_status__name='Unpaid', 
                student__student_class=class_name
            ).select_related('student', 'fee_type')
            
            students_dict = {}
            for r in pending_receipts:
                if r.student.id not in students_dict:
                    students_dict[r.student.id] = {
                        'student_name': r.student.name,
                        'admission_no': r.student.admission_no,
                        'phone_number': r.student.phone_number,
                        'pending_amount': 0,
                        'pending_months': set()
                    }
                students_dict[r.student.id]['pending_amount'] += r.amount
                if r.month:
                    students_dict[r.student.id]['pending_months'].add(r.month)
            
            # Format output
            data = []
            for student_id, details in students_dict.items():
                details['pending_months'] = list(details['pending_months'])
                data.append(details)
                
            return Response(data)

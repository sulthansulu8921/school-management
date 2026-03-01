from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from students.models import Student
from payments.models import (
    Receipt, PaymentStatus, FeeCategory, 
    DailyCollection, MonthlyCollection, StudentFeeMapping
)

class DashboardAPIView(APIView):
    def get(self, request):
        today = timezone.now().date()
        total_students = Student.objects.filter(status='Active').count()
        
        # Pull from optimized collection tables (Daily/MonthlyCollection already include Partial in ReceiptViewSet.perform_create)
        daily_stat = DailyCollection.objects.filter(date=today).first()
        today_collection = daily_stat.total_amount if daily_stat else 0
        
        monthly_stat = MonthlyCollection.objects.filter(month=today.month, year=today.year).first()
        month_collection = monthly_stat.total_amount if monthly_stat else 0
        
        # Academic year month order (April to March)
        months_order = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
        current_month_name = today.strftime('%B')
        try:
            current_month_index = months_order.index(current_month_name)
            due_months = months_order[:current_month_index + 1]
        except ValueError:
            due_months = months_order

        # Pending amount: Sum of all unpaid fee mappings for months up to current month
        try:
            pending_stats = StudentFeeMapping.objects.filter(
                is_paid=False,
                month__in=due_months
            ).aggregate(
                total_owed=Sum('amount'),
                total_paid=Sum('paid_amount')
            )
            total_owed = pending_stats['total_owed'] or 0
            total_paid = pending_stats['total_paid'] or 0
            pending_amount = total_owed - total_paid
        except Exception as e:
            print(f"Error calculating pending amount: {e}")
            # Fallback if the new column doesn't exist yet
            pending_amount = StudentFeeMapping.objects.filter(
                is_paid=False,
                month__in=due_months
            ).aggregate(Sum('amount'))['amount__sum'] or 0
        pending_student_count = StudentFeeMapping.objects.filter(
            is_paid=False,
            month__in=due_months
        ).values('student').distinct().count()
        today_receipt_count = Receipt.objects.filter(date=today).count()
        
        recent_transactions = Receipt.objects.prefetch_related('items', 'items__fee_category').select_related('student').order_by('-id')[:5]
        recent_data = [{
            'receipt_no': r.receipt_no,
            'student_name': r.student.name,
            'amount': float(r.total_amount or 0),
            'date': r.date.isoformat(),
            'fee_type': r.items.first().fee_category.name if r.items.exists() else 'Multi'
        } for r in recent_transactions]
        
        # Monthly collection chart data (Last 4 months)
        chart_data = []
        current_date = today
        for _ in range(4):
            m = current_date.month
            y = current_date.year
            stat = MonthlyCollection.objects.filter(month=m, year=y).first()
            coll = stat.total_amount if stat else 0
            
            chart_data.insert(0, {
                'name': current_date.strftime('%B')[:3],
                'collection': float(coll),
                'color': '#0066cc' if len(chart_data) % 2 == 0 else '#10b981'
            })
            # Move to previous month
            first_of_month = current_date.replace(day=1)
            current_date = (first_of_month - timedelta(days=1))
            
        return Response({
            'total_students': total_students,
            'today_collection': float(today_collection),
            'month_collection': float(month_collection),
            'pending_amount': float(pending_amount),
            'pending_student_count': pending_student_count,
            'today_receipt_count': today_receipt_count,
            'recent_transactions': recent_data,
            'chart_data': chart_data
        })

class DateWiseCollectionAPIView(APIView):
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        student_class = request.query_params.get('class')
        division = request.query_params.get('division')
        fee_type = request.query_params.get('fee_type')
        search = request.query_params.get('search')
        
        receipts = Receipt.objects.prefetch_related('items', 'items__fee_category').select_related('student', 'payment_status').all()
        
        if start_date:
            receipts = receipts.filter(date__gte=start_date)
        if end_date:
            receipts = receipts.filter(date__lte=end_date)
        if student_class:
            receipts = receipts.filter(student__student_class=student_class)
        if division:
            receipts = receipts.filter(student__division=division)
        if fee_type:
            receipts = receipts.filter(items__fee_category_id=fee_type)
        if search:
            receipts = receipts.filter(
                Q(student__name__icontains=search) | 
                Q(receipt_no__icontains=search) |
                Q(student__admission_no__icontains=search)
            )
            
        # Include both Paid and Partial in the total collection
        total_amount = receipts.filter(payment_status__name__in=['Paid', 'Partial']).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        data = [{
            'receipt_no': r.receipt_no,
            'date': r.date.isoformat(),
            'student_name': r.student.name,
            'class': r.student.student_class,
            'division': r.student.division,
            'fee_type': r.items.first().fee_category.name if r.items.exists() else 'N/A',
            'amount': r.total_amount,
            'status': r.payment_status.name if r.payment_status else 'N/A',
        } for r in receipts]
        
        return Response({
            'total_amount': total_amount,
            'receipts': data
        })

class FeeTypeReportAPIView(APIView):
    def get(self, request):
        report = ReceiptItem.objects.filter(receipt__payment_status__name__in=['Paid', 'Partial']).values(
            'fee_category__name'
        ).annotate(
            total_students=Count('receipt__student', distinct=True),
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
            
        receipts = Receipt.objects.filter(student=student).prefetch_related('items', 'items__fee_category').select_related('payment_status').order_by('-date')
        
        # Get pending fees up to today
        today = timezone.now().date()
        months_order = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
        current_month_name = today.strftime('%B')
        try:
            current_month_index = months_order.index(current_month_name)
            due_months = months_order[:current_month_index + 1]
        except ValueError:
            due_months = months_order
            
        pending_mappings = StudentFeeMapping.objects.filter(
            student=student,
            is_paid=False,
            month__in=due_months
        )
        pending_months = list(set(pending_mappings.values_list('month', flat=True)))
        pending_months.sort(key=lambda m: months_order.index(m) if m in months_order else 99)
        
        cca_activities = [cca.name for cca in student.cca_activities.all()]
        
        history = [{
            'receipt_no': r.receipt_no,
            'date': r.date.isoformat(),
            'fee_type': r.items.first().fee_category.name if r.items.exists() else 'N/A',
            'amount': r.total_amount,
            'month': r.items.first().month if r.items.exists() else 'N/A',
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
            total_paid=Sum('total_amount', filter=Q(payment_status__name='Paid')),
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
        # Include both Paid and Partial
        report = Receipt.objects.filter(payment_status__name__in=['Paid', 'Partial']).values('date__month').annotate(
            total_collection=Sum('total_amount')
        ).order_by('date__month')
        return Response(list(report))

class PendingReportAPIView(APIView):
    def get(self, request):
        class_name = request.query_params.get('class')
        today = timezone.now().date()
        months_order = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
        current_month_name = today.strftime('%B')
        try:
            current_month_index = months_order.index(current_month_name)
            due_months = months_order[:current_month_index + 1]
        except ValueError:
            due_months = months_order

        if not class_name:
            # Return class-wise grouping of pending students (only for due months)
            report = StudentFeeMapping.objects.filter(
                is_paid=False,
                month__in=due_months
            ).values('student__student_class').annotate(
                unpaid_count=Count('student', distinct=True)
            )
            data = [{
                'class': item['student__student_class'],
                'unpaid_count': item['unpaid_count']
            } for item in report if item['student__student_class']]
            return Response(data)
        else:
            # Return pending student list for a specific class based on Fee Mappings (only for due months)
            pending_mappings = StudentFeeMapping.objects.filter(
                is_paid=False, 
                student__student_class=class_name,
                month__in=due_months
            ).select_related('student', 'fee_category')
            
            students_dict = {}
            for m in pending_mappings:
                if m.student.id not in students_dict:
                    students_dict[m.student.id] = {
                        'student_id': m.student.id,
                        'student_name': m.student.name,
                        'admission_no': m.student.admission_no,
                        'phone_number': m.student.phone_number,
                        'pending_amount': 0,
                        'pending_months': set()
                    }
                try:
                    students_dict[m.student.id]['pending_amount'] += (m.amount - getattr(m, 'paid_amount', 0))
                except:
                    students_dict[m.student.id]['pending_amount'] += m.amount
                if m.month:
                    students_dict[m.student.id]['pending_months'].add(m.month)
            
            # Format output
            MONTH_ORDER = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
            data = []
            for student_id, details in students_dict.items():
                details['pending_amount'] = float(details['pending_amount'])
                details['pending_months'] = sorted(list(details['pending_months']), key=lambda m: MONTH_ORDER.index(m) if m in MONTH_ORDER else 99)
                data.append(details)
                
            return Response(data)

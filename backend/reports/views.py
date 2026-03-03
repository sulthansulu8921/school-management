from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F, Value
from django.db.models.functions import TruncMonth, Concat
from django.utils import timezone
from datetime import date, timedelta
from students.models import Student
from payments.models import (
    Receipt, PaymentStatus, FeeCategory, 
    DailyCollection, MonthlyCollection, StudentFeeMapping,
    ReceiptItem
)

from payments.utils import MONTHS_ORDER, get_month_year

MONTH_MAP = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
}

def get_due_months(academic_year, start_month):
    """
    Returns a list of months from the start_month up to the current month, 
    strictly bounded by the 12-month academic cycle starting from start_month.
    """
    try:
        start_year = int(academic_year.split('-')[0])
        start_month_num = MONTH_MAP.get(start_month, 4)
        
        # Academic year officially starts on the 1st of the start_month
        ay_start_date = date(start_year, start_month_num, 1)
        
        # Academic year ends exactly 12 months later (last day of the 12th month)
        if start_month_num == 1:
            ay_end_date = date(start_year, 12, 31)
        else:
            # e.g. Start June 2025 (6) -> Ends May 2026 (5)
            end_year = start_year + 1
            end_month = start_month_num - 1
            import calendar
            _, last_day = calendar.monthrange(end_year, end_month)
            ay_end_date = date(end_year, end_month, last_day)
            
        today = timezone.now().date()

        if today < ay_start_date:
            return []
            
        # Generate the circular list of months for THIS academic year
        # e.g. if start is June: [June, July, ..., Dec, Jan, ..., May]
        ordered_cycle = []
        for i in range(12):
            m = (start_month_num + i - 1) % 12 + 1
            # Find name from number
            name = [name for name, num in MONTH_MAP.items() if num == m][0]
            ordered_cycle.append(name)

        if today > ay_end_date:
            # Year is over, all 12 months are due
            return ordered_cycle
        
        # Today is within the cycle. How many months have passed?
        # Number of months from start_date to today
        months_passed = (today.year - ay_start_date.year) * 12 + (today.month - ay_start_date.month)
        
        if months_passed < 0:
            return []
            
        return ordered_cycle[:months_passed + 1]
    except Exception:
        return MONTHS_ORDER

class DashboardAPIView(APIView):
    def get(self, request):
        academic_year = request.query_params.get('academic_year', '2024-25')
        today = timezone.now().date()
        total_students = Student.objects.filter(status='Active', academic_year=academic_year).count()
        
        # Pull from optimized collection tables
        daily_stat = DailyCollection.objects.filter(date=today, academic_year=academic_year).first()
        today_collection = daily_stat.total_amount if daily_stat else 0
        
        monthly_stat = MonthlyCollection.objects.filter(month=today.month, year=today.year, academic_year=academic_year).first()
        month_collection = monthly_stat.total_amount if monthly_stat else 0
        
        # Academic year month order (April to March)
        # Determine starting month for filtering
        year_students = Student.objects.filter(academic_year=academic_year)
        month_freq = year_students.values('starting_month').annotate(count=Count('starting_month')).order_by('-count')
        year_start_month = month_freq[0]['starting_month'] if month_freq.exists() else 'April'
        due_months = get_due_months(academic_year, year_start_month)
        # 1. Determine cycle limits
        try:
            start_year_val = int(academic_year.split('-')[0])
        except (ValueError, IndexError):
            start_year_val = today.year
            
        start_month_num = MONTH_MAP.get(year_start_month, 4)
        ay_start_date = date(start_year_val, start_month_num, 1)
        
        # If today is before the start of the academic year, the whole year has 0 totals
        is_started = today >= ay_start_date

        pending_stats = StudentFeeMapping.objects.filter(
            is_paid=False,
            month__in=due_months,
            academic_year=academic_year,
            amount__gt=0
        ).aggregate(
            total_owed=Sum('amount'),
            total_paid=Sum('paid_amount')
        )
        total_owed = pending_stats['total_owed'] or 0
        total_paid = pending_stats['total_paid'] or 0
        pending_amount = total_owed - total_paid if is_started else 0

        pending_student_count = StudentFeeMapping.objects.filter(
            is_paid=False,
            month__in=due_months,
            academic_year=academic_year,
            amount__gt=0
        ).values('student').distinct().count() if is_started else 0
        
        today_receipt_count = Receipt.objects.filter(date=timezone.now().date(), academic_year=academic_year).count() if is_started else 0
        
        recent_transactions = Receipt.objects.filter(academic_year=academic_year).prefetch_related('items', 'items__fee_category').select_related('student').order_by('-id')[:5]
        recent_data = [{
            'receipt_no': r.receipt_no,
            'student_name': r.student.name,
            'amount': float(r.total_amount or 0),
            'date': r.date.isoformat(),
            'fee_type': r.items.first().fee_category.name if r.items.exists() else 'Multi'
        } for r in recent_transactions]
        
        # Monthly collection and pending chart data (Circular order)
        # Calculate pending per month efficiently
        from django.db.models import F
        pending_qs = StudentFeeMapping.objects.filter(
            academic_year=academic_year,
            is_paid=False,
            amount__gt=0
        ).values('month').annotate(
            total_pending=Sum(F('amount') - F('paid_amount'))
        )
        pending_map = {item['month']: float(item['total_pending']) for item in pending_qs}

        chart_data = []
        for i in range(12):
            m_num = (start_month_num + i - 1) % 12 + 1
            month_name = [name for name, num in MONTH_MAP.items() if num == m_num][0]
            
            # Determine calendar year for this month in the cycle
            if start_month_num > 1 and m_num < start_month_num:
                cur_year = start_year_val + 1
            else:
                cur_year = start_year_val

            stat = MonthlyCollection.objects.filter(month=m_num, year=cur_year, academic_year=academic_year).first()
            coll = stat.total_amount if stat and is_started else 0
            
            month_year_label = get_month_year(month_name, academic_year, year_start_month)

            chart_data.append({
                'name': month_year_label,
                'short_name': month_name[:3],
                'collection': float(coll),
                'pending': float(pending_map.get(month_name, 0.0)) if is_started else 0.0,
                'color': '#0066cc' if i % 2 == 0 else '#10b981'
            })
            
        # Calculate total collection for the entire academic year
        year_collection = MonthlyCollection.objects.filter(academic_year=academic_year).aggregate(total=Sum('total_amount'))['total'] or 0
        
        return Response({
            'total_students': total_students,
            'today_collection': float(today_collection),
            'month_collection': float(month_collection),
            'year_collection': float(year_collection),
            'pending_amount': float(pending_amount),
            'pending_student_count': pending_student_count,
            'today_receipt_count': today_receipt_count,
            'recent_transactions': recent_data,
            'chart_data': chart_data
        })

class DateWiseCollectionAPIView(APIView):
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        student_class = request.query_params.get('student_class') or request.query_params.get('class')
        division = request.query_params.get('division')
        fee_type = request.query_params.get('fee_type')
        search = request.query_params.get('search')
        
        receipts = Receipt.objects.prefetch_related('items', 'items__fee_category').select_related('student', 'payment_status').all()
        
        if academic_year:
            receipts = receipts.filter(academic_year=academic_year)
        
        if start_date:
            receipts = receipts.filter(date__gte=start_date)
        if end_date:
            receipts = receipts.filter(date__lte=end_date)
        if student_class:
            receipts = receipts.filter(student__student_class=student_class)
        elif request.query_params.get('student_class'): # Frontend uses student_class
            receipts = receipts.filter(student__student_class=request.query_params.get('student_class'))
            
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
        academic_year = request.query_params.get('academic_year')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        student_class = request.query_params.get('student_class') or request.query_params.get('class')
        division = request.query_params.get('division')
        search = request.query_params.get('search')
        
        items = ReceiptItem.objects.filter(
            receipt__is_deleted=False,
            receipt__payment_status__name__in=['Paid', 'Partial']
        )
        
        if academic_year:
            items = items.filter(receipt__academic_year=academic_year)
        
        if start_date:
            items = items.filter(receipt__date__gte=start_date)
        if end_date:
            items = items.filter(receipt__date__lte=end_date)
        if student_class:
            items = items.filter(receipt__student__student_class=student_class)
        if division:
            items = items.filter(receipt__student__division=division)
        if search:
            items = items.filter(
                Q(receipt__student__name__icontains=search) | 
                Q(receipt__student__admission_no__icontains=search)
            )

        report = items.values('fee_category__name').annotate(
            total_students=Count('receipt__student', distinct=True),
            total_amount=Sum('amount')
        )
        data = [{
            'fee_type': item['fee_category__name'],
            'name': item['fee_category__name'],
            'total_students': item['total_students'],
            'total_amount': float(item['total_amount'] or 0)
        } for item in report]
        return Response(data)

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
            
        academic_year = request.query_params.get('academic_year')
        receipt_filter = Q(student=student)
        if academic_year:
            receipt_filter &= Q(academic_year=academic_year)
            
        receipts = Receipt.objects.filter(receipt_filter).prefetch_related('items', 'items__fee_category').select_related('payment_status').order_by('-date')
        
        # Get pending fees up to today (Strictly bounded by academic year and start month)
        due_months = get_due_months(academic_year or '2024-25', student.starting_month)
            
        pending_mappings = StudentFeeMapping.objects.filter(
            student=student,
            is_paid=False,
            month__in=due_months,
            academic_year=academic_year or '2024-25',
            amount__gt=0
        )
        # Order pending months circularlly based on student's start month
        start_month_num = MONTH_MAP.get(student.starting_month, 4)
        def month_sort_key(m_name):
            m_num = MONTH_MAP.get(m_name, 1)
            return (m_num - start_month_num) % 12

        pending_months = list(set(pending_mappings.values_list('month', flat=True)))
        pending_months.sort(key=month_sort_key)
        
        cca_activities = [cca.name for cca in student.cca_activities.all()]
        
        history = [{
            'receipt_no': r.receipt_no,
            'date': r.date.isoformat(),
            'fee_type': r.items.first().fee_category.name if r.items.exists() else 'N/A',
            'amount': r.total_amount,
            'month': get_month_year(r.items.first().month, academic_year or '2024-25', student.starting_month) if r.items.exists() else 'N/A',
            'status': r.payment_status.name if r.payment_status else 'N/A',
        } for r in receipts]
        
        return Response({
            'student_name': student.name,
            'admission_no': student.admission_no,
            'class': student.student_class,
            'division': student.division,
            'pending_months': [get_month_year(m, academic_year or '2024-25', student.starting_month) for m in pending_months],
            'cca_activities': cca_activities,
            'history': history,
        })

class ClassWiseReportAPIView(APIView):
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        student_class = request.query_params.get('student_class') or request.query_params.get('class')
        division = request.query_params.get('division')
        fee_type = request.query_params.get('fee_type')
        search = request.query_params.get('search')
        
        # Student filter
        s_filter = Q()
        if student_class:
            s_filter &= Q(student_class=student_class)
        if division:
            s_filter &= Q(division=division)
        if search:
            s_filter &= Q(name__icontains=search) | Q(admission_no__icontains=search)
            
        students_queryset = Student.objects.filter(s_filter)
        
        # 1. Collection (ReceiptItem) - Filtered by date range
        ri_filter = Q(
            receipt__is_deleted=False,
            receipt__academic_year=academic_year, 
            receipt__payment_status__name__in=['Paid', 'Partial']
        )
        if start_date: ri_filter &= Q(receipt__date__gte=start_date)
        if end_date: ri_filter &= Q(receipt__date__lte=end_date)
        if fee_type: ri_filter &= Q(fee_category_id=fee_type)
        if s_filter: ri_filter &= Q(receipt__student__in=students_queryset)
        
        collection_data = ReceiptItem.objects.filter(ri_filter).values('receipt__student__student_class').annotate(
            total_paid=Sum('amount')
        )
        collection_map = {item['receipt__student__student_class']: float(item['total_paid'] or 0) for item in collection_data}
        
        # 2. Paid Count (Mappings)
        # We count mappings for the academic year that are is_paid=True.
        # If date range is provided, we filter for mappings that have a receipt item in that range.
        m_paid_filter = Q(academic_year=academic_year, is_paid=True)
        if fee_type: m_paid_filter &= Q(fee_category_id=fee_type)
        if s_filter: m_paid_filter &= Q(student__in=students_queryset)
        
        if start_date or end_date:
            # This is slightly complex. We look for mappings that have a receipt item within the range.
            # Since mapping_id isn't in ReceiptItem, we match on student, category, month.
            p_ids = ReceiptItem.objects.filter(ri_filter).values_list('receipt__student', 'fee_category', 'month')
            # Filter the count based on these triples.
            # actually, simpler to just count distinct (student, fee_cat, month) in ReceiptItem.
            paid_data = ReceiptItem.objects.filter(ri_filter).values('receipt__student__student_class').annotate(
                count=Count('month', distinct=True) # This is a bit of an approximation but should work if each class has few overlaps
            )
            # Better:
            paid_data = ReceiptItem.objects.filter(ri_filter).values('receipt__student__student_class').annotate(
                count=Count(Concat('receipt__student', Value('-'), 'fee_category', Value('-'), 'month'), distinct=True)
            )
        else:
            paid_data = StudentFeeMapping.objects.filter(m_paid_filter).values('student__student_class').annotate(
                count=Count('id')
            )
        
        paid_map = {item['receipt__student__student_class'] if 'receipt__student__student_class' in item else item['student__student_class']: item['count'] for item in paid_data}
        
        # 3. Unpaid Count (Mappings) - Only for due months
        # Get due months for the year's default (or first student's) start month
        year_start_month = students_queryset.first().starting_month if students_queryset.exists() else 'April'
        due_months = get_due_months(academic_year, year_start_month)
        
        m_unpaid_filter = Q(academic_year=academic_year, is_paid=False, month__in=due_months, amount__gt=0)
        if fee_type: m_unpaid_filter &= Q(fee_category_id=fee_type)
        if s_filter: m_unpaid_filter &= Q(student__in=students_queryset)
        
        unpaid_data = StudentFeeMapping.objects.filter(m_unpaid_filter).values('student__student_class').annotate(
            count=Count('id')
        )
        unpaid_map = {item['student__student_class']: item['count'] for item in unpaid_data}
        
        # Merge all classes
        all_classes_set = set(list(collection_map.keys()) + list(paid_map.keys()) + list(unpaid_map.keys()))
        
        data = []
        import re
        for c in all_classes_set:
            if not c: continue
            data.append({
                'class': c,
                'paid_count': paid_map.get(c, 0),
                'unpaid_count': unpaid_map.get(c, 0),
                'total_paid': collection_map.get(c, 0)
            })
            
        # Natural sort
        data.sort(key=lambda x: int(re.sub(r'\D', '', x['class'])) if re.sub(r'\D', '', x['class']) else 0)
        
        return Response(data)

class MonthlySummaryAPIView(APIView):
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        student_class = request.query_params.get('student_class') or request.query_params.get('class')
        division = request.query_params.get('division')
        fee_type = request.query_params.get('fee_type')
        search = request.query_params.get('search')
        
        receipts = Receipt.objects.filter(payment_status__name__in=['Paid', 'Partial'])
        
        if academic_year:
            receipts = receipts.filter(academic_year=academic_year)
        
        if student_class:
            receipts = receipts.filter(student__student_class=student_class)
        if division:
            receipts = receipts.filter(student__division=division)
        if fee_type:
            receipts = receipts.filter(items__fee_category_id=fee_type)
        if search:
            receipts = receipts.filter(
                Q(student__name__icontains=search) | 
                Q(student__admission_no__icontains=search)
            )

        if not academic_year:
            academic_year = '2024-25'
            
        # Determine starting month for filtering
        year_students = Student.objects.filter(academic_year=academic_year)
        month_freq = year_students.values('starting_month').annotate(count=Count('starting_month')).order_by('-count')
        year_start_month = month_freq[0]['starting_month'] if month_freq.exists() else 'April'

        try:
            start_year_val = int(academic_year.split('-')[0])
        except (ValueError, IndexError):
            start_year_val = timezone.now().year
            
        start_month_num = MONTH_MAP.get(year_start_month, 4)
        ay_start_date = date(start_year_val, start_month_num, 1)
        today = timezone.now().date()
        is_started = today >= ay_start_date

        import calendar
        report = receipts.values('date__month').annotate(
            total_collection=Sum('total_amount')
        ).order_by('date__month')
        
        # Convert report to a dict for easy lookup
        collection_by_month_idx = {item['date__month']: float(item['total_collection'] or 0) for item in report}
        
        # Calculate pending per month
        from django.db.models import F
        pending_qs = StudentFeeMapping.objects.filter(
            academic_year=academic_year,
            is_paid=False,
            amount__gt=0
        ).values('month').annotate(
            total_pending=Sum(F('amount') - F('paid_amount'))
        )
        pending_map = {item['month']: float(item['total_pending']) for item in pending_qs}

        data = []
        for i in range(12):
            m_num = (start_month_num + i - 1) % 12 + 1
            month_name = [name for name, num in MONTH_MAP.items() if num == m_num][0]
            
            cur_year = start_year_val if m_num >= start_month_num or start_month_num == 1 else start_year_val + 1
            
            data.append({
                'month': get_month_year(month_name, academic_year, year_start_month),
                'total_collection': collection_by_month_idx.get(m_num, 0.0) if is_started else 0.0,
                'total_pending': float(pending_map.get(month_name, 0.0)) if is_started else 0.0
            })
            
        return Response(data)

class PendingReportAPIView(APIView):
    def get(self, request):
        academic_year = request.query_params.get('academic_year', '2024-25')
        class_name = request.query_params.get('student_class') or request.query_params.get('class')
        today = timezone.now().date()
        # Filter months strictly based on academic year and start month
        year_students = Student.objects.filter(academic_year=academic_year)
        if class_name:
            year_students = year_students.filter(student_class=class_name)
        
        month_freq = year_students.values('starting_month').annotate(count=Count('starting_month')).order_by('-count')
        year_start_month = month_freq[0]['starting_month'] if month_freq.exists() else 'April'
        due_months = get_due_months(academic_year, year_start_month)

        if not class_name:
            # Return class-wise grouping of pending students (only for due months)
            mappings = StudentFeeMapping.objects.filter(
                is_paid=False,
                month__in=due_months,
                academic_year=academic_year,
                amount__gt=0
            )
            
            fee_type = request.query_params.get('fee_type')
            division = request.query_params.get('division')
            search = request.query_params.get('search')
            
            if fee_type:
                mappings = mappings.filter(fee_category_id=fee_type)
            if division:
                mappings = mappings.filter(student__division=division)
            if search:
                mappings = mappings.filter(
                    Q(student__name__icontains=search) | 
                    Q(student__admission_no__icontains=search)
                )

            report = mappings.values('student__student_class').annotate(
                unpaid_count=Count('student', distinct=True)
            )
            data = [{
                'class': item['student__student_class'],
                'unpaid_count': item['unpaid_count']
            } for item in report if item['student__student_class']]
            
            # Numeric sorting
            import re
            data.sort(key=lambda x: int(re.sub(r'\D', '', x['class'])) if re.sub(r'\D', '', x['class']) else 0)
            
            return Response(data)
        else:
            # Return pending student list for a specific class based on Fee Mappings (only for due months)
            pending_mappings = StudentFeeMapping.objects.filter(
                is_paid=False, 
                student__student_class=class_name,
                month__in=due_months,
                academic_year=academic_year,
                amount__gt=0
            ).select_related('student', 'fee_category')
            
            fee_type = request.query_params.get('fee_type')
            division = request.query_params.get('division')
            search = request.query_params.get('search')
            
            if fee_type:
                pending_mappings = pending_mappings.filter(fee_category_id=fee_type)
            if division:
                pending_mappings = pending_mappings.filter(student__division=division)
            if search:
                pending_mappings = pending_mappings.filter(
                    Q(student__name__icontains=search) | 
                    Q(student__admission_no__icontains=search)
                )
            
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
                    students_dict[m.student.id]['pending_months'].add(get_month_year(m.month, academic_year, m.student.starting_month))
            
            # Format output and exclude students with 0 pending amount
            data = []
            for student_id, details in students_dict.items():
                if details['pending_amount'] < 0.01:
                    continue
                details['pending_amount'] = float(details['pending_amount'])
                
                # Sort pending months circularlly based on class's start month
                start_month_num = MONTH_MAP.get(year_start_month, 4)
                def month_sort_key(my_str):
                    m_name = my_str.split(' ')[0]
                    m_num = MONTH_MAP.get(m_name, 1)
                    return (m_num - start_month_num) % 12

                details['pending_months'] = sorted(list(details['pending_months']), key=month_sort_key)
                data.append(details)
                
            return Response(data)

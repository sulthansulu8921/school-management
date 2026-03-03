MONTHS_ORDER = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]

MONTH_MAP = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
}

def get_month_year(month_name, academic_year, starting_month='April'):
    """
    Returns 'Month Year' string (e.g. 'April 2024' or 'January 2025')
    based on the academic year (e.g. '2024-25') and the starting month.
    """
    if not month_name or not academic_year:
        return month_name or ""
        
    try:
        parts = academic_year.split('-')
        start_year = int(parts[0])
        
        m_num = MONTH_MAP.get(month_name)
        s_num = MONTH_MAP.get(starting_month, 4)
        
        if not m_num:
            return month_name
            
        # If month number is less than starting month number, 
        # it belongs to the second calendar year of the academic cycle.
        # e.g. Start June (6), month is Jan (1). 1 < 6 is True -> Year 2026.
        # e.g. Start April (4), month is Jan (1). 1 < 4 is True -> Year 2026.
        # e.g. Start April (4), month is May (5). 5 < 4 is False -> Year 2025.
        
        if s_num == 1: # If cycle is Jan-Dec, year is always start_year
            year = start_year
        elif m_num < s_num:
            year = start_year + 1
        else:
            year = start_year
            
        return f"{month_name} {year}"
    except (ValueError, IndexError, AttributeError):
        return month_name

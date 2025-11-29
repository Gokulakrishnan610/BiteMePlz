"""
Utility functions for logging student activities
"""
from .models import StudentLog


def log_student_activity(user, action, description=None, shop=None, order=None, product=None, metadata=None, request=None):
    """
    Log a student/staff activity
    
    Args:
        user: User instance (must be a student or staff)
        action: Action type (from StudentLog.ACTION_CHOICES)
        description: Optional description
        shop: Optional Shop instance
        order: Optional Order instance
        product: Optional Product instance
        metadata: Optional dict with additional data
        request: Optional HTTP request object to extract IP and user agent
    """
    # Only log for students and staff (not admins or shop admins)
    if user.role not in ['student', 'staff']:
        return None
    
    ip_address = None
    user_agent = None
    
    if request:
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Get user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    log = StudentLog.objects.create(
        user=user,
        action=action,
        description=description,
        shop=shop,
        order=order,
        product=product,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return log

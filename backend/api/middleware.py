from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse

class CustomCORSMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Always set CORS headers for API endpoints
        if request.path.startswith('/api/'):
            origin = request.META.get('HTTP_ORIGIN')
            if origin:
                # Check if origin is in allowed origins
                allowed_origins = [
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:3000",
                    "https://kisokrec.onrender.com",
                    "https://rec-kiosk-1.onrender.com",
                    "https://super-conkies-906020.netlify.app",
                ]
                
                # Check regex patterns
                import re
                regex_patterns = [
                    r"^https?://localhost:\d+$",
                    r"^https?://rec-kiosk-1\.onrender\.com$",
                    r"^https?://.*\.netlify\.app$",
                ]
                
                is_allowed = origin in allowed_origins
                if not is_allowed:
                    for pattern in regex_patterns:
                        if re.match(pattern, origin):
                            is_allowed = True
                            break
                
                if is_allowed:
                    response['Access-Control-Allow-Origin'] = origin
                    response['Access-Control-Allow-Credentials'] = 'true'
                    response['Access-Control-Allow-Methods'] = 'DELETE, GET, OPTIONS, PATCH, POST, PUT'
                    response['Access-Control-Allow-Headers'] = 'accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, x-parent-session-id, X-Parent-Session-ID, cache-control, pragma'
                    response['Access-Control-Expose-Headers'] = 'x-parent-session-id, X-Parent-Session-ID, content-type, content-length'
                    response['Access-Control-Max-Age'] = '86400'
        
        return response
    
    def process_request(self, request):
        # Handle preflight OPTIONS request
        if request.method == 'OPTIONS':
            response = HttpResponse()
            origin = request.META.get('HTTP_ORIGIN')
            if origin:
                # Check if origin is allowed (same logic as above)
                allowed_origins = [
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:3000",
                    "https://kisokrec.onrender.com",
                    "https://rec-kiosk-1.onrender.com",
                    "https://super-conkies-906020.netlify.app",
                ]
                
                import re
                regex_patterns = [
                    r"^https?://localhost:\d+$",
                    r"^https?://rec-kiosk-1\.onrender\.com$",
                    r"^https?://.*\.netlify\.app$",
                ]
                
                is_allowed = origin in allowed_origins
                if not is_allowed:
                    for pattern in regex_patterns:
                        if re.match(pattern, origin):
                            is_allowed = True
                            break
                
                if is_allowed:
                    response['Access-Control-Allow-Origin'] = origin
                    response['Access-Control-Allow-Credentials'] = 'true'
                    response['Access-Control-Allow-Methods'] = 'DELETE, GET, OPTIONS, PATCH, POST, PUT'
                    response['Access-Control-Allow-Headers'] = 'accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, x-parent-session-id, X-Parent-Session-ID, cache-control, pragma'
                    response['Access-Control-Max-Age'] = '86400'
                    return response
        
        return None

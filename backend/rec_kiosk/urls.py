from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views.static import serve
import os

@csrf_exempt
@require_http_methods(["OPTIONS"])
def cors_preflight(request):
    response = HttpResponse()
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "DELETE, GET, OPTIONS, PATCH, POST, PUT"
    response["Access-Control-Allow-Headers"] = "accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, x-parent-session-id, X-Parent-Session-ID, cache-control, pragma"
    response["Access-Control-Allow-Credentials"] = "true"
    response["Access-Control-Max-Age"] = "86400"
    return response

# Custom media serving with better error handling
def custom_media_serve(request, path):
    try:
        return serve(request, path, document_root=settings.MEDIA_ROOT)
    except Http404:
        # Return a proper 404 response instead of 503
        return HttpResponse("Media file not found", status=404)
    except Exception as e:
        # Log the error and return 500 instead of 503
        print(f"Media serving error: {e}")
        return HttpResponse("Internal server error", status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('cors-preflight/', cors_preflight, name='cors_preflight'),
    # Custom media serving for better error handling
    path('media/<path:path>', custom_media_serve, name='media'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 
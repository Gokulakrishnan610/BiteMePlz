import os
from pathlib import Path
from decouple import config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY
SECRET_KEY = config('SECRET_KEY', default='django-insecure-your-secret-key-here')
DEBUG = config('DEBUG', default=False, cast=bool)

# Render dynamically assigns host
ALLOWED_HOSTS = [
    "kisokrec.onrender.com", "kioskrec.onrender.com", "kisok-e3w0.onrender.com",
    "rec-kiosk-1.onrender.com", "rec-kiosk.onrender.com",
    "rec-kiosk-api-31875.azurewebsites.net",
    "rec-kiosk-web-15852.azurewebsites.net",
    "foodapp.gokulakrishnank.in",
    "foodappbackend.gokulakrishnank.in",
    "localhost", "127.0.0.1",
]


# Apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_extensions',
    'api',
    'startup.apps.StartupConfig',
    'django_celery_beat',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'api.middleware.CustomCORSMiddleware',  # Enable custom CORS middleware
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # For serving static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'rec_kiosk.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Use ASGI if channels installed
try:
    import channels
    INSTALLED_APPS += ['channels']
    ASGI_APPLICATION = 'rec_kiosk.asgi.application'
    
    # Channel Layers Configuration
    if DEBUG:
        # Development: in-memory channel layer
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer',
            },
        }
        print("DEBUG: Using in-memory channel layer for development")
    else:
        # Production: Redis channel layer (for Render)
        try:
            import redis
            CHANNEL_LAYERS = {
                'default': {
                    'BACKEND': 'channels_redis.core.RedisChannelLayer',
                    'CONFIG': {
                    'hosts': [config('REDIS_URL', default='rediss://default:ARv5AAImcDFkNGUyYzI4OTMxMjc0YjhkOTk0ZGU3N2ZkMjI1Y2Y2YXAxNzE2MQ@immortal-mutt-7161.upstash.io:6379')],                    },
                },
            }
            print("DEBUG: Using Redis channel layer for production")
        except Exception as redis_error:
            print(f"DEBUG: Redis not available, falling back to in-memory: {redis_error}")
            CHANNEL_LAYERS = {
                'default': {
                    'BACKEND': 'channels.layers.InMemoryChannelLayer',
                },
            }
        
except Exception as channels_error:
    print(f"DEBUG: Channels not available: {channels_error}")
    WSGI_APPLICATION = 'rec_kiosk.wsgi.application'

# Database: Use DATABASE_URL if set, otherwise individual DB_* vars, otherwise SQLite
import os
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    ssl_require = os.environ.get('DB_SSL', 'true').lower() in ('1', 'true', 'yes')
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=ssl_require)}
elif os.environ.get('DB_HOST'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'reckioskdb'),
            'USER': os.environ.get('DB_USER', 'pgadmin'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', ''),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {'sslmode': os.environ.get('DB_SSLMODE', 'require')},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

APPEND_SLASH = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Azure Blob Storage for media files
AZURE_STORAGE_CONNECTION_STRING = os.environ.get('AZURE_STORAGE_CONNECTION_STRING', '')
AZURE_STORAGE_CONTAINER = os.environ.get('AZURE_STORAGE_CONTAINER', 'media')

if AZURE_STORAGE_CONNECTION_STRING:
    DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
    AZURE_CONNECTION_STRING = AZURE_STORAGE_CONNECTION_STRING
    AZURE_CONTAINER = AZURE_STORAGE_CONTAINER
    AZURE_OVERWRITE_FILES = False
    MEDIA_URL = f'https://{os.environ.get("AZURE_STORAGE_ACCOUNT_NAME", "")}.blob.core.windows.net/{AZURE_STORAGE_CONTAINER}/'
else:
    # Local/fallback: create media directories
    if not DEBUG:
        os.makedirs(os.path.join(MEDIA_ROOT, 'uploads'), exist_ok=True)
        os.makedirs(os.path.join(MEDIA_ROOT, 'shops'), exist_ok=True)
        os.makedirs(os.path.join(MEDIA_ROOT, 'products'), exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'api.User'

# CSRF
# Include all deployment and development origins that are allowed to make POST requests
CSRF_TRUSTED_ORIGINS = [
    "https://rec-kiosk.onrender.com",
    "https://rec-kiosk-1.onrender.com",
    "https://kisokrec.onrender.com",
    "https://kioskrec25.netlify.app",
    "https://kisok.ghasa.xyz",
    "https://rec-kiosk-web-15852.azurewebsites.net",
    "https://rec-kiosk-api-31875.azurewebsites.net",
    "https://foodapp.gokulakrishnank.in",
    "https://foodappbackend.gokulakrishnank.in",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'api.authentication.ParentSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'UNAUTHENTICATED_USER': None,
}

# CORS Configuration - Completely open for debugging
CORS_ALLOW_ALL_ORIGINS = True
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with", "x-parent-session-id", 
    "X-Parent-Session-ID", "cache-control", "pragma", "*"
]

# Specific allowed origins including Netlify
CORS_ALLOWED_ORIGINS = [
    "https://kioskrec25.netlify.app",
    "https://super-conkies-906020.netlify.app",
    "https://kisok.ghasa.xyz",
    "https://rec-kiosk-web-15852.azurewebsites.net",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Force CORS to be completely open
CORS_ORIGIN_WHITELIST = []
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_ALL_ORIGINS = True

# Debug CORS issues
if DEBUG:
    CORS_ORIGIN_ALLOW_ALL = True
    CORS_ALLOW_ALL_ORIGINS = True
    print("DEBUG: CORS_ORIGIN_ALLOW_ALL set to True for debugging")
    print("DEBUG: CORS_ALLOW_ALL_ORIGINS set to True for debugging")

# Force CORS headers in all cases
CORS_URLS_REGEX = r'^.*$'
CORS_PREFLIGHT_MAX_AGE = 86400

# JWT
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('JWT_SECRET', default='your-jwt-secret'),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# File upload
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
# Email Configuration - Read from .env
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp-relay.brevo.com')
EMAIL_PORT = config('EMAIL_PORT', cast=int, default=587)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool, default=True)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', cast=bool, default=False)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='asivasabariganesan@gmail.com')
SERVER_EMAIL = config('SERVER_EMAIL', default=DEFAULT_FROM_EMAIL)

# Brevo API Key (for HTTP API - works on Render free tier)
BREVO_API_KEY = config('BREVO_API_KEY', default=None)



# Razorpay
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')

# Celery
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

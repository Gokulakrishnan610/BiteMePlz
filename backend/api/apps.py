from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Import tasks lazily; avoid hard dependency on optional channels
        try:
            import api.tasks  # noqa: F401
        except Exception:
            pass
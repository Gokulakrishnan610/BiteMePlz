from rest_framework.authentication import BaseAuthentication
from django.contrib.auth.models import AnonymousUser


def validate_parent_session(session_id: str) -> bool:
    """Validate parent session ID (stub). Replace with Redis check in prod."""
    if not session_id:
        return False
    # TODO: Validate against Redis, e.g. redis_client.exists(f"parent_session:{session_id}")
    return True


def get_parent_session_id_from_request(request) -> str | None:
    """Extract parent session id from headers (supports both cases)."""
    return (
        request.META.get('HTTP_X_PARENT_SESSION_ID')
        or request.META.get('HTTP_x_parent_session_id')
    )


class ParentSessionAuthentication(BaseAuthentication):
    """Custom authentication for parent session IDs.
    Returns (AnonymousUser(), session_id) when a valid parent session is present.
    """

    def authenticate(self, request):
        parent_session_id = get_parent_session_id_from_request(request)
        if parent_session_id and validate_parent_session(parent_session_id):
            return (AnonymousUser(), parent_session_id)
        return None

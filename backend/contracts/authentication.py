from firebase_admin import auth as firebase_auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User


class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization")
        if not header or not header.startswith("Bearer "):
            return None

        token = header.split(" ")[1]
        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception:
            raise AuthenticationFailed("Invalid or expired token")

        firebase_uid = decoded["uid"]
        email = decoded.get("email", "")

        # Handles first login AND prior sync failures — checked on every login, not just signup
        user, _ = User.objects.get_or_create(
            firebase_uid=firebase_uid,
            defaults={"email": email, "username": email.split("@")[0]},
        )
        return (user, None)
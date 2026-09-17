from firebase_admin import auth as firebase_auth
from django.db import IntegrityError, transaction
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
            # clock_skew_seconds absorbs small drift between this machine's clock
            # and Firebase's servers, instead of failing verification outright
            decoded = firebase_auth.verify_id_token(token, clock_skew_seconds=30)
        except Exception as e:
            raise AuthenticationFailed(f"Invalid or expired token: {e}")

        firebase_uid = decoded["uid"]
        email = decoded.get("email", "")

        try:
            with transaction.atomic():
                user, _ = User.objects.get_or_create(
                    firebase_uid=firebase_uid,
                    defaults={"email": email, "username": email.split("@")[0]},
                )
        except IntegrityError:
            # A row already exists with this email but a different firebase_uid
            # (e.g. the Firebase account was deleted/recreated, or a different
            # Firebase project issued a new uid for the same email). Firebase is
            # the source of truth for identity, so repair the stale uid instead
            # of crashing the whole request.
            try:
                user = User.objects.get(email=email)
                user.firebase_uid = firebase_uid
                user.save(update_fields=["firebase_uid"])
            except User.DoesNotExist:
                raise AuthenticationFailed(
                    "Account conflict: email already registered under a different identity."
                )

        return (user, None)
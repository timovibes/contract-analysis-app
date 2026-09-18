from rest_framework.permissions import BasePermission


class IsApprovedUser(BasePermission):
    """
    Blocks any authenticated user whose account status is not "approved".

    IsAuthenticated only confirms a valid Firebase token was presented — it
    says nothing about whether an admin has approved the account. Without
    this check, a pending or rejected user can call the API directly
    (bypassing the frontend's ApprovalGate, which only guards UI routes)
    and get full access to contract upload/analysis endpoints.
    """

    message = "Your account is not approved to access this resource."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and getattr(user, "is_authenticated", False) and user.status == "approved")
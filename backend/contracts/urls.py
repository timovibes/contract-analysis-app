from django.urls import path
from .views import ContractListCreateView, ContractDetailView,ContractAnalysisView, MeView, AdminDeleteUserView

urlpatterns = [
    path("contracts", ContractListCreateView.as_view(), name="contract-list-create"),
    path("contracts/<int:pk>", ContractDetailView.as_view(), name="contract-detail"),
    path("contracts/<int:pk>/analysis", ContractAnalysisView.as_view(), name="contract-analysis"),
    path("me", MeView.as_view(), name="me"),
    path("admin/users/<int:pk>", AdminDeleteUserView.as_view(), name="admin-delete-user")
]
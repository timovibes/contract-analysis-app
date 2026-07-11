from django.urls import path
from .views import ContractListCreateView, ContractDetailView, ContractAnalysisView

urlpatterns = [
    path("contracts", ContractListCreateView.as_view(), name="contract-list-create"),
    path("contracts/<int:pk>", ContractDetailView.as_view(), name="contract-detail"),
    path("contracts/<int:pk>/analysis", ContractAnalysisView.as_view(), name="contract-analysis"),
]
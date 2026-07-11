from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Contract
from .serializers import ContractSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AnalysisResult


class ContractListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Contract.objects.filter(user=self.request.user).order_by("-uploaded_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status="pending")

class ContractDetailView(generics.RetrieveAPIView):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Contract.objects.filter(user=self.request.user)
    
class ContractAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        contract = Contract.objects.get(pk=pk, user=request.user)
        version = request.query_params.get("version")

        qs = contract.analysis_results.all()
        result = qs.get(version=version) if version else qs.order_by("-version").first()

        if not result:
            return Response({"detail": "No analysis yet"}, status=404)

        return Response({
            "version": result.version,
            "overall_risk_score": result.overall_risk_score,
            "non_compete": result.non_compete_json,
            "dates": result.dates_json,
            "liability": result.liability_json,
            "report_url": getattr(result.report, "file_url", None),
        })
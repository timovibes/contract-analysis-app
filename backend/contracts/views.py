from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Contract
from .serializers import ContractSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AnalysisResult
from .tasks import process_contract
from rest_framework.exceptions import PermissionDenied
from .models import User
from .serializers import UserSerializer
from firebase_admin import auth as firebase_auth
from django.utils import timezone
from .models import Report
from .services import delete_user_storage_files


class ContractListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Contract.objects.filter(user=self.request.user).order_by("-uploaded_at")

    def perform_create(self, serializer):
        contract = serializer.save(user=self.request.user, status="pending")
        process_contract.delay(contract.id)   # returns 202 immediately, worker picks it up

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

        report_url = None
        if hasattr(result, "report") and result.report.file_url:
            report_url = request.build_absolute_uri(result.report.file_url.url)

        return Response({
            "version": result.version,
            "overall_risk_score": result.overall_risk_score,
            "non_compete": result.non_compete_json,
            "dates": result.dates_json,
            "liability": result.liability_json,
            "report_url": report_url,
        })


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminDeleteUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != "admin":
            raise PermissionDenied("Admins only")

        target = User.objects.get(pk=pk)

        # Delete from Firebase Auth first
        firebase_auth.delete_user(target.firebase_uid)

        # Collect local file paths before the Postgres cascade wipes the rows
        storage_paths = [c.file_url.path for c in target.contracts.all() if c.file_url]
        report_paths = [
            r.file_url.path
            for r in Report.objects.filter(analysis_result__contract__user=target)
            if r.file_url
        ]

        target.delete()  # Postgres cascades: contracts, analysis_results, reports

        delete_user_storage_files(storage_paths + report_paths)

        print(f"[ADMIN LOG] {request.user.email} deleted user {target.email} at {timezone.now()}")

        return Response(status=204)


class ContractReprocessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        contract = Contract.objects.get(pk=pk, user=request.user)
        contract.status = "pending"
        contract.error_message = None
        contract.save()
        process_contract.delay(contract.id)
        return Response({"detail": "Reprocessing started"}, status=202)
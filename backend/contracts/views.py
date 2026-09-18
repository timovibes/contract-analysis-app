from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Avg, Max
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
from .permissions import IsApprovedUser


class ContractListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedUser]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Contract.objects.filter(user=self.request.user).order_by("-uploaded_at")

    def perform_create(self, serializer):
        contract = serializer.save(user=self.request.user, status="pending")
        process_contract.delay(contract.id)   # returns 202 immediately, worker picks it up

class ContractDetailView(generics.RetrieveAPIView):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedUser]

    def get_queryset(self):
        return Contract.objects.filter(user=self.request.user)
    
class ContractAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsApprovedUser]

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
            "filename": contract.filename,
            "overall_risk_score": result.overall_risk_score,
            "non_compete": result.non_compete_json,
            "dates": result.dates_json,
            "liability": result.liability_json,
            "termination": result.termination_json,
            "indemnification": result.indemnification_json,
            "governing_law": result.governing_law_json,
            "auto_renewal": result.auto_renewal_json,
            "red_flags": result.red_flags_json,
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
    permission_classes = [permissions.IsAuthenticated, IsApprovedUser]

    def post(self, request, pk):
        contract = Contract.objects.get(pk=pk, user=request.user)
        contract.status = "pending"
        contract.error_message = None
        contract.save()
        process_contract.delay(contract.id)
        return Response({"detail": "Reprocessing started"}, status=202)


class PendingUsersView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "admin":
            raise PermissionDenied("Admins only")
        return User.objects.filter(status="pending").order_by("-created_at")


class ApproveUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "admin":
            raise PermissionDenied("Admins only")

        target = User.objects.get(pk=pk)
        target.status = "approved"
        target.save()

        return Response(UserSerializer(target).data)


class RejectUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "admin":
            raise PermissionDenied("Admins only")

        target = User.objects.get(pk=pk)
        target.status = "rejected"
        target.save()

        return Response(UserSerializer(target).data)


class AnalyticsSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsApprovedUser]

    def get(self, request):
        # Latest analysis result per contract only — a re-run shouldn't count
        # the same contract twice in aggregate stats.
        latest_versions = (
            AnalysisResult.objects.filter(contract__user=request.user)
            .values("contract_id")
            .annotate(max_version=Max("version"))
        )
        latest_result_ids = [
            AnalysisResult.objects.filter(
                contract_id=row["contract_id"], version=row["max_version"]
            ).values_list("id", flat=True).first()
            for row in latest_versions
        ]
        results = AnalysisResult.objects.filter(id__in=latest_result_ids).order_by("created_at")

        total = results.count()
        if total == 0:
            return Response({
                "total_analyzed": 0,
                "average_risk_score": None,
                "risk_distribution": {"low": 0, "medium": 0, "high": 0},
                "clause_presence": {},
                "risk_trend": [],
            })

        avg_risk = results.aggregate(avg=Avg("overall_risk_score"))["avg"]

        risk_distribution = {
            "low": results.filter(overall_risk_score__lt=40).count(),
            "medium": results.filter(overall_risk_score__gte=40, overall_risk_score__lt=70).count(),
            "high": results.filter(overall_risk_score__gte=70).count(),
        }

        non_compete_present = sum(1 for r in results if r.non_compete_json.get("present"))
        indemnification_present = sum(1 for r in results if r.indemnification_json.get("present"))
        auto_renewal_present = sum(1 for r in results if r.auto_renewal_json.get("present"))
        liability_cap_present = sum(1 for r in results if r.liability_json.get("cap_present"))

        clause_presence = {
            "non_compete": round(100 * non_compete_present / total, 1),
            "indemnification": round(100 * indemnification_present / total, 1),
            "auto_renewal": round(100 * auto_renewal_present / total, 1),
            "liability_cap": round(100 * liability_cap_present / total, 1),
        }

        risk_trend = [
            {
                "contract_filename": r.contract.filename,
                "date": r.created_at.isoformat(),
                "risk_score": r.overall_risk_score,
            }
            for r in results
        ]

        return Response({
            "total_analyzed": total,
            "average_risk_score": round(avg_risk, 1),
            "risk_distribution": risk_distribution,
            "clause_presence": clause_presence,
            "risk_trend": risk_trend,
        })
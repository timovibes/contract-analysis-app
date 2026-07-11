from rest_framework import serializers
from .models import Contract, AnalysisResult, Report


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = ["id", "filename", "file_url", "status", "error_message", "uploaded_at", "updated_at"]
        read_only_fields = ["id", "status", "error_message", "uploaded_at", "updated_at"]
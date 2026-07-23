from rest_framework import serializers
from .models import Contract, AnalysisResult, Report
from .models import User


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = ["id", "filename", "file_url", "status", "error_message", "uploaded_at", "updated_at"]
        read_only_fields = ["id", "status", "error_message", "uploaded_at", "updated_at"]

class UserSerializer(serializers.ModelSerializer):
    contracts_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "username", "display_name", "title", "role", "status", "created_at", "contracts_count"]
        read_only_fields = ["id", "email", "role", "status", "created_at", "contracts_count"]

    def get_contracts_count(self, obj):
        return obj.contracts.count()
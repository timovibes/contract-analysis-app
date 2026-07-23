from django.db import models


class User(models.Model):
    firebase_uid = models.CharField(max_length=128, unique=True)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    display_name = models.CharField(max_length=150, blank=True)
    title = models.CharField(max_length=100, blank=True)  # "Advocate", "Paralegal", etc.
    role = models.CharField(max_length=20, default="user")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_authenticated = True
    is_anonymous = False

    def __str__(self):
        return self.email


class Contract(models.Model):
    STATUS_CHOICES = [
        ("pending", "pending"),
        ("processing", "processing"),
        ("completed", "completed"),
        ("failed", "failed"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contracts")
    filename = models.CharField(max_length=255)
    file_url = models.FileField(upload_to="contracts/", max_length=500)  # local disk, dupes allowed in v1
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.filename


class AnalysisResult(models.Model):
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="analysis_results")
    version = models.IntegerField()  # increments on re-run, never overwritten
    non_compete_json = models.JSONField()
    dates_json = models.JSONField()
    liability_json = models.JSONField()
    overall_risk_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]


class Report(models.Model):
    analysis_result = models.OneToOneField(AnalysisResult, on_delete=models.CASCADE, related_name="report")
    file_url = models.FileField(upload_to="reports/", max_length=500)  # generated PDF, local disk
    generated_at = models.DateTimeField(auto_now_add=True)
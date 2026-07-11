from celery import shared_task
from django.core.files.base import ContentFile
from .models import Contract, AnalysisResult, Report
from .services import extract_text, call_gemini, generate_pdf


@shared_task
def process_contract(contract_id):
    contract = Contract.objects.get(id=contract_id)
    contract.status = "processing"
    contract.save()

    try:
        text = extract_text(contract.file_url)
        analysis = call_gemini(text)  # returns non_compete, dates, liability, risk_score
    except Exception as e:
        contract.status = "failed"
        contract.error_message = str(e)
        contract.save()
        return

    last_version = contract.analysis_results.order_by("-version").first()
    next_version = (last_version.version + 1) if last_version else 1

    result = AnalysisResult.objects.create(
        contract=contract,
        version=next_version,
        non_compete_json=analysis["non_compete"],
        dates_json=analysis["dates"],
        liability_json=analysis["liability"],
        overall_risk_score=analysis["risk_score"],
    )

    pdf_bytes = generate_pdf(result)
    report = Report(analysis_result=result)
    report.file_url.save(f"{contract.id}_v{next_version}.pdf", ContentFile(pdf_bytes), save=True)

    contract.status = "completed"
    contract.save()
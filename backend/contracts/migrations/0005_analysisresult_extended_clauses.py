# Generated manually for expanded clause analysis (termination, indemnification, governing law, auto-renewal, red flags)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0004_remove_user_is_approved_user_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisresult',
            name='termination_json',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='analysisresult',
            name='indemnification_json',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='analysisresult',
            name='governing_law_json',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='analysisresult',
            name='auto_renewal_json',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='analysisresult',
            name='red_flags_json',
            field=models.JSONField(default=list),
        ),
    ]
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lessons', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='lesson',
            name='is_processing',
            field=models.BooleanField(default=False, help_text='True if video analysis is currently running'),
        ),
    ]

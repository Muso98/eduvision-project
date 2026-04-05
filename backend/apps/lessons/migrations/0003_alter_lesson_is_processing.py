from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lessons', '0002_lesson_is_processing'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='is_processing',
            field=models.BooleanField(blank=True, default=False, help_text='True if video analysis is currently running', null=True),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_studentlog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shop',
            name='image',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_user_is_sub_admin_user_parent_admin'),
    ]

    operations = [
        migrations.AddField(
            model_name='shop',
            name='disabled_categories',
            field=models.JSONField(default=list),
        ),
    ]



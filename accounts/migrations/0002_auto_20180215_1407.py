# -*- coding: utf-8 -*-
# Generated by Django 1.11.7 on 2018-02-15 20:07
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='user',
            old_name='active',
            new_name='is_active',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='admin',
            new_name='is_staff',
        ),
        migrations.RemoveField(
            model_name='user',
            name='staff',
        ),
        migrations.AlterField(
            model_name='user',
            name='is_superuser',
            field=models.BooleanField(default=False),
        ),
    ]

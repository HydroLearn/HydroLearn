# -*- coding: utf-8 -*-
# Generated by Django 1.11.7 on 2018-11-08 16:54
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0003_auto_20181031_1609'),
    ]

    operations = [
        migrations.AddField(
            model_name='learning_objective',
            name='changed_by',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='changed_learning_objectives', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='learning_objective',
            name='changed_date',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='learning_objective',
            name='created_by',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='created_learning_objectives', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='learning_objective',
            name='creation_date',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='learning_objective',
            name='condition',
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name='learning_objective',
            name='degree',
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name='learning_objective',
            name='task',
            field=models.TextField(),
        ),
    ]

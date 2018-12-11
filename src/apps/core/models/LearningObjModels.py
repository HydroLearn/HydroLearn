from django.db import models
from src.apps.core.models.CreationTrackingModels import CreationTrackingBaseModel

class Learning_Level(models.Model):
    label = models.CharField(max_length=64)
    definition = models.CharField(max_length=256)

class Learning_Verb(models.Model):
    verb = models.CharField(max_length=64)
    level = models.ForeignKey(Learning_Level)

class Learning_Outcome(models.Model):
    outcome = models.CharField(max_length=256)

class Learning_Objective(CreationTrackingBaseModel):
    condition = models.TextField()
    task = models.TextField()
    degree = models.TextField()
    verb = models.ForeignKey(Learning_Verb)
    outcomes = models.ManyToManyField(Learning_Outcome, blank=True)

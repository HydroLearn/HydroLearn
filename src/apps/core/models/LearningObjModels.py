from django.db import models
from .CreationTrackingModels import CreationTrackingBaseModel
from .ModuleModels import Lesson

class Learning_Level(models.Model):
    label = models.CharField(max_length=64)
    definition = models.CharField(max_length=256)

class Learning_Verb(models.Model):
    verb = models.CharField(max_length=64)
    level = models.ForeignKey(Learning_Level)

class Learning_Outcome(models.Model):
    outcome = models.CharField(max_length=256)

class Learning_Objective(CreationTrackingBaseModel):
    lesson = models.ForeignKey(Lesson)
    condition = models.TextField()
    task = models.TextField()
    degree = models.TextField()
    verb = models.ForeignKey(Learning_Verb)
    outcomes = models.ManyToManyField(Learning_Outcome, blank=True)

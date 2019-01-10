from django.db import models
from .CreationTrackingModels import CreationTrackingBaseModel


class Learning_Level(models.Model):
    label = models.CharField(max_length=64)
    definition = models.CharField(max_length=256)

class Learning_Verb(models.Model):
    verb = models.CharField(max_length=64)
    level = models.ForeignKey(
        'core.Learning_Level',
        related_name='verbs'
    )

    default = models.BooleanField(default=False)

class Learning_Outcome(models.Model):
    outcome = models.CharField(max_length=256)

class Learning_Objective(CreationTrackingBaseModel):

    condition = models.TextField()
    task = models.TextField()
    degree = models.TextField()

    lesson = models.ForeignKey(
        'core.Lesson',
        related_name='learning_objectives',
        on_delete=models.CASCADE
    )

    verb = models.ForeignKey(
            'core.Learning_Verb',
        )

    outcomes = models.ManyToManyField(
            'core.Learning_Outcome',
            blank=True
        )

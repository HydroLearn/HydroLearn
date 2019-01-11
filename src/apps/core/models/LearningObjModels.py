from django.db import models
from .CreationTrackingModels import CreationTrackingBaseModel


class Learning_Level(models.Model):
    label = models.CharField(max_length=64)
    definition = models.CharField(max_length=256)

class Learning_Verb(models.Model):
    verb = models.CharField(max_length=64)
    level = models.ForeignKey(
        'core.Learning_Level',
        related_name='verbs',
        blank=False,
        null=False,
        help_text="Specify the learning level for this verb."
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
        blank=False,
        null=False,
        help_text="Specify a lesson for this Learning Objective.",
        on_delete=models.CASCADE,
    )

    verb = models.ForeignKey(
            'core.Learning_Verb',
            blank=False,
            null=False,
            help_text="Specify a verb for this Learning Objective",

        )

    outcomes = models.ManyToManyField(
            'core.Learning_Outcome',
            blank=True,

        )

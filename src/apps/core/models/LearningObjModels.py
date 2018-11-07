from django.db import models
from django.forms import ModelForm
from src.apps.core.models.CreationTrackingModels import CreationTrackingBaseModel

class Learning_Level(models.Model):
    label = models.CharField(max_length=64)
    definition = models.CharField(max_length=256)

class Learing_LevelForm(ModelForm):
    class Meta:
        model = Learning_Level
        fields = ['label', 'definition']

class Learning_Verb(models.Model):
    verb = models.CharField(max_length=64)
    level = models.ForeignKey(Learning_Level)

class Learing_VerbForm(ModelForm):
    class Meta:
        model = Learning_Verb
        fields = ['verb', 'level']

class Learning_Outcome(models.Model):
    outcome = models.CharField(max_length=256)

class Learing_OutcomeForm(ModelForm):
    class Meta:
        model = Learning_Outcome
        fields = ['outcome']

class Learning_Objective(CreationTrackingBaseModel):
    condition = models.TextField()
    task = models.TextField()
    degree = models.TextField()
    verb = models.ForeignKey(Learning_Verb)
    outcomes = models.ManyToManyField(Learning_Outcome)

class Learning_ObjectiveForm(ModelForm):
    class Meta:
        model = Learning_Objective
        fields = ['condition', 'task', 'degree', 'verb', 'outcomes']

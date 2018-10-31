from django.db import models
from django.forms import ModelForm

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

class Learning_Objective(models.Model):
    condition = models.CharField(max_length=64)
    task = models.CharField(max_length=64)
    degree = models.CharField(max_length=64)
    verb = models.ForeignKey(Learning_Verb)
    outcomes = models.ManyToManyField(Learning_Outcome)

class Learing_ObjectiveForm(ModelForm):
    class Meta:
        model = Learning_Objective
        fields = ['condition', 'task', 'degree', 'verb', 'outcomes']

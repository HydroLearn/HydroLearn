from django.forms.models import ModelForm
from src.apps.Content_Plugins.models.HS_ResourceLink import HS_ResourceLink_model

class HS_ResourceLink_AdminForm(ModelForm):
    class Meta:
        model = HS_ResourceLink_model




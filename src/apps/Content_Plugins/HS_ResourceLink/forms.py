
from django import forms
from django.forms.models import ModelForm


from src.apps.Content_Plugins.models.HS_ResourceLink import HS_ResourceLink_model

class HS_ResourceLink_AdminForm(ModelForm):

    class Meta:
        model = HS_ResourceLink_model
        fields = ['display_text', 'resource_link', 'resource_type']

        widgets = {
            'resource_link': forms.HiddenInput(attrs={
                'data-field-name':'resource_link',
            }),
            'resource_type': forms.HiddenInput(attrs={
                'data-field-name':'resource_type',
            }),


        }


    class Media:
        js = ('/static/HS_ResourceLink/js/ResourceLink_functionality.js',)





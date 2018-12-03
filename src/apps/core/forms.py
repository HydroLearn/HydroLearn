from django import forms
from django.utils.translation import ugettext as _

from src.apps.core.models.ModuleModels import (
    #Module,
    #Topic,
    Lesson,
    Section,
    Collaboration,
)
from src.apps.core.models.PublicationModels import Publication

from src.apps.core.models.SectionTypeModels import (
    ReadingSection,
    ActivitySection,
    QuizSection
)

# from djangocms_text_ckeditor.widgets import TextEditorWidget

from cms.api import add_plugin
from cms.utils import permissions
from cms.wizards.forms import BaseFormMixin

# used for filterable selection of foreign key objects in forms
from easy_select2 import apply_select2
from easy_select2 import select2_modelform_meta
from easy_select2.widgets import Select2Multiple


from pprint import pprint

#================================== Model Forms ==============================

class Module_ActionConfirmationForm(forms.Form):

    class Meta:
        # model = Module
        widgets = {
            'confirm': forms.HiddenInput(),
        }


class add_LessonForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = [
                'name',
                'short_name',
                'tags',

                #'position',
            ]


        widgets = {
            'position': forms.HiddenInput(),
            'parent_lesson': forms.HiddenInput(),
            # 'topic': apply_select2(forms.Select),
            } # hide the position field as it is determined by the sortable


class Edit_LessonForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = [
                'name',
                'short_name',
                'tags',
                'collaborators'
            ]

        filter_horizontal = ('collaborators',)
        widgets = {
            'position': forms.HiddenInput(),
        } # hide the position field as it is determined by the sortable




class SectionForm(forms.ModelForm):
    class Meta:
        model = Section
        # fields = ['name', 'section_type','position',]
        fields = [
                'name',
                'short_name',
                'duration',
                'tags',
                #'topic',                
                #'position',
            ]
        widgets = {
            'position': forms.HiddenInput(),
            
            } # hide the position field as it is determined by the sortable
        
        # content= forms.CharField(
        #         label="Content", required=False, widget=TextEditorWidget(),
        #         help_text=_('please enter the content for this section')
        #     )


        
#class ReadingSectionForm(forms.ModelForm):
class ReadingSectionForm(forms.ModelForm):
    # content = forms.CharField(
    #             label="content",
    #             required=False,
    #             widget=TextEditorWidget(),
    #             help_text=_('please enter the content for this section')
    #         )
    
    class Meta:
        model = ReadingSection
        # fields = ['name', 'section_type','position',]
        fields = [
                'name',
                'short_name',
                'lesson',
                'duration',
                'tags',

                #'content',
                #'position',
            ]
        widgets = {
                #'content': TextEditorWidget(),
                'position': forms.HiddenInput(),
                'topic': apply_select2(forms.Select),
               }
        
        readonly_fields = ['topic']


class ActivitySectionForm(forms.ModelForm):
    # content = forms.CharField(
    #             label="content",
    #             required=False,
    #             widget=TextEditorWidget(),
    #             help_text=_('please enter the content for this section')
    #         )

    class Meta:
        model = ActivitySection
        # fields = ['name', 'section_type','position',]
        fields = [
            'name',
            'short_name',
            'lesson',
            'duration',
            'tags',

            # 'content',
            # 'position',
        ]
        widgets = {
            # 'content': TextEditorWidget(),
            'position': forms.HiddenInput(),
            'topic': apply_select2(forms.Select),
        }

        readonly_fields = ['topic']


class CollaborationForm(forms.ModelForm):
    class Meta:
        model = Collaboration
        fields = [
            'publication',
            'collaborator',
            'can_edit',
        ]
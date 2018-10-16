from django import forms
from django.utils.translation import ugettext as _

from src.apps.core.models.ModuleModels import (
    #Module,
    #Topic,
    Lesson,
    Section,
)
from src.apps.core.models.PublicationModels import Publication

from src.apps.core.models.SectionTypeModels import (
    ReadingSection,
    ActivitySection,
    QuizSection
)

from djangocms_text_ckeditor.widgets import TextEditorWidget

from cms.api import add_plugin
from cms.utils import permissions
from cms.wizards.forms import BaseFormMixin

# used for filterable selection of foreign key objects in forms
from easy_select2 import apply_select2
from easy_select2 import select2_modelform_meta
from easy_select2.widgets import Select2Multiple


from pprint import pprint

#================================== Model Forms ==============================
# class ModuleForm(forms.ModelForm):
#     Meta = select2_modelform_meta(Module)
#
#     # def __init__(self, *args, **kwargs):
#     #     self.user = kwargs.pop('user', None)
#     #     super(ModuleForm, self).__init__(*args,**kwargs)
#     #
#
#     class Meta:
#         model = Module
#         fields = [
#             'name',
#             'tags',
#             #"publish_status"
#         ]
#         exclude = ['created_by']
#
#         #tags = forms.ModelChoiceField(queryset=qs, widget=Select2Multiple(select2attrs={'width': 'auto'}))
#
#         #widgets = {
#             #'tags': apply_select2(forms.Select),
#
#         #}
#
#
#
#
#     # try to make this of the form:
#     #   search layers: [layer name here...]
#     #   -----------------------------------------
#     #       selection 1
#     #       selection 2
#     #       ...
#     #
#     #   Possibly install django-smart-selects (or something similar) and use chained fields?
#
#     #this is currently a checkbox multiselect
#     # layers = forms.MultipleChoiceField(
#     #     choices=[(L.id, L.name) for L in LayerRef.objects.all()],
#     #     widget=forms.CheckboxSelectMultiple(),
#     #     required=False
#     # )
#
class Module_ActionConfirmationForm(forms.Form):

    class Meta:
        # model = Module


        widgets = {
            'confirm': forms.HiddenInput(),
        }


# class add_TopicForm(forms.ModelForm):
#     class Meta:
#         model = Topic
#         fields = [
#                 'name',
#                 'short_name',
#                 'module',
#                 'tags',
#                 #'position',
#             ]
#         widgets = {
#             'position': forms.HiddenInput(),
#             'module': apply_select2(forms.Select),
#             } # hide the position field as it is determined by the sortable
#
#
# class Edit_TopicForm(forms.ModelForm):
#     class Meta:
#         model = Topic
#         fields = [
#                 'name',
#                 'short_name',
#                 'tags',
#                 #'module'
#                 #'position',
#             ]
#         widgets = {
#             'position': forms.HiddenInput(),
#             # 'module': apply_select2(forms.Select),
#             } # hide the position field as it is determined by the sortable

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
            ]
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




#================================== Wizard Forms ==============================

# class CreateNewModule_WizardForm(BaseFormMixin, forms.ModelForm):
#     def __init__(self, *args, **kwargs):
#         self.user = kwargs.pop('user', None)
#         super(CreateNewModule_WizardForm, self).__init__(*args,**kwargs)
#
#     class Meta:
#         model = Module
#         fields = ['name']
#
#     def save(self, commit=True):
#         new_module = super(CreateNewModule_WizardForm, self).save(commit=False)
#
#         # this form should only be used in creating the initial instance so this should work
#         #print('*** adding created by for %s' % new_module.name)
#         new_module.created_by = self.user
#         new_module.changed_by = self.user
#     #
#     #     pprint(new_topic.__dict__)
#         if(commit):
#           new_module.save()
#         return new_module
#         # can set published here, but not yet
#
# class CreateNewTopic_WizardForm(BaseFormMixin, forms.ModelForm):
#     class Meta:
#         model = Topic
#         fields = ['name', 'short_name']
#
#     # def save(self, commit=True):
#     #
#     #     new_topic = super(CreateNewTopic_WizardForm, self).save(commit=False)
#     #
#     #     pprint(new_topic.__dict__)
#     #     if(commit):
#     #       new_topic.save()
#     #     return new_topic
#         # can set published here, but not yet

class CreateNewSection_WizardForm(BaseFormMixin, forms.ModelForm):
    class Meta:
        model = Section
        fields = ['name','lesson']
    #def save(self, commit=True):
    
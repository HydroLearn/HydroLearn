from django import forms
from django.forms import inlineformset_factory, BaseInlineFormSet
from django.utils.translation import ugettext as _
from .models.LearningObjModels import Learning_Level, Learning_Verb, Learning_Outcome, \
    Learning_Objective

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
    QuizSection,
)

from src.apps.core.models.QuizQuestionModels import (
    QuizQuestion,
    #MultiChoice_question,
    #MultiSelect_question,

    #MultiChoice_answer,
    #MultiSelect_answer,
    QuizAnswer,

)

from src.apps.core.models.ResourceModels import Resource

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

class ResourceForm(forms.ModelForm):
    class Meta:
        model = Resource
        fields = [
            'display_text',
            'resource_link',
            'resource_type',
            'activity',
        ]

class BaseResourceFormset(BaseInlineFormSet):

    def add_fields(self, form, index):
        '''
        add hidden field to formset for marking deletions

        :param form: collaborator form
        :param index: index of form in formset
        :return:
        '''

        super(BaseResourceFormset, self).add_fields(form, index)

        if self.can_delete:
            form.fields['DELETE'] = forms.BooleanField(
                label=_('Delete'),
                required=False,
                widget=forms.HiddenInput
            )


ResourceInline = inlineformset_factory(
    ActivitySection,
    Resource,
    extra=1,
    form=ResourceForm,
    formset=BaseResourceFormset,
)

class Learing_LevelForm(forms.ModelForm):
    class Meta:
        model = Learning_Level
        fields = ['label', 'definition']


class Learing_VerbForm(forms.ModelForm):
    class Meta:
        model = Learning_Verb
        fields = ['verb', 'level']


class Learing_OutcomeForm(forms.ModelForm):
    class Meta:
        model = Learning_Outcome
        fields = ['outcome']


class Learning_ObjectiveForm(forms.ModelForm):
    class Meta:
        model = Learning_Objective
        fields = [
            'condition',
            'task',
            'degree',
            'verb',
            'outcomes'
        ]


class Learning_ObjectiveTextForm(forms.ModelForm):
    outcomes = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Learning_Objective
        fields = (
            'condition',
            'task',
            'degree',
            'verb',

        )
        widgets = {
            "condition": forms.HiddenInput(),
            "task": forms.HiddenInput(),
            "degree": forms.HiddenInput(),
            "verb": forms.HiddenInput(),
            "outcomes": forms.HiddenInput(),
        }


    def clean_outcomes(self):
        outcomes = self.cleaned_data.get('outcomes')
        if not outcomes:
            return Learning_Outcome.objects.none()

        learning_outcomes = Learning_Outcome.objects.filter(pk__in=outcomes.split(","))
        if learning_outcomes is None:
            raise forms.ValidationError("No Learning_Outcome with ids {} exists".format(outcomes))

        return learning_outcomes

    def save(self, commit=True):
        # if lesson:
        #     self.instance.lesson = lesson

        # self.instance.verb_id = self.cleaned_data.get("verb")
        lo_instance = super(Learning_ObjectiveTextForm, self).save(commit)

        if commit:
            # add outcomes to the new learning objective
            outcomes = self.cleaned_data.get("outcomes")
            for outcome in outcomes:
                lo_instance.outcomes.add(outcome)

        return lo_instance

    def delete(self):
        self.instance.delete()

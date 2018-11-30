from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet, inlineformset_factory

#from nested_formset import nestedformset_factory
from taggit.forms import TagWidget

from src.apps.core.forms import *
#from src.apps.core.models.share_model import ShareMapping

from polymorphic.formsets import (
        polymorphic_inlineformset_factory,
        BasePolymorphicInlineFormSet,
        PolymorphicFormSetChild
    )

from django.utils.translation import gettext as _

from djangocms_text_ckeditor.widgets import TextEditorWidget
#from djangocms_text_ckeditor.

from src.settings import cms_settings


''' **********************************************************
    Action forms
********************************************************** '''
# class editor_ExportLessonForm(forms.Form):
#     exported_lesson = forms.HiddenInput()
#     retain_copy = forms.BooleanField(initial=True, label="Retain Instance", help_text="Checking this option will copy the selected lesson to it's own module, but will also retain the current copy as part of this module.")
#     # class Meta:

#
# class editor_ImportLessonForm(forms.Form):
#     parent_lesson = forms.HiddenInput()
#     # import_lesson = forms.HiddenInput()
#     import_lesson = forms.ModelChoiceField(queryset=None) # need reference to lesson being imported
#     retain_copy = forms.BooleanField(initial=True, label="Retain Instance", help_text="Checking this option will copy the selected Module to this Lesson, but will also retain the current External copy as it's own module.")
#
#     def __init__(self, parent_lesson, my_modules, *args, **kwargs):
#         super(editor_ImportLessonForm, self).__init__(*args, **kwargs)
#         self.fields['parent_lesson'] = parent_lesson
#         self.fields['import_lesson'].queryset = my_modules


''' **********************************************************
    Model Forms 
********************************************************** '''

class editor_LessonForm(forms.ModelForm):
    # content = forms.CharField(
    #         label='Content',
    #         widget=TextEditorWidget(placeholder=True),
    #         # widget=TextEditorWidget(placeholder=True, configuration=cms_settings.CMS_PLACEHOLDER_CONF['lesson_summary']),
    #         required=False,
    #         help_text=_("Optional. If provided, this text will be added to the lesson."),
    #     )
    #name = forms.CharField(min_length=4)

    # internal field marking if form was submitted for deletion
    # delete_on_submit = forms.BooleanField(widget=forms.HiddenInput(), initial=False, required=False)

    class Meta:
        model = Lesson
        fields = [
            'name',
            'short_name',
            'tags',
            'position',


        ]

        widgets = {
            'position': forms.HiddenInput(),

            'name': forms.TextInput(
                    attrs={
                        'required': 'true',
                        'class':'object_name'
                    },
                ),
            'tags': TagWidget(attrs={
                    'class': 'tag_input',
                    'data-role': "tagsinput",
                    'placeholder': 'Add Tags',
                }),

        }

    def clean_name(self):

        # add a validation check for the name to be minimum 4 characters
        name = self.cleaned_data.get('name', '')
        if len(name) < 4:
            raise ValidationError("Lesson name must be at least 4 characters.")

        return name

    # def save(self, commit=True):
    #
    #     submitted_lesson = super(editor_LessonForm, self).save(commit=False)
    #
    #     summary_body = self.cleaned_data.get('content', '')
    #
    #     if summary_body and submitted_lesson.has_draft_access(self.user ) :
    #
    #         if not submitted_lesson.pk:
    #             submitted_lesson.save()
    #
    #         if submitted_lesson and submitted_lesson.summary:
    #
    #             for plugin in submitted_lesson.summary.get_plugins():
    #                 plugin_inst, plugin_class = plugin.get_plugin_instance()
    #
    #                 if plugin_class.__class__.__name__ == "TextPlugin":
    #                     if plugin_inst.body == "This lesson's summary doesn't appear to have any content.":
    #                         plugin_inst.body = summary_body
    #                         plugin_inst.save()
    #                         break
    #             else:
    #                 add_plugin(
    #                     placeholder=submitted_lesson.summary,
    #                     plugin_type='TextPlugin',
    #                     language=self.language_code,
    #                     body=summary_body,
    #                 )
    #
    #     if commit:
    #         submitted_lesson.save()
    #
    #     return submitted_lesson

class editor_SectionForm(forms.ModelForm):
    #content = forms.CharField(widget=TextEditorWidget)
    # name = forms.CharField(min_length=4)
    class Meta:
        model = Section
        fields = [
            'name',
            'short_name',
            'duration',
            'tags',
            'position',
        ]

        widgets = {
            'position': forms.HiddenInput(),
            'name': forms.TextInput(
                    attrs={
                            'required': 'true',
                            'class': 'object_name'
                        },
                    ),
            'tags': TagWidget(attrs={
                    'class': 'tag_input',
                    'data-role': "tagsinput",
                    'placeholder': 'Add Tags',

                }),

        }


    def clean_name(self):

        # add a validation check for the name to be minimum 4 characters
        name = self.cleaned_data.get('name', '')
        if len(name) < 4:
            raise ValidationError("Section name must be at least 4 characters.")

        return name


# class manage_ShareForm(forms.ModelForm):
#     class Meta:
#         model = ShareMapping
#         exclude = ['module']


''' **********************************************************
POLYMORPHIC FORM TYPES
********************************************************** '''

class editor_ReadingSectionForm(forms.ModelForm):
    class Meta:
        model = ReadingSection
        fields = [
            'name',
            'short_name',
            'duration',
            'tags',
            'position',

        ]
        widgets = {
            'position': forms.HiddenInput(),
            'name': forms.TextInput(attrs={
                    'required': 'true',
                    'class':'object_name'
                }),
            'tags': TagWidget(attrs={
                    'class': 'tag_input',
                    'data-role': "tagsinput",
                    'placeholder': 'Add Tags',

                }),

        }

class editor_ActivitySectionForm(forms.ModelForm):
    class Meta:
        model = ActivitySection
        fields = [
            'name',
            'short_name',
            'duration',
            'tags',
            'position',
        ]

        widgets = {
            # 'content': TextEditorWidget(),
            'position': forms.HiddenInput(),
            #'topic': apply_select2(forms.Select),
            'name': forms.TextInput(attrs={
                    'required': 'true',
                    'class':'object_name'
                }),
            'tags': TagWidget(attrs={
                    'class': 'tag_input',
                    'data-role': "tagsinput",
                    'placeholder': 'Add Tags',


                }),

        }

        readonly_fields = ['topic']
        # exclude = ['created_by']

class editor_QuizSectionForm(forms.ModelForm):
    class Meta:
        model = QuizSection
        fields = [
            'name',
            'short_name',
            'duration',
            'tags',
            'position',
        ]

        widgets = {
            # 'content': TextEditorWidget(),
            'position': forms.HiddenInput(),
            'name': forms.TextInput(attrs={
                    'required': 'true',
                    'class': 'object_name'
                }),
            #'duration':
            #'topic': apply_select2(forms.Select),
            'tags': TagWidget(attrs={
                    'class': 'tag_input',
                    'data-role': "tagsinput",
                    'placeholder': 'Add Tags',

                }),
        }

        readonly_fields = ['topic']
        # exclude = ['created_by']


''' **********************************************************
    Inline Formsets
********************************************************** '''

class BaseLessonFormset(BaseInlineFormSet):

    def __init__(self, *args, **kwargs):
        super(BaseLessonFormset, self).__init__(*args, **kwargs)

        #self.prefix = "TOPIC"
        for form in self.forms:
            form.empty_permitted = False

    def add_fields(self, form, index):
        super(BaseLessonFormset, self).add_fields(form, index)

        if self.can_delete:
            form.fields['DELETE'] = forms.BooleanField(
                label=_('Delete'),
                required=False,
                widget=forms.HiddenInput
            )

        # add the inline formset for sub_lessons in each lesson
        form.sub_lessons = inlineLessonFormset(
                instance=form.instance,
                data=form.data if self.is_bound else None,
                # data=form.data if form.is_bound else None,
                # files=form.files if form.is_bound else None,
                prefix='%s-%s' % (
                    form.prefix,
                    inlineLessonFormset.get_default_prefix()
                ),
            )

        #add the inline formset for child_sections in each topic
        form.child_sections = inlineSectionFormset(
                    instance=form.instance,
                    data=form.data if self.is_bound else None,
                    #data=form.data if form.is_bound else None,
                    #files=form.files if form.is_bound else None,
                    prefix='%s-%s' % (
                        form.prefix,
                        inlineSectionFormset.get_default_prefix()
                    ),
                )

    def is_valid(self):
        result = super(BaseLessonFormset, self).is_valid()

        if(self.is_bound):
            # look at any nested formsets as well
            for form in self.forms:
                result = result and form.sub_lessons.is_valid()
                result = result and form.child_sections.is_valid()


        return result

    def clean(self):

        # if any forms already have errors return
        if any(self.errors):
            return

        #   check that each topic name is unique
        encountered_name = []
        for lesson in self.forms:
            if self.can_delete:
                if self._should_delete_form(lesson):
                    # This form is going to be deleted so any of its errors
                    # should not cause the entire formset to be invalid.
                    continue


            curr_name = lesson.cleaned_data.get('name')
            #marked_delete = lesson.cleaned_data.get('DELETE')

            if curr_name in encountered_name:
                lesson.add_error("name","Each Lesson name must be unique within it's parent.")

            #if not marked_delete:
            encountered_name.append(curr_name)




            # for section in lesson.child_sections:
            #     section.clean()

        # perform the standard clean
        super(BaseLessonFormset, self).clean()

    def save(self, commit=True):
        # get the result of saving the base topics
        result = super(BaseLessonFormset, self).save(commit=commit)

        # POTENTIALLY NEED TO ITERATE OVER 'result' NOT SELF.FORMS

        # for each form in this formset
        if commit:
            for form in self.forms:
                # save child sections if form isn't marked for deletion
                if not self._should_delete_form(form):
                    form.sub_lessons.save(commit=commit)
                    form.child_sections.save(commit=commit)

        return result

class BaseSectionFormset(BasePolymorphicInlineFormSet):

    # def __init__(self, *args, **kwargs):
    #     super(BaseSectionFormset, self).__init__(*args, **kwargs)
    #     self.prefix = "SECTION"

    def add_fields(self, form, index):
        super(BaseSectionFormset, self).add_fields(form, index)


        if self.can_delete:
            form.fields['DELETE'] = forms.BooleanField(
                label=_('Delete'),
                required=False,
                widget=forms.HiddenInput
            )

    def save(self, commit=True):
        # get the result of saving the base topics
        result = super(BaseSectionFormset, self).save(commit=commit)

        #
        # # if actually committing save it's many to many relationships (tags)
        # if commit:
        #     for form in self.forms:
        #         form.save_m2m()

        return result

    def clean(self):

        # if any forms already have errors return
        if any(self.errors):
            return

        #  Check that each section name is unique
        encountered_name = []
        for section in self.forms:
            if self.can_delete:
                if self._should_delete_form(section):
                    # This form is going to be deleted so any of its errors
                    # should not cause the entire formset to be invalid.
                    continue

            curr_name = section.cleaned_data['name']
            #marked_delete = section.cleaned_data.get('DELETE')

            if curr_name in encountered_name:
                #raise forms.ValidationError("Each Section Name must be unique within a Topic!")
                section.add_error('name', "Each Section Name must be unique within a Lesson!")

            #if not marked_delete:
            encountered_name.append(curr_name)

        # perform the standard clean
        super(BaseSectionFormset, self).clean()


''' **********************************************************
Formset Factories
********************************************************** '''

inlineLessonFormset = inlineformset_factory(
        Lesson,
        Lesson,
        fk_name='parent_lesson', #need to specify the field linking to parent lesson
        exclude=['published_copy','created_by', 'changed_by','creation_date', 'changed_date'],
        extra=0,
        form=editor_LessonForm,
        formset=BaseLessonFormset,

    )

#SectionFormset = inlineformset_factory(Topic, Section, formset=BaseSectionFormset, extra=1)
inlineSectionFormset = polymorphic_inlineformset_factory(
    Lesson,
    Section,
    exclude=['created_by', 'changed_by','creation_date', 'changed_date'],
    extra=0,
    formset=BaseSectionFormset,
    formset_children=( # add the inline polymorphic children and link their custom forms.
            PolymorphicFormSetChild(ReadingSection, editor_ReadingSectionForm),
            PolymorphicFormSetChild(QuizSection, editor_QuizSectionForm),
            PolymorphicFormSetChild(ActivitySection, editor_ActivitySectionForm),

        )
    )


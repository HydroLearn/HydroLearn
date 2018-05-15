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
''' **********************************************************
Model Forms 
********************************************************** '''

class manage_ModuleForm(forms.ModelForm):
    class Meta:
        model = Module
        fields = ['name', 'tags']
        exclude = ['created_by']

        widgets = {
            'tags': TagWidget(attrs={
                'class': 'tag_input',
                'data-role': "tagsinput",
                'placeholder':'Add Tags',

            }),

        }


class manage_TopicForm(forms.ModelForm):
    class Meta:
        model = Topic
        fields = [
            'name',
            'short_name',
            'tags',
        ]

        widgets = {
            'position': forms.HiddenInput(),
            'name': forms.TextInput(attrs={'required': 'true'}),
            #'module': apply_select2(forms.Select),
            'tags': TagWidget(attrs={
                'class': 'tag_input',
                'data-role': "tagsinput",
                'placeholder': 'Add Tags',

            }),

        }

class manage_LessonForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = [
            'name',
            'short_name',
            'tags',
        ]

        widgets = {
            'position': forms.HiddenInput(),
            'name': forms.TextInput(attrs={'required': 'true'}),
            #'module': apply_select2(forms.Select),
            'tags': TagWidget(attrs={
                'class': 'tag_input',
                'data-role': "tagsinput",
                'placeholder': 'Add Tags',

            }),

        }

class manage_SectionForm(forms.ModelForm):
    class Meta:
        model = Section
        fields = [
            'name',
            'short_name',
            'duration',
            'tags',
            # 'topic',
            # 'position',
        ]
        widgets = {
            'position': forms.HiddenInput(),
            'tags': TagWidget(attrs={
                'class': 'tag_input',
                'data-role': "tagsinput",
                'placeholder': 'Add Tags',

            }),

        }


# class manage_ShareForm(forms.ModelForm):
#     class Meta:
#         model = ShareMapping
#         exclude = ['module']


''' **********************************************************
POLYMORPHIC FORM TYPES
********************************************************** '''

class manage_ReadingSectionForm(forms.ModelForm):
    class Meta:
        model = ReadingSection
        fields = [
            'name',
            'short_name',
            'duration',
            'tags',
            # 'topic',
            # 'position',
        ]
        widgets = {
            'position': forms.HiddenInput(),
            'name': forms.TextInput(attrs={'required': 'true'}),
            'tags': TagWidget(attrs={
                'class': 'tag_input',
                'data-role': "tagsinput",
                'placeholder': 'Add Tags',

            }),

        }

class manage_ActivitySectionForm(forms.ModelForm):
    class Meta:
        model = ActivitySection
        fields = [
            'name',
            'short_name',
            #'topic',
            'duration',
            'tags',
        ]

        widgets = {
            # 'content': TextEditorWidget(),
            'position': forms.HiddenInput(),
            #'topic': apply_select2(forms.Select),
            'name': forms.TextInput(attrs={'required': 'true'}),
            'tags': TagWidget(attrs={
                'class': 'tag_input',
                'data-role': "tagsinput",
                'placeholder': 'Add Tags',

            }),

        }

        readonly_fields = ['topic']
        # exclude = ['created_by']

class manage_QuizSectionForm(forms.ModelForm):
    class Meta:
        model = QuizSection
        fields = [
            'name',
            'short_name',
            #'topic',
            'duration',
            'tags',
        ]

        widgets = {
            # 'content': TextEditorWidget(),
            'position': forms.HiddenInput(),
            'name': forms.TextInput(attrs={'required': 'true'}),
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

class BaseTopicFormset(BaseInlineFormSet):

    def __init__(self, *args, **kwargs):
        super(BaseTopicFormset, self).__init__(*args, **kwargs)

        #self.prefix = "TOPIC"
        for form in self.forms:
            form.empty_permitted = False

    def add_fields(self, form, index):
        super(BaseTopicFormset, self).add_fields(form, index)

        if self.can_delete:
            form.fields['DELETE'] = forms.BooleanField(
                label=_('Delete'),
                required=False,
                widget=forms.HiddenInput
            )

        #add the inline formset for child_sections in each topic
        # form.child_sections = inlineSectionFormset(
        form.child_lessons = inlineLessonFormset(
                    instance=form.instance,
                    data=form.data if self.is_bound else None,
                    #data=form.data if form.is_bound else None,
                    #files=form.files if form.is_bound else None,
                    prefix='%s-%s-lesson' % (
                        form.prefix,
                        inlineTopicFormset.get_default_prefix()
                    ),
                )



    def is_valid(self):
        result = super(BaseTopicFormset, self).is_valid()

        if(self.is_bound):
            # look at any nested formsets as well
            for form in self.forms:
                result = result and form.child_lessons.is_valid()


        return result

    def clean(self):

        # if any forms already have errors return
        if any(self.errors):
            return

        # check for any additional potential errors

        #   check that each topic name is unique
        encountered_name = []
        for topic in self.forms:
            if self.can_delete:
                if self._should_delete_form(topic):
                    # This form is going to be deleted so any of its errors
                    # should not cause the entire formset to be invalid.
                    continue


            curr_name = topic.cleaned_data.get('name')
            #marked_delete = topic.cleaned_data.get('DELETE')

            if curr_name in encountered_name:
                topic.add_error("name","Each Topic name must be unique within a Module.")

            #if not marked_delete:
            encountered_name.append(curr_name)


            # for lesson in topic.child_lessons:
            #     lesson.clean()

        print("~*~*~*~*~*~* passed topic clean")
        # perform the standard clean
        super(BaseTopicFormset, self).clean()

    def save(self, commit=True):
        # get the result of saving the base topics
        result = super(BaseTopicFormset, self).save(commit=commit)

        # POTENTIALLY NEED TO ITERATE OVER 'result' NOT SELF.FORMS

        # for each form in this formset
        if commit:
            for form in self.forms:
                # save child sections if form isn't marked for deletion
                if not self._should_delete_form(form):
                    form.child_lessons.save(commit=commit)

        return result

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

        #add the inline formset for child_sections in each topic
        # form.child_sections = inlineSectionFormset(
        form.child_sections = inlineSectionFormset(
                    instance=form.instance,
                    data=form.data if self.is_bound else None,
                    #data=form.data if form.is_bound else None,
                    #files=form.files if form.is_bound else None,
                    prefix='%s-%s-section' % (
                        form.prefix,
                        inlineLessonFormset.get_default_prefix()
                    ),
                )

    def is_valid(self):
        result = super(BaseLessonFormset, self).is_valid()

        if(self.is_bound):
            # look at any nested formsets as well
            for form in self.forms:
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
                lesson.add_error("name","Each Lesson name must be unique within a Topic.")

            #if not marked_delete:
            encountered_name.append(curr_name)




            # for section in lesson.child_sections:
            #     section.clean()

        print("~*~*~*~*~*~* passed lesson clean")
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
                section.add_error('name', "Each Section Name must be unique within a Topic!")

            #if not marked_delete:
            encountered_name.append(curr_name)

        print("~*~*~*~*~*~* passed section clean")

        # perform the standard clean
        super(BaseSectionFormset, self).clean()


''' **********************************************************
Formset Factories
********************************************************** '''
# define custom formsets for use in the above forms *******************************
inlineTopicFormset = inlineformset_factory(
        Module,
        Topic,
        exclude=['created_by', 'updated_by','created_at', 'updated_at'],
        extra=0,
        form=manage_TopicForm,
        formset=BaseTopicFormset,

    )

inlineLessonFormset = inlineformset_factory(
        Topic,
        Lesson,
        exclude=['created_by', 'updated_by','created_at', 'updated_at'],
        extra=0,
        form=manage_LessonForm,
        formset=BaseLessonFormset,

    )

#SectionFormset = inlineformset_factory(Topic, Section, formset=BaseSectionFormset, extra=1)
inlineSectionFormset = polymorphic_inlineformset_factory(
    Lesson,
    Section,
    exclude=['created_by', 'updated_by','created_at', 'updated_at'],
    extra=0,
    formset=BaseSectionFormset,
    formset_children=( # add the inline polymorphic children and link their custom forms.
            PolymorphicFormSetChild(ReadingSection, manage_ReadingSectionForm),
            PolymorphicFormSetChild(QuizSection, manage_QuizSectionForm),
            PolymorphicFormSetChild(ActivitySection, manage_ActivitySectionForm),

        )
    )


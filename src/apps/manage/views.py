#from urllib.parse import to_bytes
from django.utils.timezone import now
from django.core.exceptions import (
    ImproperlyConfigured,
    PermissionDenied,
    ValidationError,
)

from django.core.urlresolvers import reverse, reverse_lazy
from django.db import transaction
#from django.db.models.query import EmptyQuerySet
from django.forms.formsets import DELETION_FIELD_NAME, formset_factory
from django.shortcuts import get_object_or_404, render_to_response, render, redirect
from django.utils.encoding import force_text
from django.views import View
from django.views.generic import (
        DetailView,
        ListView,
        TemplateView,
        FormView,
        UpdateView,
        CreateView,
        DeleteView
    )

from django.contrib import messages
from django.contrib.messages.views import SuccessMessageMixin
from django.http import (
        HttpResponse,
        Http404,
    )
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
from django.views.generic.edit import FormMixin


from src.apps.core.models.ModuleModels import (
    Lesson,
    Section,
)

from src.apps.core.models.SectionTypeModels import (
    ActivitySection,
    QuizSection,
    ReadingSection
)


from src.apps.core.model_queries import *
#from src.apps.core.forms import *
from src.apps.core.views.PublicationViews import (
    PublicationChildViewMixin,
    PublicationViewMixin,
    DraftOnlyViewMixin
)

from src.apps.core.views.mixins import (
    AjaxableResponseMixin,
    OwnershipRequiredMixin,
    CollabEditorAccessRequiredMixin)

from src.apps.manage.forms import *

#from src.apps.tags.query_utils import *
#from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import (
    LoginRequiredMixin,

)
from django.utils.translation import gettext as _




# ====================================== Standard views =======================================
#@login_required
class Index(LoginRequiredMixin, TemplateView):
    template_name = 'manage/manage_index.html'

    def get(self, request, *args, **kwargs):

        if not self.request.toolbar.edit_mode_active:
            return redirect("/manage/?edit")


        return super(Index, self).get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(Index, self).get_context_data(**kwargs)
        return context
    
    def render_to_response(self, context, **kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)
        return super(Index, self).render_to_response(context, **kwargs)

class manage_ModuleCreateView(LoginRequiredMixin, AjaxableResponseMixin, CreateView):
    model = Lesson
    context_object_name = "Lesson"

    # form_class = manage_ModuleForm
    form_class = manage_LessonForm
    template_name = 'manage/forms/module_form.html'

    success_url = '/manage/success/'

    # ajax response mixin parameter
    ajax_success_redirect = reverse_lazy("manage:manage_index")

    def get(self, request, *args, **kwargs):
        """
        Handles GET requests and instantiates blank versions of the form
        and its inline formsets.
        """
        self.object = None
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        subLesson_formset = inlineLessonFormset()
        section_formset = inlineSectionFormset()
        return self.render_to_response(
            self.get_context_data(form=form,
                                  sub_lessons=subLesson_formset,
                                  sections=section_formset,
                                  )
        )

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests, instantiating a form instance and its inline
        formsets with the passed POST variables and then checking them for
        validity.
        """
        self.object = None
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        sections_formset = inlineSectionFormset(self.request.POST)
        subLesson_formset = inlineLessonFormset(self.request.POST)

        if form.is_valid() and subLesson_formset.is_valid() and sections_formset.is_valid():
            return self.form_valid(form, sections_formset, subLesson_formset)
        else:
            return self.form_invalid(form, sections_formset, subLesson_formset)

    def process_lesson_formset(self, lesson_fs, parent_lesson=None):
        '''
        save individual lesson forms of provided formset, set their parent
        lesson if provided, and process any child sub-lessons and sections

        :param lesson_fs: inline lesson formset
        :param parent_lesson: parent lesson for formset
        :return: none
        '''
        if lesson_fs:
            for subLesson_index, subLesson in enumerate(lesson_fs):
                # instance the subLesson, set its module, created_by, and changed_by fields
                new_subLesson = subLesson.save(commit=False)

                # print("creating subLesson: ", new_subLesson.name)
                if parent_lesson:
                    new_subLesson.parent_lesson = parent_lesson

                new_subLesson.created_by = self.request.user
                new_subLesson.changed_by = self.request.user

                # potentially this is already provided
                #new_subLesson.position = subLesson_index

                # save the topic and it's many-to-many relationships (tags)
                new_subLesson.save()
                subLesson.save_m2m()

                self.process_section_formset(subLesson.child_sections, new_subLesson)
                self.process_lesson_formset(subLesson.sub_lessons, new_subLesson)

    def process_section_formset(self, section_fs, parent_lesson):
        '''
        save individual section forms of a provided formset and set their parent lesson

        :param section_fs: inline section formset
        :param parent_lesson: parent lesson
        :return: none
        '''

        if section_fs:
            for section_index, section in enumerate(section_fs):
                # instance the section and set its parent topic, created_by, and changed_by fields
                new_section = section.save(commit=False)

                new_section.lesson = parent_lesson
                new_section.created_by = self.request.user
                new_section.changed_by = self.request.user
                new_section.position = section_index

                # save the section and it's many-to-many fields (tags)
                new_section.save()
                section.save_m2m()

    def form_valid(self, form, sections, subLessons, *args, **kwargs):

        '''
        if the Module form itself is valid, perform tests to ensure the topic formset
            in context is valid and if they are,
                create these objects as well
            otherwise,
                return form_invalid

        :param form: the module form
        :param sections: the inline section formset
        :param subLessons: the inline lesson formset
        :param args:
        :param kwargs:
        :return:
        '''

        try:
            with transaction.atomic():

                # instance the module and set the created-by and updated-by fields
                new_lesson = form.save(commit=False)
                new_lesson.created_by = self.request.user
                new_lesson.changed_by = self.request.user

                # save the module
                new_lesson.save()

                self.process_section_formset(sections, new_lesson)
                self.process_lesson_formset(subLessons, new_lesson)

            #print("returning success")
            messages.success(self.request, _("Successfully created Lesson:'%s'" % new_lesson.name))

        except ValidationError as err:
            # if there was an error at any point while saving the module or its child formset
            form.add_error(_('The submitted form is invalid'))
            #print("...returning invalid")

            return self.form_invalid(form, subLessons)


        return super(manage_ModuleCreateView, self).form_valid(form)


    # def get_failed_return_data(self, form):
    #     return {
    #         "errors": form.errors.as_json(),
    #         #'sublessons': self.get_lesson_formset_errors(subLessons),
    #         #"sections": self.get_section_formset_errors(sections),
    #         # "formset": error_collection,
    #     }

    def form_invalid(self, form, sections, subLessons, *args, **kwargs):

        # error_collection = [{
        #     "errors": topicForm.errors.as_json(),
        #
        #     "formset": [{
        #         "errors": lessonForm.errors.as_json(),
        #         "formset": [{
        #             "errors": sectionForm.errors.as_json(),
        #         } for sectionForm in lessonForm.child_sections.forms]
        #
        #     } for lessonForm in topicForm.child_lessons.forms]
        #
        # } for topicForm in subLessons.forms]

        # self.ajax_return_data = {
        #     "errors": form.errors.as_json(),
        #     'sublessons': self.get_lesson_formset_errors(subLessons),
        #     "sections": self.get_section_formset_errors(sections),
        #     # "formset": error_collection,
        # }

        return super(manage_ModuleCreateView, self).form_invalid(form)

    def get_lesson_formset_errors(self, lessons_formset):
        return [{
            'errors': lessonForm.errors.as_json(),
            'sublessons': self.get_lesson_formset_errors(lessonForm.sub_lessons),
            'sections': self.get_section_formset_errors(lessonForm.child_sections),
        } for lessonForm in lessons_formset.forms]

    def get_section_formset_errors(self, sections_formset):
        return [{
            'errors': sectionForm.errors.as_json(),
        } for sectionForm in sections_formset.forms]


#class manage_ModuleEditView(LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, AjaxableResponseMixin, UpdateView):
class manage_ModuleEditView(PublicationViewMixin, OwnershipRequiredMixin, DraftOnlyViewMixin, AjaxableResponseMixin, UpdateView):
    model = Lesson
    template_name = 'manage/forms/module_form.html'
    #form_class = manage_ModuleForm
    form_class = manage_LessonForm
    success_url = '/manage/success/'

    # ajax response mixin parameter
    ajax_success_redirect = reverse_lazy("manage:manage_index")

    def get(self, request, *args, **kwargs):
        """
        Handles GET requests and instantiates blank versions of the form
        and its inline formsets.
        """

        self.object = self.get_object()

        # # check permissions before serving view
        # has_permission = request.user.is_admin or (self.object and self.object.created_by == request.user)
        #
        # if not has_permission:
        #     raise PermissionDenied

        form_class = self.get_form_class()
        form = self.get_form(form_class)
        subLesson_formset = inlineLessonFormset(instance=self.object)
        section_formset = inlineSectionFormset(instance=self.object)
        return self.render_to_response(
            self.get_context_data(form=form,
                                  sub_lessons=subLesson_formset,
                                  sections=section_formset,
                                  )
        )

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests, instantiating a form instance and its inline
        formsets with the passed POST variables and then checking them for
        validity.
        """
        self.object = self.get_object()

        # # check permissions before serving view
        # has_permission = request.user.is_admin or (self.object and self.object.created_by == self.request.user)
        #
        # if not has_permission:
        #     raise PermissionDenied

        form_class = self.get_form_class()
        form = self.get_form(form_class)
        subLesson_formset = inlineLessonFormset(self.request.POST, instance=self.object)
        section_formset = inlineSectionFormset(self.request.POST, instance=self.object)

        #Topic_formset = inlineTopicFormset(self.request.POST, instance=self.object)
        #if form.is_valid() and Topic_formset.is_valid():
        if form.is_valid() and subLesson_formset.is_valid() and section_formset.is_valid():
            return self.form_valid(form, section_formset, subLesson_formset)
        else:
            return self.form_invalid(form, section_formset, subLesson_formset)

    def process_lesson_formset(self, lesson_fs, parent_lesson=None):
        '''
        save individual lesson forms of provided formset, set their parent
        lesson if provided, and process any child sub-lessons and sections

        :param lesson_fs: inline lesson formset
        :param parent_lesson: parent lesson for formset
        :return: none
        '''

        if lesson_fs:
            # instantiate the lesson instances (contains both edited/new topics)
            lesson_fs.save(commit=False)

            # set the created_by and parent for any new lessons
            for new_lesson in lesson_fs.new_objects:
                new_lesson.created_by = self.request.user
                new_lesson.parent_lesson = parent_lesson

            # delete any lessons marked for deletion
            for deleted_lesson in lesson_fs.deleted_objects:
                deleted_lesson.delete()

            # process formset
            for changed_lesson in lesson_fs:

                # if not marked for deletion
                if not changed_lesson.cleaned_data.get(DELETION_FIELD_NAME):
                    # get the current lesson instance
                    curr_lesson = changed_lesson.save(commit=False)

                    # set who has just updated this lesson
                    curr_lesson.changed_by = self.request.user

                    # save the instance and it's m2m relationships (tags)
                    curr_lesson.save()
                    changed_lesson.save_m2m()

                    # process any child formsets of this lesson
                    self.process_section_formset(changed_lesson.child_sections, curr_lesson)
                    self.process_lesson_formset(changed_lesson.sub_lessons, curr_lesson)

    def process_section_formset(self, section_fs, parent_lesson):
        '''
        save individual section forms of a provided formset and set their parent lesson

        :param section_fs: inline section formset
        :param parent_lesson: parent lesson
        :return: none
        '''

        if section_fs:
            # instantiate the section instances
            section_fs.save(commit=False)

            # if there are any new sections, add in the created_by value
            for new_section in section_fs.new_objects:
                new_section.created_by = self.request.user
                new_section.topic = parent_lesson

            # delete any sections marked for deletion
            for deleted_section in section_fs.deleted_objects:
                deleted_section.delete()

            # process formset
            for changed_section in section_fs:

                # if not marked for deletion
                if not changed_section.cleaned_data.get(DELETION_FIELD_NAME):
                    # instantiate the edited section
                    curr_section = changed_section.save(commit=False)

                    # set changed_by
                    curr_section.changed_by = self.request.user

                    # save the section
                    curr_section.save()
                    changed_section.save_m2m()

    # def form_valid(self, form, topics):
    def form_valid(self, form, sections, subLessons, *args, **kwargs):
        try:
            with transaction.atomic():

                # instantiate the module and set it's changed_by field
                new_lesson = form.save(commit=False)
                new_lesson.changed_by = self.request.user

                # save the module and its many-to-many relations (tags)
                new_lesson.save()
                form.save_m2m()

                self.process_section_formset(sections, new_lesson)
                self.process_lesson_formset(subLessons, new_lesson)

        except ValidationError as err:
            # if there was an error at any point during save of module or topic formset
            form.add_error(None, _("There are errors in child forms."))
            form.add_error(None, _(err))
            return self.form_invalid(form)

        messages.success(self.request, _("Successfully edited Module:'%s'" % new_lesson.name))
        return super(manage_ModuleEditView,self).form_valid(form)

    def form_invalid(self, form, sections, subLessons, *args, **kwargs):
        # error_collection = [{
        #     "errors": topicForm.errors.as_json(),
        #
        #     "formset": [{
        #         "errors": lessonForm.errors.as_json(),
        #         "formset": [{
        #             "errors": sectionForm.errors.as_json(),
        #         } for sectionForm in lessonForm.child_sections.forms]
        #     } for lessonForm in topicForm.child_lessons.forms]
        #
        # } for topicForm in topics.forms]
        #
        # self.ajax_return_data = {
        #     "errors": form.errors.as_json(),
        #     "formset": error_collection,
        # }

        self.ajax_return_data = {
            "errors": form.errors.as_json(),
            'sublessons': self.get_lesson_formset_errors(subLessons),
            "sections": self.get_section_formset_errors(sections),
            # "formset": error_collection,
        }

        return super(manage_ModuleEditView, self).form_invalid(form)

    def get_lesson_formset_errors(self, lessons_formset):
        return [{
            'errors': lessonForm.errors.as_json(),
            'sublessons': self.get_lesson_formset_errors(lessonForm.sub_lessons),
            'sections': self.get_section_formset_errors(lessonForm.child_sections),
        } for lessonForm in lessons_formset.forms]

    def get_section_formset_errors(self, sections_formset):
        return [{
            'errors': sectionForm.errors.as_json(),
        } for sectionForm in sections_formset.forms]


#class manage_ModulePublishIndex(LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, DetailView):
class manage_ModulePublishIndex(PublicationViewMixin, OwnershipRequiredMixin, DetailView):
    template_name = 'manage/forms/module_publication_index.html'
    success_url = '/manage/'
    model = Lesson

    def get_object(self, queryset=None):
        # get the default object based on the slug
        object = super(manage_ModulePublishIndex, self).get_object(queryset)

        # if the object was found by the slug: get the draft object, check ownership, and return
        if object:
            object = object.get_draft_object()

            if object.is_owner(self.request.user):
                return object
            else:
                return None

# TODO: FIXIT
#       after the fact: not sure what i was referring to at the time of
#       marking this as 'FIXIT', but let that be a lesson
#       about commenting...
#       potentially adding in permission restrictions
class manage_ModulePublish(LoginRequiredMixin, FormView):
    template_name = 'manage/forms/module_publish_form.html'
    form_class = Module_ActionConfirmationForm
    success_url = '/manage/'

    def form_valid(self, form):

        if 'publish' in self.request.POST:
            draft_instance = get_object_or_404(Lesson, slug=self.kwargs['slug'])
            draft_instance.publish()


        if 'unpublish' in self.request.POST:
            draft_instance = get_object_or_404(Lesson, slug=self.kwargs['slug'])
            draft_instance.unpublish()

        if 'revert' in self.request.POST:
            draft_instance = get_object_or_404(Lesson, slug=self.kwargs['slug'])
            draft_instance.revert_to_live()

        return super(manage_ModulePublish, self).form_valid(form)

    def form_invalid(self, form, **kwargs):
        return super(manage_ModulePublish, self).form_invalid(form)

class manage_ModuleDeleteView(PublicationViewMixin, OwnershipRequiredMixin, DeleteView):
    model = Lesson
    template_name = 'manage/forms/module_delete.html'
    success_url = '/manage/'

    def get_success_url(self):
        messages.success(self.request, _("Module:'%s' was successfully deleted!" % self.object.name))
        return super(manage_ModuleDeleteView, self).get_success_url()



    def get_object(self, queryset=None):
        obj = super(manage_ModuleDeleteView, self).get_object()
        if self.request.user == obj.created_by:
            return obj

        raise Http404

class manage_ModuleCollaboration(PublicationViewMixin, OwnershipRequiredMixin, AjaxableResponseMixin, UpdateView):
    template_name = 'manage/forms/module_collaborate_form.html'
    success_url = '/manage/'
    model = Lesson
    form_class = manage_LessonCollabForm

    def get_context_data(self, **kwargs):
        context = super(manage_ModuleCollaboration, self).get_context_data(**kwargs)

        # add collaborator formset to the lesson form


        if self.request.POST:
            # if submitting formset perform a clean
            context['collaborator_fs'] = inlineCollabFormset(self.request.POST, instance=self.object)
            context['collaborator_fs'].full_clean()
        else:
            context['collaborator_fs'] = inlineCollabFormset(instance=self.object)


        return context

    def get_object(self, queryset=None):
        # get the default object based on the slug
        object = super(manage_ModuleCollaboration, self).get_object(queryset)

        # if the object was found by the slug: get the draft object, check ownership, and return
        if object:
            object = object.get_draft_object()

            if object.is_owner(self.request.user):
                return object
            else:
                return None

    def get_failed_return_data(self, form):

        context = self.get_context_data()
        return {
            'formset_errors': context['collaborator_fs'].errors,
        }

    
    def get_success_return_data(self, form):
        return super(manage_ModuleCollaboration, self).get_success_return_data(form)
    
    def form_valid(self, form, *args, **kwargs):
        # will need to verify validity of formset

        with transaction.atomic():

            lesson = form.save(commit=False)

            context = self.get_context_data(**kwargs)
            collab_formset = context['collaborator_fs']

            if collab_formset.is_valid():
                collaborations = collab_formset.save(commit=False)

                # delete any collabs marked for deletion
                for deleted_collab in collab_formset.deleted_objects:
                    deleted_collab.delete()

                for collab in collaborations:
                    collab.save()


                lesson.save()
                form.save_m2m()

            else:
                stop = True
                return self.form_invalid(form,*args, **kwargs)




        return super(manage_ModuleCollaboration, self).form_valid(form, *args, **kwargs)
    
    def form_invalid(self, form, *args, **kwargs):
        return super(manage_ModuleCollaboration, self).form_invalid(form, *args, **kwargs)

class manage_PublicationCloneIndex(LoginRequiredMixin, AjaxableResponseMixin, DetailView):
    model = Lesson
    template_name = 'manage/forms/module_clone_publication_form.html'
    form_class = manage_PublicationCloneForm
    success_url = '/manage/'
    
    def get_object(self, queryset=None):
        # get the default object based on the slug
        object = super(manage_PublicationCloneIndex, self).get_object(queryset)

        # if the object was found by the slug: get the draft object, check ownership, and return
        if object:
            object = object.get_public_object()
            return object

class manage_PublicationClone(LoginRequiredMixin, FormView):
    template_name = 'manage/forms/module_publish_form.html'
    form_class = Module_ActionConfirmationForm
    success_url = '/manage/'

    def form_valid(self, form):

        if 'clone' in self.request.POST:
            publication_instance = Lesson.objects.public().get(slug=self.kwargs['slug'])
            stop = True

            with transaction.atomic():
                new_clone = publication_instance.derivation()

                new_clone.created_by = self.request.user



                # new_clone.derived_date = now()
                # new_clone.derived_lesson_slug = publication_instance.slug
                # new_clone.derived_lesson_creator = publication_instance.created_by

                new_clone.save()

                new_clone.copy_content(publication_instance)
                new_clone.derive_children_from(publication_instance)




        return super(manage_PublicationClone, self).form_valid(form)

    def form_invalid(self, form, **kwargs):
        return super(manage_PublicationClone, self).form_invalid(form)
###############################################################################
###                 CONTENT EDITING VIEWS                                   ###
###############################################################################

class manage_LessonContent(CollabEditorAccessRequiredMixin, PublicationChildViewMixin, DetailView):
    model = Lesson
    template_name = "manage/lesson_detail.html"

    def get_context_data(self, **kwargs):
        context = super(manage_LessonContent, self).get_context_data(**kwargs)
        context['edit'] = True
        return context

class manage_SectionContent(CollabEditorAccessRequiredMixin, PublicationChildViewMixin, DetailView):
    model = Section

    def get_context_data(self, **kwargs):
        #kwargs['edit'] = kwargs.get('edit', False)
        context = super(manage_SectionContent, self).get_context_data(**kwargs)
        #context['edit'] = True

        return context

    def get_template_names(self):
        c_type = str(ContentType.objects.get_for_id(self.get_object().polymorphic_ctype_id))

        return {
                'Reading Section':  'manage/section_reading_detail.html',
                'Activity Section': 'manage/section_activity_detail.html',
                'Quiz Section':     'manage/section_quiz_detail.html',
            }.get(c_type, 'manage/section_detail.html')


###############################################################################
###                 PARTIALVIEWS                                            ###
###############################################################################

def module_listing(request):
    '''
        django partial view for displaying the current user's module listing
    :param request:
    :return:
    '''
    template_name = 'manage/partials/_module_list_view.html'
    #my_modules = request.user.created_modules.all()
    return render_to_response(template_name, context={'user': request.user})


def collab_listing(request):
    '''
        django partial view for displaying the current user's module listing
    :param request:
    :return:
    '''
    template_name = 'manage/partials/_module_collab_view.html'
    #my_modules = request.user.created_modules.all()
    return render_to_response(template_name, context={'user': request.user})


def find_modules(request):
    '''
        django partial view for displaying the current user's module listing
    :param request:
    :return:
    '''
    template_name = 'manage/partials/_module_find_view.html'

    # potentially add a form here and handle post requests


    return render_to_response(template_name, context={'user': request.user})


def find_filter_form(request):

    template_name = 'manage/partials/_find_publications_filters_tag_template.html'


    # currently this form isn't being used directly...
    # name_filter_choices = [
    #     ("starts_with", "Starts With"),
    #     ("contains", "Contains"),
    # ]
    # class Filter_form(forms.Form):
    #     name = forms.CharField(max_length=250)
    #     name_filter = forms.ChoiceField(choices=name_filter_choices, widget=forms.RadioSelect())
    #     share_code = forms.CharField(max_length=8)
    #
    # filter_form = Filter_form(request.POST or None)

    context = {
        'user': request.user,
        #'form': filter_form
    }


    return render(request, template_name, )


def find_listing(request, *args, **kwargs):
    template_name = 'manage/partials/_find_list_tag_template.html'
    # collect the filter parameters

    name = request.GET.get("name", "")
    name_filter = request.GET.get("name_filter")
    share_code = request.GET.get('share_code', "")

    # prioritize share_code filter
    if share_code:
        found_modules = Lesson.objects.public().filter(slug=share_code).order_by('-published_date')

    elif name:
        if name_filter == "contains":
            found_modules = Lesson.objects.public().filter(name__contains=name).order_by('-published_date')
        else:
            found_modules = Lesson.objects.public().filter(name__startswith=name).order_by('-published_date')

    else:
        # no filter specified
        found_modules = Lesson.objects.public().order_by('-published_date')

    return render(request, template_name, context={'user': request.user, 'found_modules': found_modules})


def module_success(request):

    template_name = 'manage/partials/_edit_successful.html'
    return render_to_response(template_name)

#from urllib.parse import to_bytes

from django.core.exceptions import (
    ImproperlyConfigured,
    PermissionDenied,
    ValidationError,
)

from django.core.urlresolvers import reverse, reverse_lazy
from django.db import transaction
#from django.db.models.query import EmptyQuerySet
from django.forms.formsets import DELETION_FIELD_NAME
from django.shortcuts import get_object_or_404, render_to_response, render
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
        #HttpResponseRedirect,
        #JsonResponse,
        #HttpResponseForbidden
    )
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
from django.views.generic.edit import FormMixin
from djangocms_installer.compat import unicode

from src.apps.core.models.ModuleModels import (
    Module,
    Topic,
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
    PublicationViewMixin
)
from src.apps.manage.forms import *

#from src.apps.tags.query_utils import *
#from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import (
    LoginRequiredMixin,
    UserPassesTestMixin,
)
from django.utils.translation import gettext as _

###############################################################################
###                 CUSTOM MIXINS
###############################################################################
class OwnershipRequiredMixin(UserPassesTestMixin):
    """
        Mixin to adds in test function that checks that the user has permission
        to view the requested object,
            - Users can only access the manage view if they are the owner of the object (created_by)
                or if it has been shared with them

        if the tests defined in test_func are not passed, return a 403 error (permission exception)
    """
    raise_exception = True  # raise 403 exception if user fails permission test

    def test_func(self):
        object = self.get_object()
        has_permission = self.request.user.is_admin or (object and object.created_by == self.request.user)
        return has_permission

class AjaxableResponseMixin(object):
    """
        Custom View Mixin for processing forms via ajax
        No form processing is handled in this mixin, only creation of json responses to be
        passed to the success method of an Ajax post to a FormView

        supplies additional view settings:
            - (var) ajax_error_dict         - a dictionary containing any errors encountered during processing of the form
            - (var) ajax_success_redirect   - the success url to redirect to if submitted form was valid and processed
            - (method) get_ajax_success_url - method to return the 'ajax_success_redirect' modeled after default FormView's 'get_success_url' method

        provides a super methods to return 'response.success' response if the form was processed as expected
            -   if processed form had errors a response is returned flagging 'response.success'
                as false and provides supplied  'ajax_error_dict' in 'response.data'

            -   if the processed form was valid, returns response with 'response.success'
                flagged as true, and provides the result of 'get_ajax_success_url' method in
                'response.data'

        Notes:
            -   No actual redirection is triggered in this mixin, it only supplies the redirection url
                back to the view. redirection is expected to be handled in the 'Ajax.success' method

            -   Assuming processing went as expected (whether valid or invalid),
                'Ajax.success' will be triggered and the appropriate json response will be supplied

            -   the only time 'Ajax.error' will be returned is if there is a server side error,
                or if the supplied 'ajax_error_dict' or 'ajax_success_redirect' are invalid.

    """

    ajax_error_dict = {}
    ajax_success_redirect = None

    def get_ajax_success_url(self):
        """
            method modeled after FormView's 'get_success_url' method, but to return
            the ajax redirect url

            :return: url for view to redirect to on successful form submission
        """
        if self.ajax_success_redirect:
            # Forcing possible reverse_lazy evaluation
            url = force_text(self.ajax_success_redirect)
        else:
            raise ImproperlyConfigured(
                "No URL to redirect to. Provide a ajax_success_redirect.")
        return url


    """
    Mixin to add AJAX support to a form.
    Must be used with an object-based FormView (e.g. CreateView, UpdateView)
    """
    def form_invalid(self, form, *args, **kwargs):
        """
        :param form: the posted invalid form
        :return: an HttpResponse containing a json object flagging success as false, provide a message,
                    and return the 'ajax_error_dict' under the 'data' attribute
        """

        response = super(AjaxableResponseMixin, self).form_invalid(form, *args, **kwargs)
        if self.request.is_ajax():

            payload = {
                'success': False,
                'message': _("Validation failed! Form was not saved."),
                'data': self.ajax_error_dict
            }

            return HttpResponse(json.dumps(payload), content_type='application/json')

        else:
            return response

    def form_valid(self, form, *args, **kwargs):
        """
        :param form: the posted valid form
        :return: an HttpResponse containing a json object flagging success as true, provide a message,
                    and return the 'ajax_error_dict' under the 'data' attribute
        """
        # We make sure to call the parent's form_valid() method because
        # it might do some processing (in the case of CreateView, it will
        # call form.save() for example).
        response = super(AjaxableResponseMixin, self).form_valid(form, *args, **kwargs)
        if self.request.is_ajax():

            self.message = _("Validation passed! The Form has been Saved.")

            return_data = { "redirect_url": self.get_ajax_success_url(), }

            payload = {
                'success': True,
                'message': _("Validation passed. Form Saved."),
                'data': return_data,
            }

            return HttpResponse(json.dumps(payload), content_type='application/json')

        else:
            return response

def errors_to_json(errors):
    """
    Convert a Form error list to JSON::
    """
    return dict(
            (k, list(map(unicode, v)))
            for (k,v) in errors.items()
        )


# ====================================== Standard views =======================================
#@login_required
class Index(LoginRequiredMixin, TemplateView):
    template_name = 'manage/manage_index.html'

    def get_context_data(self, **kwargs):
        context = super(Index, self).get_context_data(**kwargs)
        return context
    
    def render_to_response(self, context, **kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)
        return super(Index, self).render_to_response(context, **kwargs)

class manage_ModuleCreateView(LoginRequiredMixin, AjaxableResponseMixin, CreateView):
    model = Module
    context_object_name = "Module"

    form_class = manage_ModuleForm
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
        Topic_formset = inlineTopicFormset()
        return self.render_to_response(
            self.get_context_data(form=form,
                                  Topics=Topic_formset,
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
        Topic_formset = inlineTopicFormset(self.request.POST)
        if form.is_valid() and Topic_formset.is_valid():
            return self.form_valid(form, Topic_formset)
        else:
            return self.form_invalid(form, Topic_formset)

    def form_invalid(self, form, topics, *args, **kwargs):

        # trigger a full clean on the topics/child sections to populate form errors
        #topics.errors
        #[section_fs.errors for section_fs in [form.child_sections for form in topics.forms]]

        #populate form errors for each child lesson, and it's child sections
        # [lesson_fs.errors for lesson_fs in [
        #         form.child_lessons for form in topics.forms
        #     ]
        #  ]

        error_collection = [{
            "errors": topicForm.errors.as_json(),

            "formset": [{
                "errors": lessonForm.errors.as_json(),
                "formset": [{
                    "errors": sectionForm.errors.as_json(),
                } for sectionForm in lessonForm.child_sections.forms]
            } for lessonForm in topicForm.child_lessons.forms]

        } for topicForm in topics.forms]

        self.ajax_error_dict = {
            "errors": form.errors.as_json(),
            "formset": error_collection,
        }

        return super(manage_ModuleCreateView, self).form_invalid(form)

    def form_valid(self, form, topics, *args, **kwargs):
        '''
        if the Module form itself is valid, perform tests to ensure the topic formset
            in context is valid and if they are,
                create these objects as well
            otherwise,
                return form_invalid

        :param form: the module form
        :param topics: the inline topics formset
        :param args:
        :param kwargs:
        :return:
        '''

        try:
            with transaction.atomic():

                # instance the module and set the created-by and updated-by fields
                new_module = form.save(commit=False)
                new_module.created_by = self.request.user
                new_module.changed_by = self.request.user

                # save the module
                new_module.save()

                # for each topic in the topics formset
                #print('adding topics (num): ', len(topics.forms))
                for topic_index, topic in enumerate(topics):

                    # instance the topic, set its module, created_by, and changed_by fields
                    new_topic = topic.save(commit=False)

                    #print("creating topic: ", new_topic.name)
                    new_topic.module = new_module
                    new_topic.created_by = self.request.user
                    new_topic.changed_by = self.request.user
                    new_topic.position = topic_index

                    # save the topic and it's many-to-many relationships (tags)
                    new_topic.save()
                    topic.save_m2m() # needed to save the tags

                    #print('adding lessons (num): ', len(topic.child_lessons.forms))

                    # for each section in the current topic
                    for lesson_index, lesson in enumerate(topic.child_lessons):
                        # instance the section and set its parent topic, created_by, and changed_by fields
                        new_lesson = lesson.save(commit=False)

                        new_lesson.topic = new_topic
                        new_lesson.created_by = self.request.user
                        new_lesson.changed_by = self.request.user
                        new_lesson.position = lesson_index

                        # save the section and it's many-to-many fields (tags)
                        new_lesson.save()
                        lesson.save_m2m()

                        #print('adding sections (num): ', len(lesson.child_sections.forms))

                        # for each section in the current topic
                        for section_index, section in enumerate(lesson.child_sections):
                            # instance the section and set its parent topic, created_by, and changed_by fields
                            new_section = section.save(commit=False)

                            new_section.lesson = new_lesson
                            new_section.created_by = self.request.user
                            new_section.changed_by = self.request.user
                            new_section.position = section_index

                            # save the section and it's many-to-many fields (tags)
                            new_section.save()
                            section.save_m2m()



            #print("returning success")
            messages.success(self.request, _("Successfully created Module:'%s'" % new_module.name))

        except ValidationError as err:
            # if there was an error at any point while saving the module or its child formset
            form.add_error(_('The submitted form is invalid'))
            #print("...returning invalid")

            return self.form_invalid(form, topics)


        return super(manage_ModuleCreateView, self).form_valid(form)

class manage_ModuleEditView(LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, AjaxableResponseMixin, UpdateView):
    model = Module
    template_name = 'manage/forms/module_form.html'
    form_class = manage_ModuleForm
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
        Topic_formset = inlineTopicFormset(instance=self.object)
        return self.render_to_response(
            self.get_context_data(form=form,
                                  Topics=Topic_formset,
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
        Topic_formset = inlineTopicFormset(self.request.POST, instance=self.object)
        if form.is_valid() and Topic_formset.is_valid():
            return self.form_valid(form, Topic_formset)
        else:
            return self.form_invalid(form, Topic_formset)


    def form_invalid(self, form, topics, *args, **kwargs):
        #print("xxxxxxxx in custom edit form_invalid xxxxxxxx")

        # trigger a full clean on the topics/child sections to populate form errors

        #[section_fs.errors for section_fs in [form.child_sections for form in topics.forms]]
        #[lesson_fs.errors for lesson_fs in [form.child_lessons for form in topics.forms]]

        error_collection = [{
            "errors": topicForm.errors.as_json(),

            "formset": [{
                "errors": lessonForm.errors.as_json(),
                "formset": [{
                    "errors": sectionForm.errors.as_json(),
                } for sectionForm in lessonForm.child_sections.forms]
            } for lessonForm in topicForm.child_lessons.forms]

        } for topicForm in topics.forms]

        self.ajax_error_dict = {
            "errors": form.errors.as_json(),
            "formset": error_collection,
        }

        return super(manage_ModuleEditView, self).form_invalid(form)

    def form_valid(self, form, topics):

        try:
            with transaction.atomic():

                # instantiate the module and set it's changed_by field
                new_module = form.save(commit=False)
                new_module.changed_by = self.request.user

                # save the module and its many-to-many relations (tags)
                new_module.save()
                form.save_m2m()


                # instantiate the topic instances (contains both edited/new topics)
                topics.save(commit=False)

                # if any of the submitted topics are new, add in the 'created_by' value
                #   and set module to current
                for new_topic in topics.new_objects:
                    new_topic.created_by = self.request.user

                # delete any topics marked for deletion
                for deleted_topic in topics.deleted_objects:
                    deleted_topic.delete()

                #for changed_topic in topic_instances: # changed topic is a topic instance
                for changed_topic in topics: # changed topic is a topic form

                    if not changed_topic.cleaned_data.get(DELETION_FIELD_NAME):
                        # get the current topic instance
                        curr_topic = changed_topic.save(commit=False)

                        # set who has just updated this topic
                        curr_topic.changed_by = self.request.user


                        # save the instance and it's m2m relationships (tags)
                        curr_topic.save()
                        changed_topic.save_m2m()  # needed to save the tags

                        # if there are child sections in this topic process them as well
                        if changed_topic.child_lessons.forms:

                            # instantiate the child section
                            changed_topic.child_lessons.save(commit=False)

                            # if there are any new sections, add in the created_by value
                            for new_lesson in changed_topic.child_lessons.new_objects:
                                new_lesson.created_by = self.request.user
                                new_lesson.topic = curr_topic

                            for deleted_lesson in changed_topic.child_lessons.deleted_objects:
                                deleted_lesson.delete()

                            for changed_lesson in changed_topic.child_lessons:

                                if not changed_lesson.cleaned_data.get(DELETION_FIELD_NAME):
                                    # instantiate the edited section
                                    curr_lesson = changed_lesson.save(commit=False)

                                    # set changed_by
                                    curr_lesson.changed_by = self.request.user

                                    # save the section
                                    curr_lesson.save()
                                    changed_lesson.save_m2m()

                                    # if there are child sections in this topic process them as well
                                    if changed_lesson.child_sections.forms:

                                        # instantiate the child section
                                        changed_lesson.child_sections.save(commit=False)

                                        # if there are any new sections, add in the created_by value
                                        for new_section in changed_lesson.child_sections.new_objects:
                                            new_section.created_by = self.request.user
                                            new_section.topic = curr_topic

                                        for deleted_section in changed_lesson.child_sections.deleted_objects:
                                            deleted_section.delete()

                                        for changed_section in changed_lesson.child_sections:

                                            if not changed_section.cleaned_data.get(DELETION_FIELD_NAME):
                                                # instantiate the edited section
                                                curr_section = changed_section.save(commit=False)

                                                # set changed_by
                                                curr_section.changed_by = self.request.user

                                                # save the section
                                                curr_section.save()
                                                changed_section.save_m2m()



        except ValidationError as err:
            # if there was an error at any point during save of module or topic formset
            form.add_error(None, _("There are errors in child forms."))
            form.add_error(None, _(err))
            return self.form_invalid(form)

        messages.success(self.request, _("Successfully edited Module:'%s'" % new_module.name))
        return super(manage_ModuleEditView,self).form_valid(form)

class manage_ModulePublishIndex(LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, DetailView):
    template_name = 'manage/forms/module_publication_index.html'
    success_url = '/manage/'
    model = Module

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


class manage_ModulePublish(LoginRequiredMixin, FormView):
    template_name = 'manage/forms/module_publish_form.html'
    form_class = Module_ActionConfirmationForm
    success_url = '/manage/'

    def form_valid(self, form):

        if 'publish' in self.request.POST:

            draft_instance = get_object_or_404(Module, slug=self.kwargs['slug'])
            draft_instance.publish()


        if 'unpublish' in self.request.POST:

            draft_instance = get_object_or_404(Module, slug=self.kwargs['slug'])
            draft_instance.unpublish()

        if 'revert' in self.request.POST:

            draft_instance = get_object_or_404(Module, slug=self.kwargs['slug'])
            draft_instance.revert_to_live()

        return super(manage_ModulePublish, self).form_valid(form)

    def form_invalid(self, form, **kwargs):
        return super(manage_ModulePublish, self).form_invalid(form)


class manage_ModuleDeleteView(LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, DeleteView):
    model = Module
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

class manage_ModuleShareView(LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, TemplateView):
    template_name = 'manage/partials/_module_shared_list.html'

###############################################################################
###                 CONTENT EDITING VIEWS                                   ###
###############################################################################
class manage_ModuleContent(OwnershipRequiredMixin, PublicationViewMixin, DetailView):
    model = Module
    template_name = "manage/module_detail.html"

    def get_context_data(self, **kwargs):
        context = super(manage_ModuleContent, self).get_context_data(**kwargs)
        context['edit'] = True
        return context


class manage_TopicContent(OwnershipRequiredMixin, PublicationChildViewMixin, DetailView):
    model = Topic
    template_name = "manage/topic_detail.html"

    def get_context_data(self, **kwargs):
        context = super(manage_TopicContent, self).get_context_data(**kwargs)
        context['edit'] = True
        return context

class manage_LessonContent(OwnershipRequiredMixin, PublicationChildViewMixin, DetailView):
    model = Lesson
    template_name = "manage/lesson_detail.html"

    def get_context_data(self, **kwargs):
        context = super(manage_LessonContent, self).get_context_data(**kwargs)
        context['edit'] = True
        return context

class manage_SectionContent(OwnershipRequiredMixin, PublicationChildViewMixin, DetailView):
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

def module_success(request):

    template_name = 'manage/partials/_edit_successful.html'
    return render_to_response(template_name)

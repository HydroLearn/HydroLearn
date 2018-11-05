import json

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse, reverse_lazy
from django.db import transaction
from django.forms.formsets import DELETION_FIELD_NAME
from django.template import RequestContext
from django.utils.translation import gettext as _

from django.views.generic import (
    DetailView,
    ListView,
    TemplateView,
    CreateView,
    UpdateView,
    DeleteView)

from django.http import JsonResponse, Http404, HttpResponseNotFound, HttpResponse
from django.shortcuts import redirect, render, get_object_or_404, render_to_response
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
#from django.views.generic.base import TemplateResponseMixin


from src.apps.core.models.ModuleModels import (
    Lesson,
    Section,
)

from src.apps.editor.editor_queries import (
    get_editor_TOC_obj,
    get_lesson_JSON_RAW, get_section_JSON_RAW)

from src.apps.editor.forms import (

    inlineLessonFormset,
    inlineSectionFormset,
    editor_LessonForm,
    editor_SectionForm,
    editor_ReadingSectionForm,
    editor_ActivitySectionForm,
    editor_QuizSectionForm,

)

from src.apps.core.views.PublicationViews import (
    PublicationViewMixin,
    PublicationChildViewMixin,
    DraftOnlyViewMixin)

from src.apps.core.views.mixins import AjaxableResponseMixin, OwnershipRequiredMixin

#####################################################
# CREATE VIEWS
#####################################################

class editor_LessonCreateView(LoginRequiredMixin, AjaxableResponseMixin, CreateView):
    model = Lesson
    context_object_name = 'Lesson'
    template_name = 'editor/forms/_lesson_form.html'
    form_class = editor_LessonForm

    def get_context_data(self, **kwargs):
        context = super(editor_LessonCreateView, self).get_context_data(**kwargs)

        # add context variable for if this form is instanced
        context['is_instance'] = False
        return context

    def get_success_return_data(self,form):
        return {
            "slug": form.instance.slug,
             "updated_toc_obj": get_lesson_JSON_RAW(form.instance.slug),
        }

    def get_failed_return_data(self, form):
        return {
            "errors": form.errors.as_json(),
        }

    def form_valid(self, form, *args, **kwargs):

        # Find parent_lesson by using the passed slug in the URL
        # this view may be called with or without specifying a parent lesson,
        #   depending on if the
        if self.kwargs.get('parent_lesson',None):
            parent_lesson = get_object_or_404(Lesson, slug=self.kwargs['parent_lesson'])

            if parent_lesson and parent_lesson.has_draft_access(self.request.user):
                new_lesson = form.save(commit=False)
                new_lesson.parent_lesson = parent_lesson
            else:
                form.add_error(None, 'Submission error! Either the parent lesson you are attempting to save to does not exist, or you do not have edit permissions!')
                return self.form_invalid(form)


        return super(editor_LessonCreateView, self).form_valid(form, *args, **kwargs)


    def form_invalid(self, form, *args, **kwargs):
        return super(editor_LessonCreateView, self).form_invalid(form, *args, **kwargs)

class editor_SectionCreateView(LoginRequiredMixin, AjaxableResponseMixin, CreateView):
    model = Section
    context_object_name = 'Section'
    template_name = 'editor/forms/_section_form.html'
    form_class = editor_SectionForm

    def get_context_data(self, **kwargs):
        context = super(editor_SectionCreateView, self).get_context_data(**kwargs)

        # add context variable for if this form is instanced
        context['is_instance'] = False
        return context

    # override get_form_class to grab the correct form based on polymorphic content type
    def get_form_class(self):
        # return the correct form class depending on the type specified in the kwarg argument
        if self.kwargs.get('section_type', None):
            return {
                'reading_section': editor_ReadingSectionForm,
                'activity_section': editor_ActivitySectionForm,
                'quiz_section': editor_QuizSectionForm,
            }.get(self.kwargs.get('section_type'))
        else:
            return None


    # override get_template_names to grab the correct template based on polymorphic content type
    def get_template_names(self):
        # return the correct template depending on the type specified in the kwarg argument
        if self.kwargs.get('section_type', None):
            return {
                'reading_section': 'editor/forms/_reading_section_form.html',
                'activity_section': 'editor/forms/_activity_section_form.html',
                'quiz_section': 'editor/forms/_quiz_section_form.html',
            }.get(self.kwargs.get('section_type'))
        else:
            return None


    def get_success_return_data(self,form):
        return {
            "slug": form.instance.slug,
             "updated_toc_obj": get_section_JSON_RAW(form.instance.slug),
        }

    def get_failed_return_data(self, form):
        return {
            "errors": form.errors.as_json(),
        }

    def form_valid(self, form, *args, **kwargs):

        # Find parent_lesson by using the passed slug in the URL
        # this view may be called with or without specifying a parent lesson,
        #   depending on if the
        if self.kwargs.get('parent_lesson', None):
            parent_lesson = get_object_or_404(Lesson, slug=self.kwargs['parent_lesson'])

            if parent_lesson and parent_lesson.has_draft_access(self.request.user):
                new_section = form.save(commit=False)
                new_section.lesson = parent_lesson
            else:
                form.add_error(None, 'Submission error! Either the parent lesson you are attempting to save to does not exist, or you do not have edit permissions!')
                return self.form_invalid(form)

        return super(editor_SectionCreateView, self).form_valid(form, *args, **kwargs)

    def form_invalid(self, form, *args, **kwargs):
        return super(editor_SectionCreateView, self).form_invalid(form, *args, **kwargs)


#####################################################
# UPDATE VIEWS
#####################################################

class editor_LessonUpdateView(OwnershipRequiredMixin, AjaxableResponseMixin, UpdateView):
    model = Lesson
    context_object_name = 'Lesson'
    template_name = 'editor/forms/_lesson_form.html'
    form_class = editor_LessonForm


    # def delete_obj(self, form):
    #     self.get_object().delete()
    #
    #     payload = {
    #         'success': True,
    #         'message': _("Success! The object was deleted."),
    #         'data': {},
    #     }
    #
    #     return HttpResponse(json.dumps(payload), content_type='application/json')


    def get_context_data(self, **kwargs):
        context = super(editor_LessonUpdateView, self).get_context_data(**kwargs)

        # add context variable for if this form is instanced
        context['is_instance'] = True

        context['manage_view'] = self.object.manage_url

        return context

    def get_success_return_data(self,form):
        return {
            "slug": form.instance.slug,
             "updated_toc_obj": get_lesson_JSON_RAW(form.instance.slug),
        }

    def get_failed_return_data(self, form):
        return {
            "errors": form.errors.as_json(),
        }

    def form_valid(self, form, *args, **kwargs):
        return super(editor_LessonUpdateView, self).form_valid(form, *args, **kwargs)

    def form_invalid(self, form, *args, **kwargs):
        return super(editor_LessonUpdateView, self).form_invalid(form, *args, **kwargs)

class editor_SectionUpdateView(OwnershipRequiredMixin, AjaxableResponseMixin, UpdateView):
    model = Section
    context_object_name = 'Section'
    template_name = 'editor/forms/_section_form.html'
    form_class = editor_SectionForm

    def get_context_data(self, **kwargs):
        context = super(editor_SectionUpdateView, self).get_context_data(**kwargs)

        # add context variable for if this form is instanced
        context['is_instance'] = True

        context['manage_view'] = self.object.manage_url

        return context

    def get_success_return_data(self,form):
        return {
            "slug": form.instance.slug,
             "updated_toc_obj": get_section_JSON_RAW(form.instance.slug),
        }

    def get_failed_return_data(self, form):
        return {
            "errors": form.errors.as_json(),
        }

    def form_valid(self, form, *args, **kwargs):
        return super(editor_SectionUpdateView, self).form_valid(form, *args, **kwargs)

    def form_invalid(self, form, *args, **kwargs):
        return super(editor_SectionUpdateView, self).form_invalid(form, *args, **kwargs)

    # override get_form_class to grab the correct form based on polymorphic content type
    def get_form_class(self):
        c_type = str(ContentType.objects.get_for_id(self.get_object().polymorphic_ctype_id))

        return {
            'Reading Section':  editor_ReadingSectionForm,
            'Activity Section': editor_ActivitySectionForm,
            'Quiz Section':     editor_QuizSectionForm,
        }.get(c_type, editor_ReadingSectionForm)

    # override get_template_names to grab the correct template based on polymorphic content type
    def get_template_names(self):
        c_type = str(ContentType.objects.get_for_id(self.get_object().polymorphic_ctype_id))

        return {
            'Reading Section': 'editor/forms/_reading_section_form.html',
            'Activity Section': 'editor/forms/_activity_section_form.html',
            'Quiz Section': 'editor/forms/_quiz_section_form.html',
        }.get(c_type, 'editor/forms/_reading_section_form.html')


#####################################################
# DELETE VIEWS
#####################################################

class editor_LessonDeleteView(OwnershipRequiredMixin, DraftOnlyViewMixin, AjaxableResponseMixin, DeleteView):
    model = Lesson
    context_object_name = 'Lesson'
    template_name = "editor/forms/_lesson_confirm_delete.html"
    success_url = '/editor/success'


    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class editor_SectionDeleteView(OwnershipRequiredMixin, DraftOnlyViewMixin, AjaxableResponseMixin, DeleteView):
    model = Section
    context_object_name = 'Section'
    template_name = "editor/forms/_section_confirm_delete.html"
    success_url = '/editor/success'

# DETAIL INHERITs:  (LoginRequiredMixin, PublicationViewMixin, DetailView)
# CREATE INHERITs:  (LoginRequiredMixin, AjaxableResponseMixin, CreateView)
# EDIT INHERITs:    (LoginRequiredMixin, PublicationViewMixin, OwnershipRequiredMixin, AjaxableResponseMixin, UpdateView)


class editor_LessonView(LoginRequiredMixin, PublicationViewMixin, DraftOnlyViewMixin, DetailView):
    model = Lesson
    context_object_name = 'Lesson'
    template_name = 'editor/viewer/edit_index.html'


    def get(self, request, *args, **kwargs):

        # TODO: THIS IS HACKY, FIND A BETTER WAY
        #   when submitting through the content edit iframe
        #   the edit flag is passed, if this happens
        #   the toolbar throws an error
        if self.request.GET.get('edit', None) is not None:
            # DESCRIPTION :
            #   if this exception is raised, the editor just submitted
            #   a form and is attempting to refresh, but since there
            #   is an extra 'edit' parameter, the CMS toolbar fails to initialize correctly
            #   resulting in a non initialized page being presented to the user
            #
            #   to prevent breaking workflow, raise an error here which
            #   triggers the default behavior of reloading the page
            #       (without the parameter)
            raise Exception('KNOWN ERROR (editor_LessonView): Error Triggers necessary reloading of an edited lesson/section in frontend.')



        return super(editor_LessonView, self).get(request,*args,**kwargs)
    #form_class = editor_LessonForm
    # ajax response mixin parameter
    #ajax_success_redirect = reverse_lazy("manage:manage_index")

    def get_context_data(self, **kwargs):
        context = super(editor_LessonView, self).get_context_data(**kwargs)

        # self.request.toolbar.edit_mode = False
        # self.request.toolbar.edit_mode_active = False

        # get the current editor's child topics based on editor slug
        # layers = get_module_layers(self.kwargs.get('slug'))
        # context['layers'] = layers
        context['loaded_section'] = self.request.GET.get('v', '')
        context['TOC_Listing'] = get_editor_TOC_obj(self.kwargs.get('slug'))

        # TODO: add in listing of section types to context
        # {
        #   ctype: verbose_name
        # }

        #context['is_dirty'] = self.object.is_dirty

        return context

class editor_NewLessonView(LoginRequiredMixin, TemplateView):
    #model = Lesson
    context_object_name = 'Lesson'
    template_name = 'editor/viewer/edit_index.html'

    #form_class = editor_LessonForm
    # ajax response mixin parameter
    #ajax_success_redirect = reverse_lazy("manage:manage_index")

    def get_context_data(self, **kwargs):
        context = super(editor_NewLessonView, self).get_context_data(**kwargs)

        # get the current editor's child topics based on editor slug
        # layers = get_module_layers(self.kwargs.get('slug'))
        # context['layers'] = layers
        context['loaded_section'] = self.request.GET.get('v', '')
        context['TOC_Listing'] = get_editor_TOC_obj("")

        # TODO: add in listing of section types to context
        # {
        #   ctype: verbose_name
        # }

        #context['is_dirty'] = self.object.is_dirty

        return context


def submission_success(request):
    template_name = 'editor/forms/_success.html'
    return render_to_response(template_name)
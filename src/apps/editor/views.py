import json

from django import forms
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse, reverse_lazy
from django.db import transaction
from django.forms.formsets import DELETION_FIELD_NAME
from django.template import RequestContext
from django.utils.translation import gettext as _
from django.utils.timezone import now


from django.views.generic import (
    DetailView,
    TemplateView,
    CreateView,
    UpdateView,
    DeleteView, FormView)

from django.http import JsonResponse, Http404, HttpResponseNotFound
from django.shortcuts import redirect, render, get_object_or_404, render_to_response
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
#from django.views.generic.base import TemplateResponseMixin


from src.apps.core.models.ModuleModels import (
    Lesson,
    Section,
    Collaboration,
)

from src.apps.editor.editor_queries import (
    get_editor_TOC_obj,
    get_lesson_JSON_RAW, get_section_JSON_RAW)

from src.apps.editor.forms import (

    editor_LessonForm,
    editor_SectionForm,
    editor_ReadingSectionForm,
    editor_ActivitySectionForm,
    editor_QuizSectionForm,
    # editor_ExportLessonForm,
    # editor_ImportLessonForm,

)

from src.apps.core.views.PublicationViews import (
    PublicationViewMixin,
    PublicationChildViewMixin,
    DraftOnlyViewMixin)

from src.apps.core.views.mixins import (
    AjaxableResponseMixin,
    OwnershipRequiredMixin,
    CollabViewAccessMixin,
)

from src.apps.core.forms import ResourceInline



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

        # if there is a parent lesson specified in request
        if self.kwargs.get('parent_lesson', None):

            # check that the user has edit access to the parent lesson
            parent_lesson = get_object_or_404(Lesson, slug=self.kwargs['parent_lesson'])

            if parent_lesson and parent_lesson.has_edit_access(self.request.user):
                context['edit_access'] = True
            else:
                context['edit_access'] = False
                context[
                    'manage_denied_message'] = "You cannot add to this lesson without editor access! ! If you require edit access, please contact the owner."
        else:
            # otherwise this is a new lesson the user is creating (grant edit permissions)
            context['edit_access'] = True


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

        # if there is a parent lesson specified in request
        if self.kwargs.get('parent_lesson', None):

            # check that the user has edit access to the parent lesson
            parent_lesson = get_object_or_404(Lesson, slug=self.kwargs['parent_lesson'])

            if parent_lesson and parent_lesson.has_edit_access(self.request.user):
                context['edit_access'] = True

                if self.kwargs.get('section_type', None) == 'activity_section':
                    context['resources'] = ResourceInline(self.request.POST or None)
                else:
                    context['resources'] = None
            else:
                context['edit_access'] = False
                context['manage_denied_message'] = "You cannot add to this lesson without editor access! ! If you require edit access, please contact the owner."
        else:
            # otherwise this is a new lesson the user is creating (grant edit permissions)
            context['edit_access'] = True

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
        with transaction.atomic():
            if self.kwargs.get('parent_lesson', None):
                parent_lesson = get_object_or_404(Lesson, slug=self.kwargs['parent_lesson'])

                if parent_lesson and parent_lesson.has_draft_access(self.request.user):
                    new_section = form.save(commit=False)
                    new_section.lesson = parent_lesson

                    context = self.get_context_data(**kwargs)

                    # if there are resources for this section process them
                    if context['resources']:
                        resources_fs = context['resources']

                        if resources_fs.is_valid():

                            resources_fs.instance = new_section
                            #resources = resources_fs.save()

                            new_section.save()
                            resources_fs.save()

                            form.save_m2m()

                        else:
                            return self.form_invalid(form, *args, **kwargs)


                else:
                    form.add_error(None, 'Submission error! Either the parent lesson you are attempting to save to does not exist, or you do not have edit permissions!')
                    return self.form_invalid(form)






        return super(editor_SectionCreateView, self).form_valid(form, *args, **kwargs)

    def form_invalid(self, form, *args, **kwargs):
        return super(editor_SectionCreateView, self).form_invalid(form, *args, **kwargs)


#####################################################
# UPDATE VIEWS
#####################################################

class editor_LessonUpdateView(CollabViewAccessMixin, AjaxableResponseMixin, UpdateView):
    model = Lesson
    context_object_name = 'Lesson'
    template_name = 'editor/forms/_lesson_form.html'
    form_class = editor_LessonForm


    def get_context_data(self, **kwargs):
        context = super(editor_LessonUpdateView, self).get_context_data(**kwargs)

        # add context variable for if this form is instanced
        context['is_instance'] = True

        # if the current user has edit access to this view
        # pass the manage url, otherwise just pass the module
        #can_edit = Collaboration.objects.filter(publication_id=self.object.pk, collaborator_id=self.request.user.pk, can_edit=True).exists()

        edit_access = self.object.has_edit_access(self.request.user)
        context['edit_access'] = edit_access

        if edit_access:
            context['content_view'] = self.object.manage_url
        else:
            context['manage_denied_message'] = "You can view this Lesson, but don't have edit access! If you require edit access, please contact the owner."
            context['content_view'] = reverse('modules:lesson_content', kwargs={ 'slug': self.object.slug })

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

class editor_SectionUpdateView(CollabViewAccessMixin, AjaxableResponseMixin, UpdateView):
    model = Section
    context_object_name = 'Section'
    template_name = 'editor/forms/_section_form.html'
    form_class = editor_SectionForm

    def section_type(self):
        '''
            method to check the current view object's polymorphic type
            and return the string representation
        '''
        c_type = str(ContentType.objects.get_for_id(self.get_object().polymorphic_ctype_id))

        return {
            'Reading Section':  'reading_section',
            'Activity Section': 'activity_section',
            'Quiz Section':     'quiz_section',
        }.get(c_type, None)


    def get_context_data(self, **kwargs):
        context = super(editor_SectionUpdateView, self).get_context_data(**kwargs)

        # add context variable for if this form is instanced
        context['is_instance'] = True

        edit_access = self.object.has_edit_access(self.request.user)
        context['edit_access'] = edit_access

        if edit_access:
            context['content_view'] = self.object.manage_url

            if self.section_type() == "activity_section":
                context['resources'] = ResourceInline(self.request.POST or None, instance=self.object)
            else:
                context['resources'] = None

        else:
            context['manage_denied_message'] = "You can view this Section, but don't have edit access! If you require edit access, please contact the owner."
            context['content_view'] = reverse('modules:section_content', kwargs={'lesson_slug': self.object.lesson.slug,'slug': self.object.slug})

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

        with transaction.atomic():

            section = form.save(commit=False)

            context = self.get_context_data(**kwargs)

            # if there are resources for this section process them
            if context['resources']:
                resources_fs = context['resources']

                if resources_fs.is_valid():
                    resources = resources_fs.save(commit=False)

                    # delete any collabs marked for deletion
                    for deleted_res in resources_fs.deleted_objects:
                        deleted_res.delete()

                    for res in resources:
                        res.save()

                    section.save()
                    form.save_m2m()

                else:
                    return self.form_invalid(form,*args, **kwargs)






        return super(editor_SectionUpdateView, self).form_valid(form, *args, **kwargs)

    def form_invalid(self, form, *args, **kwargs):
        return super(editor_SectionUpdateView, self).form_invalid(form, *args, **kwargs)

    # override get_form_class to grab the correct form based on polymorphic content type
    def get_form_class(self):
        return {
            'reading_section':  editor_ReadingSectionForm,
            'activity_section': editor_ActivitySectionForm,
            'quiz_section':     editor_QuizSectionForm,
        }.get(self.section_type(), editor_ReadingSectionForm)

    # override get_template_names to grab the correct template based on polymorphic content type
    def get_template_names(self):

        return {
            'reading_section': 'editor/forms/_reading_section_form.html',
            'activity_section': 'editor/forms/_activity_section_form.html',
            'quiz_section': 'editor/forms/_quiz_section_form.html',
        }.get(self.section_type(), 'editor/forms/_reading_section_form.html')


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

        # if accessing this page out of edit mode trigger a redirect
        # edit enabled view
        if not self.request.toolbar.edit_mode_active:
            current_partial = request.GET.get('v','')
            return redirect(self.request.path_info + '?edit&v=' + current_partial)


        # TODO: THIS IS HACKY, FIND A BETTER WAY
        #   the only current instance of this view being called via ajax
        #   is through submission of CMS content editor
        #
        #   if treated normally this causes a javascript error which
        #   breaks the page
        #   to maintain workflow throw an error which triggers the CMS method
        #   to do a full refresh
        if self.request.is_ajax():
            raise Exception(
                'KNOWN ERROR (editor_LessonView): Error Triggers necessary reloading of an edited lesson/section in frontend.')

        return super(editor_LessonView, self).get(request,*args,**kwargs)

    def get_context_data(self, **kwargs):
        context = super(editor_LessonView, self).get_context_data(**kwargs)

        # self.request.toolbar.edit_mode = False
        # self.request.toolbar.edit_mode_active = False

        # get the current editor's child topics based on editor slug
        # layers = get_module_layers(self.kwargs.get('slug'))
        # context['layers'] = layers
        context['loaded_section'] = self.request.GET.get('v', '')
        context['has_edit_access'] = self.object.has_edit_access(self.request.user)
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


#####################################################
# Import Export views
#####################################################
class editor_LessonExportView(LoginRequiredMixin, PublicationViewMixin, DraftOnlyViewMixin, AjaxableResponseMixin, FormView):
    #form_class = editor_ExportLessonForm
    template_name = "editor/forms/_export_form.html"
    success_url = '/manage/'

    def get_form_class(self):

        class editor_ExportLessonForm(forms.Form):
            exported_lesson = forms.CharField(
                    initial=self.kwargs.get('slug'),
                    widget=forms.HiddenInput()
                )
            retain_copy = forms.BooleanField(
                    initial=False,
                    required=False,
                    label="Retain Instance",
                    help_text="Checking this option will copy the selected lesson to it's own module, but will also retain the current copy as part of this module.",
                )


        return editor_ExportLessonForm

    def get_context_data(self, **kwargs):
        context = super(editor_LessonExportView, self).get_context_data(**kwargs)

        context['Lesson'] = Lesson.objects.get(slug=self.kwargs.get('slug'))

        return context

    def save_sub_lessons(self, lesson):
        '''
            method to recursively save sublessons, this will trigger updates to
            depth/depth_label fields in child objects of lesson
        :param lesson: lesson to save sub_lessons for
        :return: None
        '''

        for sub in lesson.sub_lessons.all():
            sub.save()
            self.save_sub_lessons(sub)


    def success_message(self):
        return _('Module Successfully Exported! Return to the Manage page if you wish to edit it.')

    def failed_message(self):
        return _('Export Failed! A problem was detected when exporting your module. Please correct any errors before attempting another export.')

    def get_success_return_data(self, form):
        return {
            'retained_lesson': form.cleaned_data.get('retain_copy'),
            'exported_slug': form.cleaned_data.get('exported_lesson'),
        }

    def get_failed_return_data(self, form):
        return super(editor_LessonExportView,self).get_failed_return_data(form)

    def form_valid(self, form):

        with transaction.atomic():

            exported_slug = form.cleaned_data.get('exported_lesson')
            retained = form.cleaned_data.get('retain_copy', False)
            exported_lesson = Lesson.objects.get(slug=exported_slug)

            # ensure user has edit permission for the lesson being exported
            if self.request.user != exported_lesson.get_owner():
                form.add_error(None, "You must own this lesson to export it! Export Canceled!")
                return self.form_invalid(form)

            # ensure not exporting a root module
            if exported_lesson.depth == 0:
                form.add_error(None, "You cannot export a root module! Export Canceled!")
                return self.form_invalid(form)

            if retained:

                # if retaining the lesson being exported, generate a copy
                new_copy = exported_lesson.copy()

                new_copy.created_by = self.request.user
                new_copy.parent_lesson = None
                new_copy.position = 0

                new_copy.save()
                new_copy.copy_content(exported_lesson)
                new_copy.copy_children(exported_lesson)

            else:
                # otherwise just remove the parent reference and save
                exported_lesson.parent_lesson = None
                exported_lesson.position = 0
                exported_lesson.save()

                # being that the depth has changed with the export
                # the child lessons must be saved to update their depths as well
                self.save_sub_lessons(exported_lesson)



        return super(editor_LessonExportView, self).form_valid(form)

    def form_invalid(self, form):
        return super(editor_LessonExportView, self).form_invalid(form)


class editor_LessonImportView(LoginRequiredMixin, PublicationViewMixin, DraftOnlyViewMixin, AjaxableResponseMixin, FormView):
    #form_class = editor_ImportLessonForm
    template_name = "editor/forms/_import_form.html"
    success_url = '/manage/'

    imported_lesson_slug_return = ""


    def get_form_class(self):

        # since this form view requires the current user for
        #   generating a queryset, a specialized form must be defined
        #   to set queryset for 'import_lesson'
        class editor_ImportLessonForm(forms.Form):
            import_lesson = forms.ModelChoiceField(
                    queryset=self.request.user.created_lessons.filter(depth=0).drafts().order_by('-changed_date'),
                    help_text="Select which of your Modules to import",
                    required=True,
                )
            retain_copy = forms.BooleanField(
                    initial=False,
                    required=False,
                    label="Retain Instance?",
                    help_text="Checking this option will copy the selected Lesson to this module, but will also retain the current External copy as it's own module."
                )



        return editor_ImportLessonForm

    def get_context_data(self, **kwargs):
        context = super(editor_LessonImportView, self).get_context_data(**kwargs)
        context['Lesson'] = Lesson.objects.get(slug=self.kwargs.get('slug'))

        return context

    def save_sub_lessons(self, lesson):
        '''
            method to recursively save sublessons, this will trigger updates to
            depth/depth_label fields in child objects of lesson
        :param lesson: lesson to save sub_lessons for
        :return: None
        '''

        for sub in lesson.sub_lessons.all():
            sub.save()
            self.save_sub_lessons(sub)

    def success_message(self):
        return _('Module Successfully Imported!')

    def failed_message(self):
        return _('Import Failed! A problem was detected while importing your module. Please correct any errors before trying again.')

    def get_success_return_data(self, form):
        return {
            #'imported_lesson_slug': form.cleaned_data.get('import_lesson').slug,
            'imported_lesson_slug': self.imported_lesson_slug_return,

        }

    def get_failed_return_data(self, form):
        return super(editor_LessonImportView, self).get_failed_return_data(form)

    def form_valid(self, form):

        with transaction.atomic():

            # get form data
            imported_lesson = form.cleaned_data.get('import_lesson')
            retained = form.cleaned_data.get('retain_copy', False)

            # grab specified objects for transaction
            parent_lesson = Lesson.objects.get(slug=self.kwargs.get('slug'))


            # check user has draft permissions to the parent object, and the imported object
            if self.request.user != parent_lesson.get_owner():
                form.add_error(None, "Only the owner can import Modules! Import Canceled!")
                return self.form_invalid(form)

            if self.request.user != imported_lesson.get_owner():
                form.add_error(None, "You must own the Module being Imported! Import Canceled!")
                return self.form_invalid(form)

            # ensure not trying to import into self...
            if imported_lesson.slug == parent_lesson.slug:
                form.add_error(None, "You cannot import a module into itself! Import Canceled!")
                return self.form_invalid(form)

            # check depth return invalid if total depth > 2
            child_total_depth = imported_lesson.total_depth
            if child_total_depth + parent_lesson.depth > 2:
                form.add_error(None, "The Lesson being imported has too many children (%s) to be added to this lesson. Import Canceled!" % child_total_depth)
                return self.form_invalid(form)


            if retained:
                # if retaining the lesson being imported generate a copy
                new_copy = imported_lesson.copy()

                new_copy.created_by = self.request.user
                new_copy.parent_lesson = parent_lesson
                new_copy.position = parent_lesson.num_children

                new_copy.save()
                new_copy.copy_content(imported_lesson)
                new_copy.copy_children(imported_lesson)

                # set the return slug for this view
                self.imported_lesson_slug_return = new_copy.slug

            else:
                # otherwise just move the imported lesson into the parent lesson
                imported_lesson.parent_lesson = parent_lesson
                imported_lesson.position = parent_lesson.num_children
                imported_lesson.save()

                self.save_sub_lessons(imported_lesson)

                self.imported_lesson_slug_return = imported_lesson.slug



        return super(editor_LessonImportView, self).form_valid(form)

    def form_invalid(self, form):
        return super(editor_LessonImportView, self).form_invalid(form)


    #####################################################
# Generic Partial Views
#####################################################

def submission_success(request):
    template_name = 'editor/forms/_success.html'
    return render_to_response(template_name)
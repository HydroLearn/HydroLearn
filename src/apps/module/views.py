from django.core.urlresolvers import reverse, reverse_lazy
from django.template import RequestContext
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse, Http404, HttpResponseNotFound
from django.shortcuts import redirect, render, get_object_or_404
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType

from src.apps.core.models.ModuleModels import (
    # Module,
    # Topic,
    Lesson,
    Section,
)

# from src.apps.core.models.section_types import (
#     ActivitySection,
#     QuizSection,
#     ReadingSection,
# )

from src.apps.core.model_queries import (
    get_module_TOC_obj
)
from src.apps.core.views.PublicationViews import PublicationViewMixin, PublicationChildViewMixin


class module_LessonDetailView(PublicationViewMixin, DetailView):
    model = Lesson
    context_object_name = 'module'
    template_name = 'module/viewer/module_index.html'

    def get_context_data(self, **kwargs):
        context = super(module_LessonDetailView, self).get_context_data(**kwargs)

        # get the current module's child topics based on module slug
        # layers = get_module_layers(self.kwargs.get('slug'))
        # context['layers'] = layers
        context['loaded_section'] = self.request.GET.get('v', '')
        context['TOC_Listing'] = get_module_TOC_obj(self.kwargs.get('slug'))

        context['is_dirty'] = self.object.is_dirty

        return context

    def render_to_response(self, context, **response_kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)

        #========================= Add menu item for adding sections to current module
        #if self.request.toolbar and self.request.toolbar.edit_mode:
            #menu = self.request.toolbar.get_or_create_menu('module-menu', "Edit this Module")
            #menu.add_modal_item('Edit %s' % self.object.name, url=reverse('admin:core_module_change', args=[self.object.id]))

            #menu.add_break()

            # menu.add_modal_item('Edit Topics',
            #     url="%s?module=%d" % (
            #         reverse('admin:core_topic_changelist'),
            #         self.object.id,
            #     )
            # )

            # menu.add_break()

            # menu.add_modal_item('Add new Topic',
            #     url="%s?module=%d" % (
            #         reverse('admin:core_topic_add'),
            #         self.object.id,
            #     )
            # )

            # menu.add_modal_item('Add new Section',
            #     url="%s?module=%d" % (
            #         reverse('admin:core_section_add'),
            #         self.object.id,
            #     )
            # )


        return super(module_LessonDetailView, self).render_to_response(context, **response_kwargs)


def module_ModuleRefLookup(request, ref_id):

    try:
        module = Lesson.objects.get(ref_id=ref_id)
        if module:
            return redirect('modules:lesson_detail', module.slug)
    except:
        raise Http404


class module_LessonIntro(PublicationChildViewMixin, DetailView):
    model = Lesson
    template_name = 'module/viewer/_lesson_intro.html'

    def get_context_data(self, **kwargs):
        context = super(module_LessonIntro, self).get_context_data(**kwargs)
        return context

class module_SectionDetailView(PublicationChildViewMixin, DetailView):
    model = Section
    context_object_name = 'Section'

    def get_context_data(self, **kwargs):
        context = super(module_SectionDetailView, self).get_context_data(**kwargs)
        return context

    def get_template_names(self):
        c_type = str(ContentType.objects.get_for_id(self.get_object().polymorphic_ctype_id))


        return {
            'Reading Section':  'module/viewer/_section_reading_view.html',
            'Activity Section': 'module/viewer/_section_activity_view.html',
            'Quiz Section':     'module/viewer/_section_quiz_view.html',
        }.get(c_type, 'module/viewer/_section_reading_view.html')

        #return 'module/section_detail.html'
    
    def render_to_response(self, context, **response_kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)
        return super(module_SectionDetailView, self).render_to_response(context, **response_kwargs)



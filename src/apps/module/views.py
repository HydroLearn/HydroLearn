from django.core.urlresolvers import reverse, reverse_lazy
from django.template import RequestContext
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse, Http404, HttpResponseNotFound
from django.shortcuts import redirect, render, get_object_or_404
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType

from src.apps.core.models.module_models import (
    Module,
    Topic,
    Lesson,
    Section,
)

# from src.apps.core.models.section_types import (
#     ActivitySection,
#     QuizSection,
#     ReadingSection,
# )

from src.apps.core.model_queries import *


class module_ModuleListView(ListView):
    model = Module
    queryset = Module.objects.all() #select all of the modules, add in published filter later
    
    
    def render_to_response(self, context, **response_kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)
        
        # if self.request.toolbar and self.request.toolbar.editmode:
        #     menu = self.request.toolbar.get_or_create_menu('module-list-menu','Module')
        #     ...
        
        return super(module_ModuleListView, self).render_to_response(context, **response_kwargs)
        
class module_ModuleDetailView(DetailView):
    model = Module
    context_object_name = 'module'  
    template_name = 'module/viewer/module_index.html'

    def get(self, request, *args, **kwargs):

        try:
            self.object = self.get_object()
        except Http404:
            # redirect here
            return redirect('modules:404')

        context = self.get_context_data(object=self.object)
        #context['topic'] = request.GET.get('t','None')
        context['loaded_section'] = request.GET.get('v', '')
        #context['section'] = request.GET.get('s', 'None')
        context['edit'] = False
        return self.render_to_response(context)


    def get_context_data(self, **kwargs):
        context = super(module_ModuleDetailView, self).get_context_data(**kwargs)
        
        # get the current module's child topics based on module slug
        # layers = get_module_layers(self.kwargs.get('slug'))
        # context['layers'] = layers

        context['TOC_Listing'] = get_module_TOC_obj(self.kwargs.get('slug'))

        return context
    
    def render_to_response(self, context, **response_kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)
        
        #========================= Add menu item for adding sections to current module
        if self.request.toolbar and self.request.toolbar.edit_mode:
            menu = self.request.toolbar.get_or_create_menu('module-menu', "Edit this Module")
            menu.add_modal_item('Edit %s' % self.object.name, url=reverse('admin:core_module_change', args=[self.object.id]))

            menu.add_break()

            menu.add_modal_item('Edit Topics',
                url="%s?module=%d" % (
                    reverse('admin:core_topic_changelist'),
                    self.object.id,
                )
            )
            
            menu.add_break()
        
            menu.add_modal_item('Add new Topic',
                url="%s?module=%d" % (
                    reverse('admin:core_topic_add'),
                    self.object.id,
                )
            )
                        
            menu.add_modal_item('Add new Section',
                url="%s?module=%d" % (
                    reverse('admin:core_section_add'),
                    self.object.id,
                )
            )
            

        return super(module_ModuleDetailView, self).render_to_response(context, **response_kwargs)

def module_ModuleRefLookup(request, ref_id):

    try:
        module = Module.objects.get(ref_id=ref_id)
        if module:
            return redirect('modules:module_detail', module.slug)
    except:
        #return handler404(request)
        raise Http404

class module_ModuleIntro(DetailView):
    model = Module
    template_name = 'module/viewer/_module_intro.html'

    def get_context_data(self, **kwargs):
        context = super(module_ModuleIntro, self).get_context_data(**kwargs)
        context['edit_link'] = reverse('manage:module_content', kwargs={
            'slug': self.object.slug,
        })
        return context

class module_TopicIntro(DetailView):
    model = Topic
    template_name = 'module/viewer/_topic_intro.html'

    def get_context_data(self, **kwargs):
        context = super(module_TopicIntro, self).get_context_data(**kwargs)
        context['edit_link'] = reverse('manage:topic_content', kwargs={
            'module_slug': self.object.module.slug,
            'slug': self.object.slug,
        })
        return context

class module_LessonIntro(DetailView):
    model = Lesson
    template_name = 'module/viewer/_lesson_intro.html'

    def get_context_data(self, **kwargs):
        context = super(module_LessonIntro, self).get_context_data(**kwargs)
        context['edit_link'] = reverse('manage:lesson_content', kwargs={
            'module_slug': self.object.topic.module.slug,
            'topic_slug': self.object.topic.slug,
            'slug': self.object.slug,

        })
        return context

class module_SectionDetailView(DetailView):
    model = Section
    context_object_name = 'Section'

    def get_context_data(self, **kwargs):
        context = super(module_SectionDetailView, self).get_context_data(**kwargs)
        context['edit_link'] = reverse('manage:section_content', kwargs={
            'module_slug':self.object.lesson.topic.module.slug,
            'topic_slug': self.object.lesson.topic.slug,
            'lesson_slug': self.object.lesson.slug,
            'slug': self.object.slug,
        })

        return context

    def get_template_names(self):
        c_type = str(ContentType.objects.get_for_id(self.get_object().polymorphic_ctype_id))


        return {
            'reading section':  'module/viewer/_section_reading_view.html',
            'activity section': 'module/viewer/_section_activity_view.html',
            'quiz section':     'module/viewer/_section_quiz_view.html',
        }.get(c_type, 'module/viewer/_section_reading_view.html')

        #return 'module/section_detail.html'
    
    def render_to_response(self, context, **response_kwargs):
        # can define a custom DjangoCMS toolbar entry here (as an alternative to doubleclick edit)
        return super(module_SectionDetailView, self).render_to_response(context, **response_kwargs)



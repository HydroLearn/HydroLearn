from django.core.urlresolvers import reverse
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse, Http404
from django.shortcuts import redirect
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


from src.apps.core.model_queries import *
#from src.apps.core.forms import ModuleForm, TopicForm, SectionForm

#from src.apps.tags.query_utils import *

from taggit.models import Tag
#class get_tagged(ListView):

class TagMixin(object):
    def get_context_data(self, **kwargs):
        context = super(TagMixin,self).get_context_data(**kwargs)
        context['tags'] = Tag.objects.all()
        return context


class TagBrowserView(TagMixin, TemplateView):
    template_name = 'tagging/browser.html'
    


class TagDetailView(TagMixin, TemplateView):
    template_name = 'tagging/index.html'
    #context_object_name = 'sections'
    
    # def get_context_data(self, **kwargs):
    #     context = super(TagIndexView,self).get_context_data(**kwargs)
    #     context['requested_tags'] = Tag.objects.all()
    #     return context
    
    def get_context_data(self, **kwargs):
        context =  super(TagDetailView,self).get_context_data(**kwargs)
        
        #context['requested_tag'] = Tag.objects.filter()
        # context['tagged_modules'] = Module.objects.filter(tags__slug=self.kwargs.get('slug'))
        # context['tagged_topics'] = Topic.objects.filter(tags__slug=self.kwargs.get('slug'))
        context['tagged_lessons'] = Lesson.objects.filter(tags__slug=self.kwargs.get('slug'))
        context['tagged_sections'] = Section.objects.filter(tags__slug=self.kwargs.get('slug'))
        
        # context['tagged_modules'] = get_Modules_With_Tag(self.kwargs.get('slug'))
        # context['tagged_topics'] = get_Topics_With_Tag(self.kwargs.get('slug'))
        # context['tagged_sections'] = get_Sections_With_Tag(self.kwargs.get('slug'))
        
        return context
    
    def get_queryset(self):
        return Section.objects.filter(tags__slug=self.kwargs.get('slug'))
    
    
    
    
    
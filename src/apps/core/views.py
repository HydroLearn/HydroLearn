from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType

from src.apps.core.models.module_models import (
    Module,
    Topic,
    Lesson,
    Section,
)

from src.apps.core.models.section_types import (
    ActivitySection,
    QuizSection,
    ReadingSection
)

from src.apps.core.models.quiz_question_models import (
    QuizQuestion
)


from src.apps.core.model_queries import *
# from .forms import ModuleForm, TopicForm, SectionForm


# ====================================== Model Views Mixins =======================================
class core_ModuleListView(ListView):
    model = Module
    queryset = Module.objects.all() #select all of the modules, add in published filter later

class core_ModuleDetailView(DetailView):
    model = Module
    context_object_name = 'module'


class core_TopicListView(ListView):
    model = Topic
    queryset = Topic.objects.all() #select all of the modules, add in published filter later

class core_TopicDetailView(DetailView):
    model = Topic
    context_object_name = 'topic'

class core_LessonListView(ListView):
    model = Lesson
    queryset = Lesson.objects.all()  # select all of the modules, add in published filter later

class core_LessonDetailView(DetailView):
    model = Lesson
    context_object_name = 'lesson'

class core_SectionListView(ListView):
    model = Section
    queryset = Section.objects.all() #select all of the modules, add in published filter later

class core_SectionDetailView(DetailView):
    model = Section
    context_object_name = 'Section'  

class core_QuizQuestionDetailView(DetailView):
    model = QuizQuestion
    context_object_name = "Quiz Question"
    queryset = QuizQuestion.objects.all()  #select all of the questions, add in published filter later

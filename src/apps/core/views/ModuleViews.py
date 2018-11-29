from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
from src.apps.core.forms import Learning_ObjectiveForm
from django.forms import formset_factory

from src.apps.core.models.PublicationModels import (
    Publication,
)

# from src.apps.core.models.share_model import (
#     ShareMapping,
# )

from src.apps.core.models.ModuleModels import (
    # Module,
    # Topic,
    Lesson,
    Section,
)

# from src.apps.core.models.section_types import (
#     ActivitySection,
#     QuizSection,
#     ReadingSection
# )

from src.apps.core.models.QuizQuestionModels import (
    QuizQuestion
)


from src.apps.core.model_queries import *



# ====================================== Model Views Mixins =======================================
# class core_PublicationListView(ListView):
#     model = Publication
#     queryset = Publication.objects.all()
#
#
# class core_PublicationDetailView(ListView):
#     model = Publication
#     context_object_name = 'publication'

from src.apps.core.views.PublicationViews import PublicationViewMixin, PublicationChildViewMixin


class core_LessonListView(ListView):
    model = Lesson
    queryset = Lesson.objects.all()  # select all of the modules, add in published filter later

class core_LessonDetailView(PublicationChildViewMixin, DetailView):
    model = Lesson
    context_object_name = 'lesson'

class core_SectionListView(ListView):
    model = Section
    queryset = Section.objects.all() #select all of the modules, add in published filter later

class core_SectionDetailView(PublicationChildViewMixin, DetailView):
    model = Section
    context_object_name = 'Section'  

class core_QuizQuestionDetailView(DetailView):
    model = QuizQuestion
    context_object_name = "Quiz Question"
    queryset = QuizQuestion.objects.all()  #select all of the questions, add in published filter later

class LearningObjectiveView(TemplateView):

    template_name = "core/learning_outcomes.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['learning_objective_formset'] = formset_factory(Learning_ObjectiveForm)
        return context

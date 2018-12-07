from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
from src.apps.core.forms import Learning_ObjectiveTextForm
from django.forms import formset_factory
from django.shortcuts import render
from src.apps.core.models.LearningObjModels import Learning_Level, Learning_Verb, \
    Learning_Outcome, Learning_Objective

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

from src.apps.core.models.HS_AppFrameModels import (
    AppReference,
)

from src.apps.core.models.QuizQuestionModels import (
    QuizQuestion
)


from src.apps.core.model_queries import *

import logging
logger = logging.getLogger()


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

def add_learning_objectives(request):
    Learning_ObjectiveFormSet = formset_factory(Learning_ObjectiveTextForm)
    if request.method == 'POST':
        formset = Learning_ObjectiveFormSet(request.POST, request.FILES)
        if formset.is_valid():
            for form in formset:
                verb = form.cleaned_data.get("verb")
                outcomes = form.cleaned_data.get("outcomes")
                form.save(verb, outcomes)
    else:
        formset = formset_factory(Learning_ObjectiveTextForm)
    return render(request, 'core/learning_obj.html', {'learning_objective_formset': formset})

class core_AppRefDetailView(DetailView):
    model = AppReference
    context_object_name = "App References"

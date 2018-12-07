from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.views.generic import DetailView, ListView, TemplateView
from django.http import JsonResponse
#from taggit.models import Tag
from django.contrib.contenttypes.models import ContentType
from src.apps.core.forms import Learning_ObjectiveForm
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
    Learning_ObjectiveFormSet = formset_factory(Learning_ObjectiveForm)
    if request.method == 'POST':
        formset = Learning_ObjectiveFormSet(request.POST, request.FILES)
        logger.error("POSTING!!!!!!!!!!!!!!!!!!!!!!!")
        if formset.is_valid():
            logger.error("WOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO")
            logger.error(formset.cleaned_data)
            for form in formset.cleaned_data:
                condition = form["learning_condition_text"]
                task = form["learning_task_text"]
                degree = form["learning_degree_text"]
                outcome_ids = form["learning_outcomes_ids"]
                level = form["learning_level_text"]
                verb = form["learning_verb_text"]
                logger.error(condition + task + degree + outcome_ids + level + verb)
                ll = Learning_Level.objects.get(label=level)
                lv = Learning_Verb(verb=verb, level=ll)
                lv.save()
                lou = Learning_Outcome.objects.filter(pk__in=outcome_ids.split(","))
                lo = Learning_Objective(condition=condition, task=task, degree=degree, verb=lv)#, outcomes=lou)
                lo.save()
                lo.outcomes = lou
                lo.save()
            #lo = Learning_Objective(condition="", task="", degree="", verb="", outcomes="")
            #lo.save()
            pass
    else:
        lo = Learning_Objective.objects.all()
        logger.error("GETTING!!!!!!!!!!!!!!!!!!!!!!!")
        formset = formset_factory(Learning_ObjectiveForm)
    return render(request, 'core/learning_obj.html', {'learning_objective_formset': formset})

class core_AppRefDetailView(DetailView):
    model = AppReference
    context_object_name = "App References"

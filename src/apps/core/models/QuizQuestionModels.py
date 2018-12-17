import uuid

from cms.utils.copy_plugins import copy_plugins_to
from django.urls import reverse
from django.db import models, transaction
from django_extensions.db.fields import RandomCharField



from polymorphic.models import PolymorphicModel

from cms.models.fields import PlaceholderField

from src.apps.core.managers.IterativeDeletionManagers import (
    IterativeDeletion_Manager,
    PolyIterativeDeletion_Manager,
)
from src.apps.core.models.PublicationModels import (
    PolyPublicationChild,
    PublicationChild,
)

'''***********************************************************
    QuizQuestion model
***********************************************************'''

class QuizQuestion(models.Model):

    class Meta:
        app_label = 'core'
        ordering = ('position',)
        verbose_name = 'Quiz-Question'
        verbose_name_plural = 'Quiz-Questions'

    # define the question types
    MULTI_CHOICE = "multi-choice"
    MULTI_SELECT = "multi-select"

    QUESTION_TYPES = (
        # question types
        (MULTI_CHOICE, "Multiple Choice"),
        (MULTI_SELECT, "Multiple Selection"),
    )

    question_type = models.CharField(max_length=25, choices=QUESTION_TYPES, default=MULTI_CHOICE)

    ref_id = models.UUIDField(default=uuid.uuid4, editable=False)

    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    question_text = models.TextField(default="", blank=False,null=False)

    quiz = models.ForeignKey(
            'core.QuizSection',
            related_name="questions",
            blank=False,
            default=None,
            help_text=u'Please specify a Quiz Section to map this question to.',
            null=False,
            on_delete=models.CASCADE,
        )

    def absolute_url(self):
        return reverse('core:quiz_question_detail', kwargs={
            'module_slug': self.quiz.topic.module.slug,
            'topic_slug': self.quiz.topic.slug,
            'quiz_slug': self.quiz.slug,
            'ref_id': self.ref_id,
        })

    def __unicode__(self):
        # return self.name
        return "%s:%s" %(self.quiz.name, self.ref_id)

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return "%s:%s" % (self.quiz.name, self.ref_id)



'''***********************************************************
    QuizAnswer model
***********************************************************'''

class QuizAnswer(models.Model):
    class Meta:
        verbose_name = 'Quiz-Answer'
        verbose_name_plural = 'Quiz-Answers'

    ref_id = models.UUIDField(default=uuid.uuid4, editable=False)

    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    answer_text = models.TextField(default="", blank=False, null=False)

    is_correct = models.BooleanField()

    question = models.ForeignKey(
            'core.QuizQuestion',
            related_name="answers",
            blank=False,
            default=None,
            help_text=u'Please specify a Quiz Question to map this answer to.',
            null=False,
            on_delete=models.CASCADE,
        )

    def __unicode__(self):
        # return self.name
        return "%s:%s:answer" %(self.question.quiz.name, self.ref_id)

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return "%s:%s:answer" % (self.question.quiz.name, self.ref_id)






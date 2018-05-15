from django.urls import reverse
from django_extensions.db.fields import RandomCharField

#from src.apps.core.models import *
from src.apps.core.models.creation_tracking_model import (
    CreationTrackingBaseModel,
    PolyCreationTrackingBaseModel
)
from src.apps.core.signals import *
from src.apps.core.QuerysetManagers import *

'''
***********************************************************
    Polymorphic QuizQuestion model

    - designed to allow for multiple types of quiz questions
        each with their own methods, fields, etc
***********************************************************
'''

class QuizQuestion(PolyCreationTrackingBaseModel):

    objects = PolyIterativeDeletion_Manager()

    class Meta:
        app_label = 'core'
        # unique_together = (
        #         'quiz',
        #         'name'
        #     ) #enforce only unique section names within a topic
        ordering = ('position',)
        verbose_name_plural = 'Quiz-Questions'



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


    def delete(self, *args, **kwargs):
        print("----- in Lesson overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.question_text]

        #self.sections.delete()

        super(QuizQuestion, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()


    ref_id = RandomCharField(
        primary_key=True,
        unique=True,
        length=8,
        include_punctuation=False,
    )

    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    question_text = PlaceholderField('question_text')

    quiz = models.ForeignKey('core.QuizSection',
                             related_name="quiz_question_item",
                             blank=False,
                             default=None,
                             help_text=u'Please specify a Quiz Section to map this question to.',
                             null=False,
                             on_delete=models.CASCADE,
                             )
    #parent = 'QuizSection'

'''
***********************************************************
    Abstract QuizAnswer base model
        - abstract definition of minimal required fields for QuizQuestion answers
            with CreationTracking

***********************************************************
'''


# class QuizAnswer(FrontendEditableAdminMixin, PolymorphicModel, models.Model):
class QuizAnswerBase(CreationTrackingBaseModel):
    class Meta:
        abstract = True

    objects = IterativeDeletion_Manager()

    ref_id = RandomCharField(
        primary_key=True,
        unique=True,
        length=8,
        include_punctuation=False,
    )

    position = models.PositiveIntegerField(default=0, blank=False, null=False)


'''
***********************************************************
    # QUIZ QUESTION/ANSWER TYPES
    1) it is expected that for each quiz question type there is a
        'Question' model which may contain additional fields if needed though 
        it is expected that no more than a TextPlugin will be needed

    2) to accompany the quiz question model, there is expected to be an 'Answer' 
        model which inherits from QuizAnswerBase, and contains a relation to the 
        associated polymorphic question type    

    - maintaining this linkage will ensure that the schema resembles a treelike structure
        seperating the different types of answers into separate tables in the database
        allowing for a more fine tuned customization of the answer types based on the 
        requirements of the question 

***********************************************************
'''

'''
    # MultiChoice question/answer definitions
        - questions that present multiple answers, with only 1 correct answer 
            per question
        - to be displayed to the user as a radio input
'''


class MultiChoice_question(QuizQuestion):
    class Meta:
        verbose_name_plural = 'MultiChoice-Questions'

    def copy_relations(self, oldinstance):
        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.answer_item.all().delete()

        for answer_item in oldinstance.answer_item.all():
            # instance.pk = None; instance.pk.save() is the slightly odd but
            # standard Django way of copying a saved model instance
            answer_item.pk = None
            answer_item.plugin = self
            answer_item.save()

    parent = 'quizsection'

class MultiChoice_answer(QuizAnswerBase):
    class Meta:
        app_label = 'core'
        ordering = ('position',)
        verbose_name_plural = 'MultiChoice-Answers'

    def delete(self, *args, **kwargs):
        print("----- in Lesson overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.answer_text]

        #self.sections.delete()

        super(MultiChoice_answer, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()


    quiz_question = models.ForeignKey(
        'core.MultiChoice_question',
        related_name='answer_item',
        null=False,
        blank=False,
    )

    answer_text = PlaceholderField('answer_text')

    is_correct = models.BooleanField()


'''
    # MultiSelect question/answer definitions
        - questions that present multiple answers with multiple possible correct answers
        - to be displayed to the user as a listing of checkbox inputs
'''


class MultiSelect_question(QuizQuestion):
    class Meta:
        verbose_name_plural = 'MultiSelect-Questions'

    def copy_relations(self, oldinstance):
        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.answer_item.all().delete()

        for answer_item in oldinstance.answer_item.all():
            # instance.pk = None; instance.pk.save() is the slightly odd but
            # standard Django way of copying a saved model instance
            answer_item.pk = None
            answer_item.plugin = self
            answer_item.save()

    parent = 'quizsection'

class MultiSelect_answer(QuizAnswerBase):
    class Meta:
        app_label = 'core'
        ordering = ('position',)
        verbose_name_plural = 'MultiSelect-Answers'

    def delete(self, *args, **kwargs):
        print("----- in Lesson overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.answer_text]

        # self.sections.delete()

        super(MultiSelect_answer, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    quiz_question = models.ForeignKey(
        'core.MultiSelect_question',
        related_name='answer_item',
        null=False,
        blank=False,
    )

    answer_text = PlaceholderField('answer_text')

    is_correct = models.BooleanField()

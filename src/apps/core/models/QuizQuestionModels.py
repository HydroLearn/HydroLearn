import uuid
from copy import deepcopy

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

'''
***********************************************************
    Polymorphic QuizQuestion model

    - designed to allow for multiple types of quiz questions
        each with their own methods, fields, etc
***********************************************************
'''
#class QuizQuestion(PolyCreationTrackingBaseModel):
#class QuizQuestion(PolymorphicModel):
class QuizQuestion(PolyPublicationChild):


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


    def get_Publishable_parent(self):
        return self.quiz.lesson.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        return super(QuizQuestion, self).is_dirty



    def delete(self, *args, **kwargs):

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
#class QuizAnswerBase(CreationTrackingBaseModel):
#class QuizAnswerBase(models.Model):
class QuizAnswerBase(PublicationChild):
    class Meta:
        abstract = True

    objects = IterativeDeletion_Manager()

    ref_id = RandomCharField(
        primary_key=True,
        unique=True,
        length=8,
        include_punctuation=False,
    )



    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        return super(QuizAnswerBase, self).is_dirty



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

    def copy(self):
        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.question_text = None

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

        self.answer_item.delete()
        for answer_item in from_instance.answer_item.all():
            # copy the lesson item and set its linked topic
            new_answer = answer_item.copy()
            new_answer.quiz_question = self

            # save the new topic instance
            new_answer.save()

            new_answer.copy_relations(answer_item)


    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.question_text.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.question_text, no_signals=True)

    def get_Publishable_parent(self):
        return self.quiz.lesson.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        result = any([
            super(MultiChoice_question, self).is_dirty,
            self.question_text.cmsplugin_set.filter(
                changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists(),
        ])

        if result: return result

        for t in self.answer_item.all():
            if t.is_dirty: return True

        return False


    parent = 'quizsection'

class MultiChoice_answer(QuizAnswerBase):
    class Meta:
        app_label = 'core'
        ordering = ('position',)
        verbose_name_plural = 'MultiChoice-Answers'

    def copy(self):
        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.answer_text = None

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.answer_text.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.answer_text, no_signals=True)

    def get_Publishable_parent(self):
        return self.quiz_question.quiz.lesson.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        #return super(MultiChoice_answer, self).is_dirty

        result = any([
            super(MultiChoice_answer, self).is_dirty,
            self.answer_text.cmsplugin_set.filter(
                changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists(),
        ])

        return result


    def delete(self, *args, **kwargs):

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

    def copy(self):
        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.question_text = None

        return new_instance

    def copy_relations(self, from_instance):
        # copy over the content
        self.copy_content(from_instance)

        self.answer_item.delete()
        for answer_item in from_instance.answer_item.all():
            # copy the lesson item and set its linked topic
            new_answer = answer_item.copy()
            new_answer.quiz_question = self

            # save the new topic instance
            new_answer.save()

            new_answer.copy_relations(answer_item)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.question_text.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.question_text, no_signals=True)

    def get_Publishable_parent(self):
        return self.quiz.lesson.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        #return super(MultiSelect_question, self).is_dirty

        result = any([
            super(MultiSelect_question, self).is_dirty,
            self.question_text.cmsplugin_set.filter(
                changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists(),
        ])

        if result: return result

        for t in self.answer_item.all():
            if t.is_dirty: return True

        return False

    parent = 'quizsection'

class MultiSelect_answer(QuizAnswerBase):
    class Meta:
        app_label = 'core'
        ordering = ('position',)
        verbose_name_plural = 'MultiSelect-Answers'

    def copy(self):
        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.answer_text = None

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.answer_text.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.answer_text, no_signals=True)

    def get_Publishable_parent(self):
        return self.quiz_question.quiz.lesson.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        #return super(MultiSelect_answer, self).is_dirty
        result = any([
            super(MultiSelect_answer, self).is_dirty,
            self.answer_text.cmsplugin_set.filter(
                changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists(),
        ])

        return result


    def delete(self, *args, **kwargs):

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

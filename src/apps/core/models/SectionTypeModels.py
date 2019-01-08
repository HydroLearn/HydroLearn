# from cms.models import PlaceholderField
# from cms.utils.copy_plugins import copy_plugins_to

from django.urls import reverse
from django.db import models, transaction
from src.apps.core.models.ModuleModels import Section
from src.apps.core.models.PublicationModels import Publication
from src.apps.core.models.ResourceModels import Resource
from src.apps.core.models.QuizQuestionModels import (
    QuizQuestion,
    QuizAnswer,
)

class ReadingSection(Section):
    class Meta:
        verbose_name = "Reading Section"
        verbose_name_plural = 'Reading Sections'
        manager_inheritance_from_future = True

    content = models.TextField(u'Reading Content',
                               blank=True,
                               default='',
                               help_text="Enter the content for this section.")

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self, user=None, maintain_ref=False):
        '''
            generate a new ReadingSection instance based on this ReadingSection instance with a fresh ref_id and no parent
        :return: a new lesson with a fresh reference id
        '''

        assert user, "The user generating the copy must be provided."

        if maintain_ref:
            assert user == self.get_owner(), "Only the Section owner can generate copies with the same Reference Id."

        new_instance = ReadingSection(
                lesson=None,
                position=0,
                is_deleted=False,

                name=self.name,
                short_name=self.short_name,
                duration=self.duration,
                content=self.content,

                created_by=self.created_by,
                changed_by=self.changed_by,

            )

        if maintain_ref:
            new_instance.ref_id = self.ref_id

        return new_instance

    def copy_children(self, user=None, from_instance=None, maintain_ref=False):
        pass

    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))


    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.

        # get parent publication object
        parent_publication = self.get_Publishable_parent()

        if parent_publication.publish_status == Publication.DRAFT_ONLY: return True

        pub_date = None
        if parent_publication.publish_status == Publication.PUBLISHED:
            # if this is a published draft-copy
            pub_date = parent_publication.published_copy.published_date
        else:
            # if this is the current publication
            pub_date = parent_publication.published_date

        result = any([
            super(ReadingSection, self).is_dirty,
            #self.content.cmsplugin_set.filter(changed_date__gt=pub_date).exists()
        ])

        return result





class ActivitySection(Section):
    class Meta:
        verbose_name = "Activity Section"
        verbose_name_plural = 'Activity Sections'
        manager_inheritance_from_future = True

    content = models.TextField(u'Activity Content',
                               blank=True,
                               default='',
                               help_text="Enter the content for this section.")

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self, user=None, maintain_ref=False):
        '''
            generate a new Activity instance based on this Activitiy instance with a fresh ref_id and no parent
        :return: a new Activity with a fresh reference id
        '''

        assert user, "The user generating the copy must be provided."

        if maintain_ref:
            assert user == self.get_owner(), "Only the Activity owner can generate copies with the same Reference Id."

        new_instance = ActivitySection(
                lesson=None,
                is_deleted=False,
                position=0,

                name=self.name,
                short_name=self.short_name,
                duration=self.duration,
                content=self.content,

                created_by=user,
                changed_by=user,
            )

        if maintain_ref:
            new_instance.ref_id = self.ref_id


        return new_instance

    def copy_children(self, user=None, from_instance=None, maintain_ref=False):

        assert user, "The user copying the children must be provided."
        assert from_instance, 'Activity Instance to copy children from must be provided.'

        if maintain_ref:
            assert user == self.get_owner(), "Only the Activity owner can generate copies with the same Reference Id."

        # copy over the resources for this activity
        self.resources.all().delete()

        for resource in from_instance.resources.all():
            new_resource = Resource(
                display_text=resource.display_text,
                resource_link=resource.resource_link,
                resource_type=resource.resource_type,
                activity=self,
            )

            new_resource.save()



    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.

        #result = super(ActivitySection, self).is_dirty() or self.content.cmsplugin_set.filter(changed_date__gt=self.changed_date).exists()

        result = any([
            super(ActivitySection, self).is_dirty,
            #self.content.cmsplugin_set.filter(changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists()
        ])

        return result




class QuizSection(Section):
    class Meta:
        verbose_name = "Quiz Section"
        verbose_name_plural = 'Quiz Sections'

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self, user=None, maintain_ref=False):
        '''
            generate a new Quiz instance based on this Quiz instance with a fresh ref_id and no parent
        :return: a new lesson with a fresh reference id
        '''

        assert user, "The user generating the copy must be provided."

        if maintain_ref:
            assert user == self.get_owner(), "Only the Quiz owner can generate a copy with the same Reference Id."

        new_instance = QuizSection(
                lesson=None,
                position=0,
                is_deleted=False,

                name=self.name,
                short_name=self.short_name,
                duration=self.duration,

                created_by=user,
                changed_by=user,

            )

        if maintain_ref:
            new_instance.ref_id = self.ref_id

        return new_instance

    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

    def copy_children(self, user=None, from_instance=None, maintain_ref=False):
        # delete any questions that may be present in this instance

        assert user, "The user copying the children must be provided."
        assert from_instance, 'Quiz Instance to copy children from must be provided.'

        if maintain_ref:
            assert user == self.get_owner(), "Only the Quiz owner can generate a copy with the same Reference Id."

        self.questions.all().delete()

        # copy each question/answer from the reference instance
        for question in from_instance.questions.all():
            new_question = QuizQuestion(
                question_type=question.question_type,
                position=question.position,
                question_text=question.question_text,
                quiz=self,
            )

            if maintain_ref:
                new_question.ref_id = question.ref_id

            new_question.save()

            for answer in question.answers.all():
                new_answer = QuizAnswer(
                    position=answer.position,
                    answer_text=answer.answer_text,
                    is_correct=answer.is_correct,
                    question=new_question,
                )

                if maintain_ref:
                    new_answer.ref_id = answer.ref_id

                new_answer.save()


    @property
    def is_dirty(self):
        return super(QuizSection, self).is_dirty

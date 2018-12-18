from cms.models import PlaceholderField
from cms.utils.copy_plugins import copy_plugins_to

from django.urls import reverse

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

    content = PlaceholderField('reading_content')

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    def delete(self, *args, **kwargs):
        #print("----- in ReadingSection overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.content]
        super(ReadingSection, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self, maintain_ref=False):
        '''
            generate a new ReadingSection instance based on this ReadingSection instance with a fresh ref_id and no parent
        :return: a new lesson with a fresh reference id
        '''
        new_instance = ReadingSection(
                lesson=None,
                position=0,
                is_deleted = False,

                name = self.name,
                short_name = self.short_name,
                duration = self.duration,

            )

        if maintain_ref:
            new_instance.ref_id = self.ref_id

        return new_instance

    def copy_children(self, from_instance, maintain_ref=False):

        # copy over the content
        #self.copy_content(from_instance)
        pass

    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # clear any existing plugins
        self.content.clear()

        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.content.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.content, no_signals=True)


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
            self.content.cmsplugin_set.filter(changed_date__gt=pub_date).exists()
        ])

        return result





class ActivitySection(Section):
    class Meta:
        verbose_name = "Activity Section"
        verbose_name_plural = 'Activity Sections'
        manager_inheritance_from_future = True

    content = PlaceholderField('activity_content')

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    def delete(self, *args, **kwargs):
        #print("----- in ActivitySection overridden delete")
        # self.cleanup_placeholders()

        placeholders = [self.content]
        super(ActivitySection, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self, maintain_ref=False):
        '''
            generate a new Activity instance based on this Activitiy instance with a fresh ref_id and no parent
        :return: a new lesson with a fresh reference id
        '''
        new_instance = ActivitySection(
                lesson=None,
                is_deleted=False,
                position = 0,

                name = self.name,
                short_name = self.short_name,
                duration = self.duration,

            )

        if maintain_ref:
            new_instance.ref_id = self.ref_id

        return new_instance

    def copy_children(self, from_instance, maintain_ref=False):

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

        # clear any existing plugins
        self.content.clear()

        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.content.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.content, no_signals=True)

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.

        #result = super(ActivitySection, self).is_dirty() or self.content.cmsplugin_set.filter(changed_date__gt=self.changed_date).exists()

        result = any([
            super(ActivitySection, self).is_dirty,
            self.content.cmsplugin_set.filter(changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists()
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

    def copy(self, maintain_ref=False):
        '''
            generate a new Quiz instance based on this Quiz instance with a fresh ref_id and no parent
        :return: a new lesson with a fresh reference id
        '''
        new_instance = QuizSection(
                lesson=None,
                position=0,
                is_deleted = False,

                name = self.name,
                short_name = self.short_name,
                duration = self.duration,

            )

        if maintain_ref:
            new_instance.ref_id = self.ref_id

        return new_instance

    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

    def copy_children(self, from_instance, maintain_ref=False):
        # delete any questions that may be present in this instance
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

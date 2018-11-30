from copy import deepcopy
from cms.models import PlaceholderField
from cms.utils.copy_plugins import copy_plugins_to

from django.urls import reverse

from src.apps.core.models.ModuleModels import Section
from src.apps.core.models.PublicationModels import Publication


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

    def clone(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.content = None

        return new_instance

    def copy_relations(self, from_instance, maintain_ref=False):

        # copy over the content
        #self.copy_content(from_instance)
        pass


    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.content.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.content, no_signals=True)

    def delete(self, *args, **kwargs):
        #print("----- in ReadingSection overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.content]
        super(ReadingSection, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

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

    def clone(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.content = None

        return new_instance

    def copy_relations(self, from_instance, maintain_ref=False):

        # copy over the content
        #self.copy_content(from_instance)
        pass



    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.content.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.content, no_signals=True)

    def delete(self, *args, **kwargs):
        #print("----- in ActivitySection overridden delete")
        # self.cleanup_placeholders()

        placeholders = [self.content]
        super(ActivitySection, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

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

    def clone(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None
        # new_instance.copy_relations(self)

        return new_instance

    def copy_content(self, from_instance):

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

    def copy_relations(self, oldinstance, maintain_ref=False):
        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.quiz_question_item.all().delete()

        for quiz_question_item in oldinstance.quiz_question_item.all():
            # copy the lesson item and set its linked topic
            new_quiz_question_item = quiz_question_item.copy(maintain_ref)
            new_quiz_question_item.quiz = self
            new_quiz_question_item.position = quiz_question_item.position

            # save the new topic instance
            new_quiz_question_item.save()
            new_quiz_question_item.copy_content(quiz_question_item)
            new_quiz_question_item.copy_relations(quiz_question_item, maintain_ref)



    @property
    def is_dirty(self):
        # TODO: iron this out once quizzes are implemented
        #return False
        result = super(QuizSection, self).is_dirty

        if result: return result

        for t in self.quiz_question_item.all():
            if t.is_dirty: return True

        return False

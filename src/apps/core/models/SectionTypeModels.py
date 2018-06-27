from copy import deepcopy
from cms.models import PlaceholderField
from cms.utils.copy_plugins import copy_plugins_to

from django.urls import reverse

from src.apps.core.models.ModuleModels import Section

class ReadingSection(Section):
    class Meta:
        verbose_name_plural = 'Sections (Reading)'
        manager_inheritance_from_future = True

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'module_slug': self.lesson.topic.module.slug,
            'topic_slug': self.lesson.topic.slug,
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    '''
        define method to clear placeholderfield to be signaled on predelete
    '''

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.content = None

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.content.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.content, no_signals=True)

    def delete(self, *args, **kwargs):
        print("----- in ReadingSection overridden delete")
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

        result = any([
            super(ReadingSection, self).is_dirty,
            self.content.cmsplugin_set.filter(changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists()
        ])

        return result


    content = PlaceholderField('reading_content')


class ActivitySection(Section):
    class Meta:
        verbose_name_plural = 'Sections (Activity)'
        manager_inheritance_from_future = True

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'module_slug': self.lesson.topic.module.slug,
            'topic_slug': self.lesson.topic.slug,
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None

        # placeholder needs to be cleared out in the copy so it can be auto generated
        # with a new id (Polymorphic Quirk)
        new_instance.content = None

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.content.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.content, no_signals=True)

    def delete(self, *args, **kwargs):
        print("----- in ActivitySection overridden delete")
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

    content = PlaceholderField('activity_content')


class QuizSection(Section):
    class Meta:
        verbose_name_plural = 'Sections (Quiz)'

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'module_slug': self.lesson.topic.module.slug,
            'topic_slug': self.lesson.topic.slug,
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        new_instance.id = None
        # new_instance.copy_relations(self)

        return new_instance

    def copy_relations(self, oldinstance):
        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.quiz_question_item.all().delete()

        for quiz_question_item in oldinstance.quiz_question_item.all():
            # copy the lesson item and set its linked topic
            new_quiz_question_item = quiz_question_item.copy()
            new_quiz_question_item.quiz = self

            # save the new topic instance
            new_quiz_question_item.save()

            new_quiz_question_item.copy_relations(quiz_question_item)



    @property
    def is_dirty(self):
        # TODO: iron this out once quizzes are implemented
        #return False
        result = super(QuizSection, self).is_dirty

        if result: return result

        for t in self.quiz_question_item.all():
            if t.is_dirty: return True

        return False

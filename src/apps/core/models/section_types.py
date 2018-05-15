from cms.models import PlaceholderField
from django.urls import reverse

from src.apps.core.models.module_models import Section

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

    def delete(self, *args, **kwargs):
        print("----- in ReadingSection overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.content]
        super(ReadingSection, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

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


    def delete(self, *args, **kwargs):
        print("----- in ActivitySection overridden delete")
        # self.cleanup_placeholders()

        placeholders = [self.content]
        super(ActivitySection, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

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

    def copy_relations(self, oldinstance):
        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.quiz_question_item.all().delete()

        for quiz_question_item in oldinstance.quiz_question_item.all():
            # instance.pk = None; instance.pk.save() is the slightly odd but
            # standard Django way of copying a saved model instance
            quiz_question_item.pk = None
            quiz_question_item.plugin = self
            quiz_question_item.save()


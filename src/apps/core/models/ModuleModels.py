from copy import deepcopy
from datetime import timedelta

from cms.models import PlaceholderField, ValidationError, uuid
from django.urls import reverse
from django.db import models
# from django.conf import settings

from django_extensions.db.fields import (
    RandomCharField,
    AutoSlugField
)

from taggit.managers import TaggableManager

# from src.apps.core.QuerysetManagers import IterativeDeletion_Manager, PolyIterativeDeletion_Manager
from src.apps.core.managers.IterativeDeletionManagers import (
    IterativeDeletion_Manager,
    PolyIterativeDeletion_Manager
)

from src.apps.core.models.PublicationModels import (
    Publication,
    #PolyPublication,
    PublicationChild,
    PolyPublicationChild)

from cms.utils.copy_plugins import copy_plugins_to


# checking plugin dates (module.intro.cmsplugin_set.filter(changed_date__gt=module.creation_date))

#class Module(CreationTrackingBaseModel):
class Module(Publication):

    class Meta:
        app_label = 'core'
        ordering = ('name',)
        verbose_name_plural = 'Modules'

        # to be removed at time of multiple past_publications
        unique_together = ('pub_id', 'is_draft', 'name')

    name = models.CharField(u'Module Name',
                            blank=False,
                            default='',
                            help_text=u'Please enter a name for this module',
                            max_length=250,
                            # unique=True,
                            )

    ref_id = RandomCharField(unique=True,
                             length=8,
                             include_punctuation=False,
                             )

    slug = AutoSlugField(u'slug',
                         blank=False,
                         default='',
                         max_length=64,
                         unique=True,
                         # populate_from=('name',),
                         populate_from=('ref_id',),
                         help_text=u'Please enter a unique slug for this module (can autogenerate from name field)',
                         )

    # shared_with = models.ManyToManyField(Person, through='ShareMapping')

    tags = TaggableManager(blank=True)

    intro = PlaceholderField('module_intro')

    # layers = models.ManyToManyField(LayerRef)
    # most likely this will need to expand further to store additional information
    # for any given module, potentially adding in the map layer links


    # path to the core module view
    def absolute_url(self):
        return reverse('core:module_detail', kwargs={
            'slug': self.slug,
        })

    # path to the manage page for a module
    def manage_url(self):
        return reverse('manage:module_content', kwargs={
            'slug': self.slug,
        })

    # path to the viewer 'module' page for a module
    def viewer_url(self):
        return reverse('modules:module_detail', kwargs={
            'slug': self.slug,
        })

    # path to the viewer 'module' page for a module
    def reference_url(self):
        return reverse('modules:module_ref', kwargs={
            'ref_id': self.ref_id,
        })

    # added for wizard support. potentially this can be used to redirect between core/manage/module
    def get_absolute_url(self):
        return self.absolute_url()

    def __unicode__(self):
        return self.name

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return self.name

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.topics.delete()

        # for each topic in the 'from_instance'
        for topic_item in from_instance.topics.all():

            # copy the topic item and set its linked module
            new_topic = topic_item.copy()
            new_topic.module = self

            # save the new topic instance
            new_topic.save()

            new_topic.copy_relations(topic_item)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.intro.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.intro, no_signals=True)

    def validate_unique(self, exclude=None):
        # add a conditional unique constraint to prevent
        #   creation of multiple drafts with the same name
        if self.is_draft and Module.objects.exclude(pk=self.pk).filter(name=self.name, is_draft=True).exists():
            raise ValidationError('A Draft-Module with this name already exists')

        return super(Module, self).validate_unique(exclude)

    def delete(self, *args, **kwargs):
        #print("----- in module overridden delete")

        placeholders = [self.intro]

        self.topics.delete()

        super(Module, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    @property
    def is_dirty(self):

        # a module is considered dirty if there are non published changes
        if self.published_copy is None: return True

        result = any([
            super(Module, self).is_dirty,
            self.intro.cmsplugin_set.filter(
                changed_date__gt=self.published_copy.creation_date).exists(),
        ])

        if result: return result

        for t in self.topics.all():
            if t.is_dirty: return True

        return False

class Topic(PublicationChild):
    objects = IterativeDeletion_Manager()
    #objects = PublicationManager()

    class Meta:
        app_label = 'core'
        unique_together = ('module', 'name')  # enforce only unique topic names within a module
        ordering = ('position',)
        verbose_name_plural = 'Topics'

    parent = 'module'

    # position = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    ref_id = RandomCharField(unique=True,
                             length=8,
                             include_punctuation=False,
                             )

    name = models.CharField(u'Topic Name',
                            blank=False,
                            default='',
                            help_text=u'Please enter a name for this topic',
                            max_length=250,
                            unique=False,
                            )

    short_name = models.CharField(u'Topic Short Name',
                                  blank=True,
                                  default='',
                                  help_text=u'(OPTIONAL) A shortened version of this topic\'s name for use in topic listings',
                                  max_length=250,
                                  unique=False,
                                  )

    slug = AutoSlugField(u'slug',
                         blank=False,
                         default='',
                         max_length=64,
                         unique=True,
                         # populate_from=('name',),
                         populate_from=('ref_id',),
                         help_text=u'Please enter a unique slug for this Topic (can autogenerate from name field)',

                         )

    module = models.ForeignKey('core.Module',
                               related_name="topics",
                               blank=False,
                               default=None,
                               help_text=u'Please specify the Module for this Topic.',
                               null=False,
                               on_delete=models.CASCADE,
                               )

    tags = TaggableManager(blank=True)

    summary = PlaceholderField('topic_summary')

    def absolute_url(self):
        return reverse('core:topic_detail', kwargs={
            'module_slug': self.module.slug,
            'slug': self.slug
        })

    # path to the manage page for a topic
    def manage_url(self):
        return reverse('manage:topic_content', kwargs={
            'module_slug': self.module.slug,
            'slug': self.slug
        })

    # path to the viewer page for a topic
    def viewer_url(self):
        return reverse('modules:topic_detail', kwargs={
            'module_slug': self.module.slug,
            'slug': self.slug
        })

    def __unicode__(self):
        return self.name

    # needed to show the name in the admin interface (otherwise will show 'Topic Object' for all entries)
    def __str__(self):
        # return self.name
        return "%s:%s" % (self.module.name, self.name)

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None

        # new_instance.copy_relations(self)

        return new_instance

    def copy_relations(self, from_instance):

        # copy over the content
        self.copy_content(from_instance)

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.lessons.delete()

        for lesson_item in from_instance.lessons.all():
            # copy the lesson item and set its linked topic
            new_lesson = lesson_item.copy()
            new_lesson.topic = self

            # save the new topic instance
            new_lesson.save()

            new_lesson.copy_relations(lesson_item)


        # get the list of plugins in the 'from_instance'
        #plugins = from_instance.summary.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        #copy_plugins_to(plugins, self.summary, no_signals=True)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.summary.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.summary, no_signals=True)

    def delete(self, *args, **kwargs):
        #print("----- in topic overridden delete")
        # self.cleanup_placeholders()

        placeholders = [self.summary]

        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.lessons.delete()


        super(Topic, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    def get_Publishable_parent(self):
        return self.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.

        result = any([
            super(Topic, self).is_dirty,
            self.summary.cmsplugin_set.filter(
                changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists(),
        ])

        if result: return result

        for t in self.lessons.all():
            if t.is_dirty: return True

        return False

class Lesson(PublicationChild):
    objects = IterativeDeletion_Manager()
    #objects = PublicationManager()



    class Meta:
        app_label = 'core'

        # upon changing to 'Lesson-based structure'
        # will need to be modified to be: ('parent_lesson', 'name')
        unique_together = ('topic', 'name')  # enforce only unique topic names within a module
        ordering = ('position',)
        verbose_name_plural = 'Lessons'

    # putting sample FK in place for when lessons become recursive
    # parent_lesson = models.ForeignKey('self', related_name="sub-lesson", on_delete=models.CASCADE)

    # parent_lesson = models.ForeignKey('self',
    #                   related_name="sub_lesson",
    #                   blank=True,
    #                   default=None,
    #                   help_text=u'Specify a parent Lesson for this Sub-Lesson.',
    #                   null=True,
    #                   on_delete=models.CASCADE,
    #                   )

    topic = models.ForeignKey('core.Topic',
                              related_name="lessons",
                              blank=False,
                              default=None,
                              help_text=u'Please specify the Topic for this Lesson.',
                              null=False,
                              on_delete=models.CASCADE,
                              )

    parent = 'topic'

    # position = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    ref_id = RandomCharField(unique=True,
                             length=8,
                             include_punctuation=False,
                             )

    name = models.CharField(u'Lesson Name',
                            blank=False,
                            default='',
                            help_text=u'Please enter a name for this Lesson',
                            max_length=250,
                            unique=False,
                            )

    short_name = models.CharField(u'Lesson Short Name',
                                  blank=True,
                                  default='',
                                  help_text=u'(OPTIONAL) A shortened version of this lesson\'s name for use in lesson listings',
                                  max_length=250,
                                  unique=False,
                                  )

    slug = AutoSlugField(u'slug',
                         blank=False,
                         default='',
                         max_length=64,
                         unique=True,
                         # populate_from=('name',),
                         populate_from=('ref_id',),
                         help_text=u'Please enter a unique slug for this Lesson (can autogenerate from name field)',
                         )

    tags = TaggableManager(blank=True)

    summary = PlaceholderField('lesson_summary')


    def absolute_url(self):
        return reverse('core:lesson_detail', kwargs={
            'module_slug': self.topic.module.slug,
            'topic_slug': self.topic.slug,
            'slug': self.slug
        })

    # path to the manage page for a topic
    def manage_url(self):
        return reverse('manage:lesson_content', kwargs={
            'module_slug': self.topic.module.slug,
            'topic_slug': self.topic.slug,
            'slug': self.slug
        })

    # path to the viewer page for a topic
    def viewer_url(self):
        return reverse('modules:lesson_detail', kwargs={
            'module_slug': self.topic.module.slug,
            'topic_slug': self.topic.slug,
            'slug': self.slug
        })

    def __unicode__(self):
        return self.name

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return "%s:%s:%s" % (self.topic.module.name, self.topic.name, self.name)

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None

        # new_instance.copy_relations(self)

        return new_instance

    def copy_relations(self, from_instance):


        # copy over the content
        self.copy_content(from_instance)

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.sections.delete()

        for section_item in from_instance.sections.all():
            # copy the lesson item and set its linked topic
            new_section = section_item.copy()
            new_section.lesson = self

            # save the new topic instance
            new_section.save()

            new_section.copy_relations(section_item)

        # get the list of plugins in the 'from_instance'
        #plugins = from_instance.summary.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        #copy_plugins_to(plugins, self.summary, no_signals=True)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.summary.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.summary, no_signals=True)

    def delete(self, *args, **kwargs):
        #print("----- in Lesson overridden delete")
        # self.cleanup_placeholders()
        placeholders = [self.summary]

        self.sections.delete()

        super(Lesson, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    def get_Publishable_parent(self):
        return self.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.

        result = any([
            super(Lesson, self).is_dirty,
            self.summary.cmsplugin_set.filter(changed_date__gt=self.get_Publishable_parent().published_copy.creation_date).exists(),
        ])

        if result: return result

        for t in self.sections.all():
            if t.is_dirty: return True


        return False



#class Section(PolyCreationTrackingBaseModel):
class Section(PolyPublicationChild):
    # class Section(CreationTrackingBaseModel, PolymorphicModel):
    objects = PolyIterativeDeletion_Manager()

    class Meta:
        app_label = 'core'
        unique_together = (
            'lesson',
            'name'
        )  # enforce only unique section names within a topic
        ordering = ('position',)
        verbose_name_plural = 'Sections'
        manager_inheritance_from_future = True

    parent = 'lesson'

    ref_id = RandomCharField(unique=True,
                             length=8,
                             include_punctuation=False,
                             )

    # position = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    name = models.CharField(u'Section Name',
                            blank=False,
                            default='',
                            help_text=u'Please enter a name for this Section',
                            max_length=250,
                            unique=False,
                            )

    short_name = models.CharField(u'Section Short Name',
                                  blank=True,
                                  default='',
                                  help_text=u'(OPTIONAL) A shortened version of this section\'s name for use in section listings',
                                  max_length=250,
                                  unique=False,
                                  )

    slug = AutoSlugField(u'slug',
                         blank=False,
                         default='',
                         max_length=64,
                         unique=True,
                         # populate_from=('name',),
                         populate_from=('ref_id',),
                         help_text=u'Please enter a unique slug for this Section (can autogenerate from name field)',
                         )

    lesson = models.ForeignKey('core.Lesson',
                               related_name="sections",
                               blank=False,
                               default=None,
                               help_text=u'Please specify the Lesson for this section.',
                               null=False,
                               on_delete=models.CASCADE,
                               )

    tags = TaggableManager(blank=True)

    duration = models.DurationField(
        default=timedelta(),
        help_text=u'Please specify the Expected Duration of this section. (format: HH:MM:SS)',
    )

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'module_slug': self.lesson.topic.module.slug,
            'topic_slug': self.lesson.topic.slug,
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    # path to the manage page for a topic
    def manage_url(self):
        return reverse('manage:section_content', kwargs={
            'module_slug': self.lesson.topic.module.slug,
            'topic_slug': self.lesson.topic.slug,
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    # path to the viewer page for a topic
    def viewer_url(self):
        return reverse('modules:section_content', kwargs={
            'module_slug': self.lesson.topic.module.slug,
            'topic_slug': self.lesson.topic.slug,
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    def __unicode__(self):
        return self.name

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return "%s:%s:%s:%s" % (self.lesson.topic.module.name, self.lesson.topic.name, self.lesson.name, self.name)

    def get_Publishable_parent(self):
        return self.lesson.topic.module

    @property
    def is_dirty(self):

        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        return super(Section, self).is_dirty


''' DEPRECIATED (Kept for potential future reference)
     Assign any signals needed for clearing placeholder fields of a model

     WARNING:
         IF A MODEL HAS A 'PLACEHOLDERFIELD' AND AN APPROPRIATE SIGNAL IS NOT SET FOR IT
         THE PLUGIN INSTANCES WILL REMAIN IN THE DATABASE, WHICH WILL LEAD TO ORPHANED DATA

'''




#signals.pre_save.connect(module_pre_save_handler, sender=Module, dispatch_uid='Module_pre_save')


# signals.pre_delete.connect(clear_placeholderfields, sender=Module, dispatch_uid='Module_pre_delete')
# signals.pre_delete.connect(clear_placeholderfields, sender=Topic, dispatch_uid='Topic_pre_delete')
#
# signals.pre_delete.connect(clear_placeholderfields, sender=ReadingSection, dispatch_uid='ReadingSection_pre_delete')
# signals.pre_delete.connect(clear_placeholderfields, sender=ActivitySection, dispatch_uid='Activity_pre_delete')




# didn't seem to change anything
# def clear_ReadingSection_Placeholder(sender, instance, **kwargs):
#     print('... ok, lets try this')
#     if instance:
#         print(f'Clearing Reading Section Placeholders for: "{instance.name}"...')
#         instance.content.clear()
#         instance.content.delete()
#         print("done")

# signals.pre_delete.connect(clear_ReadingSection_Placeholder, sender=ReadingSection)
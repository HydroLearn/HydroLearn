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
    # PolyPublication,
    PublicationChild,
    PolyPublicationChild)

from cms.utils.copy_plugins import copy_plugins_to


class Lesson(Publication):
    # class Lesson(PublicationChild):
    # objects = IterativeDeletion_Manager()
    # objects = PublicationManager()

    # TODO: if needed for publishable, can inherit parent's meta
    # class Meta(Publishable.Meta):
    class Meta:
        app_label = 'core'
        unique_together = ('parent_lesson', 'name')  # enforce only unique topic names within a module
        #ordering = ('name',)
        ordering = ('position',)
        verbose_name_plural = 'Lessons'

    ########################################
    #   Fields
    ########################################

    # the reference id for a lesson (used in slug generation)
    ref_id = models.UUIDField(default=uuid.uuid4, editable=False)
    # ref_id = RandomCharField(unique=True,length=8,include_punctuation=False,)

    # marks the parent lesson for a lesson
    #       this field will be auto-populated by the generated forms
    #       it from the dynamic interface
    parent_lesson = models.ForeignKey('self',
                                      related_name="sub_lessons",
                                      blank=True,
                                      default=None,
                                      help_text=u'Specify a Parent Lesson for this Sub-Lesson.',
                                      null=True,
                                      on_delete=models.CASCADE,
                                      )

    # Being that lessons will be clonable
    #   maintain a linkage to the lesson copied from
    #   used for giving credit to original creator
    # derived_from_lesson = models.ForeignKey('self',
    #                           related_name="derivations",
    #                           blank=True,
    #                           default=None,
    #                           help_text=u'Lesson this lesson was copied from.',
    #                           null=True,
    #                           on_delete=models.SET_NULL,
    #                           )

    # position amongst siblings, siblings can be of type Lessons or Sections
    position = models.PositiveIntegerField(default=0, blank=False, null=False)

    #   zero based depth level of lesson
    #       exclusively set by backend
    depth = models.PositiveIntegerField(default=0, blank=False, null=False)

    # depth Identifier
    #   exclusively set by backend
    depth_label = models.CharField(u'Depth Label',
                                   blank=False,
                                   default='Module',
                                   help_text=u'The depth-level label for this lesson',
                                   max_length=10,
                                   unique=False,
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
                         max_length=8,
                         unique=True,
                         populate_from=('ref_id',),
                         help_text=u'Please enter a unique slug for this Lesson (can autogenerate from name field)',
                         )

    tags = TaggableManager(blank=True)

    summary = PlaceholderField('lesson_summary')

    #   the default related name for this many-to-many field is lesson_set
    #
    # learning_objectives = models.ManyToManyField('core.LearningObjective')

    #   the default related name for this many-to-many field is lesson_set
    #       these will potentially be polymorphic to account for different
    #       resource types potentially needing different attributes
    #
    # resources = models.ManyToManyField('core.Resource')

    # TODO: potentially add 1-to-1 relationship to a publishable (instead of direct inheritance)
    #           this will allow for a lesson to be a child and root
    #           e.g. root.publishable = [publishable object], child.publishable = None
    #
    #   parent_link
    #           When True and used in a model which inherits from another
    #           concrete model, indicates that this field should be used as
    #           the link back to the parent class, rather than the extra
    #           OneToOneField which would normally be implicitly created
    #           by subclassing.
    #
    # publishable = models.OneToOneField('core.Publishable', default=None, on_delete=modeld.SET_NULL, parent_link=True)

    ########################################
    #   Methods
    ########################################

    def absolute_url(self):
        return reverse('core:lesson_detail', kwargs={
            'slug': self.slug
        })

    # path to the manage page for a topic
    def manage_url(self):
        return reverse('manage:lesson_content', kwargs={
            'slug': self.slug
        })

    # path to the viewer page for a topic
    def viewer_url(self):
        return reverse('modules:lesson_detail', kwargs={
            'slug': self.slug
        })

    # path to the viewer 'module' page for a module
    def reference_url(self):
        return reverse('modules:module_ref', kwargs={
            'ref_id': self.ref_id,
        })

    # added for wizard support. potentially this can be used to redirect between core/manage/module
    def get_absolute_url(self):
        return self.absolute_url()

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return self.name

    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self):

        new_instance = deepcopy(self)
        new_instance.pk = None
        # new_instance.ref_id = None


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
        self.sub_lessons.delete()

        for section_item in from_instance.sections.all():
            # copy the section items and set their linked lesson to this new instance
            new_section = section_item.copy()
            new_section.lesson = self

            # save the copied section instance
            new_section.save()

            new_section.copy_relations(section_item)

        for sub_lesson in from_instance.sub_lessons.all():
            # copy the sub-lesson items and set their linked parent_lesson to this new instance
            new_lesson = sub_lesson.copy()
            new_lesson.parent_lesson = self

            # save the copied sub-lesson instance
            new_lesson.save()

            new_lesson.copy_relations(sub_lesson)

    def copy_content(self, from_instance):
        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.summary.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.summary, no_signals=True)

    # TODO: Watch for this, as formsets may not access this with update
    def save(self, **kwargs):
        # print('---- in custom lesson save')
        # set depth level on save
        if self.parent_lesson:
            self.depth = self.parent_lesson.depth + 1


        # TODO: this needs to be flipped
        # based on depth level set the depth label
        self.depth_label = {
            0:'Module',
            1:'Topic',
            2: 'Lesson',
        }.get(self.depth, "INVALID")


        super(Lesson, self).save(**kwargs)

    # def save_base(self, raw=False, force_insert=False, force_update=False, using=None, update_fields=None):
    #     super().save_base(raw, force_insert, force_update, using, update_fields)

    def delete(self, *args, **kwargs):

        # self.cleanup_placeholders()
        placeholders = [self.summary]

        self.sections.delete()
        self.sub_lessons.delete()

        super(Lesson, self).delete(*args, **kwargs)

        for ph in placeholders:
            ph.clear()
            ph.delete()

    def validate_unique(self, exclude=None):
        # add a conditional unique constraint to prevent
        #   creation of multiple drafts with the same name
        #   this is only valid if a base lesson so check that it's not a root lesson too
        #   TODO: watch this, it could be inadequate when 'lesson-copy' becomes enabled later in development
        if not self.parent_lesson and self.is_draft and Lesson.objects.exclude(pk=self.pk).filter(name=self.name, is_draft=True).exists():
            raise ValidationError('A Draft-Lesson with this name already exists')

        return super(Lesson, self).validate_unique(exclude)

    def get_Publishable_parent(self):

        # return self.topic.module
        # if this isn't the parent lesson traverse up until root is reached.
        if self.parent_lesson:
            return self.parent_lesson.get_Publishable_parent()
        else:
            return self

    @property
    def is_dirty(self):

        # if this is the root lesson
        if not self.parent_lesson:

            # if this root lesson is not published, return dirty
            #if not self.is_published(): return True

            # TODO: need to check if this is the draft copy or not


            # if this is the draft instance, and not published return true
            if self.publish_status == Publication.DRAFT_ONLY:
                return True

            # get the publication date to check against

            pub_date = None


            if self.publish_status == Publication.PUBLISHED:
                # if this is a published draft-copy
                pub_date = self.published_copy.published_date
            else:
                # if this is the current publication
                pub_date = self.published_date

            # if this is a published copy
            result = any([
                super(Lesson, self).is_dirty,
                self.summary.cmsplugin_set.filter(
                    changed_date__gt=pub_date).exists(),
            ])

            if result:
                return result

            # if this lesson is clean, check it's children
            for t in self.sub_lessons.all():
                if t.is_dirty:
                    return True

            for t in self.sections.all():
                if t.is_dirty:
                    return True


        else:
            # if this lesson is a child lesson, check if it's root lesson has
            # a published copy, if not mark dirty
            parent_publication = self.get_Publishable_parent()

            if parent_publication.publish_status == Publication.DRAFT_ONLY: return True

            pub_date = None
            if parent_publication.publish_status == Publication.PUBLISHED:
                # if this is a published draft-copy
                pub_date = parent_publication.published_copy.published_date
            else:
                # if this is the current publication
                pub_date = parent_publication.published_date


            # otherwise, check that this lesson has no plugins saved
            #   after the publication date
            result = any([
                #super(Lesson, self).is_dirty,
                self.changed_date > pub_date,
                self.summary.cmsplugin_set.filter(
                    changed_date__gt=pub_date).exists(),
            ])

            if result:
                return result

            # if not check children
            for t in self.sub_lessons.all():
                if t.is_dirty:
                    return True

            for t in self.sections.all():
                if t.is_dirty:
                    return True

        return False


    def dirty_content(self):
        return True

        # TODO: Revise this for checking placeholder plugins based off
        #       of published date

        # if there is no published copy, return dirty
        if self.published_copy is None: return True

        # otherwise check that no plugin in this lesson
        # was saved after last publish's creation date
        result = any([
            super(Lesson, self).is_dirty,
            self.summary.cmsplugin_set.filter(
                changed_date__gt=self.published_copy.published_date).exists(),
        ])

        if result: return result




# class Section(PolyCreationTrackingBaseModel):
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

    ########################################
    #   Fields
    ########################################

    parent = 'lesson'

    ref_id = RandomCharField(unique=True,
                             length=8,
                             include_punctuation=False,
                             )

    #ref_id = models.UUIDField(default=uuid.uuid4, editable=False)

    # position amongst siblings, siblings can be of type Lessons or Sections
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

    # slug = AutoSlugField(u'slug',
    #                      blank=False,
    #                      default='',
    #                      max_length=8,
    #                      unique=True,
    #                      populate_from=('ref_id',),
    #                      help_text=u'Please enter a unique slug for this Lesson (can autogenerate from name field)',
    #                      )

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

    ########################################
    #   Methods
    ########################################

    def absolute_url(self):
        return reverse('core:section_detail', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    # path to the manage page for a topic
    def manage_url(self):
        return reverse('manage:section_content', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    # path to the viewer page for a topic
    def viewer_url(self):
        return reverse('modules:section_content', kwargs={
            'lesson_slug': self.lesson.slug,
            'slug': self.slug
        })

    def __unicode__(self):
        return self.name

    # needed to show the name in the admin interface (otherwise will show 'Module Object' for all entries)
    def __str__(self):
        return "%s:%s" % (self.lesson.name, self.name)

    def get_Publishable_parent(self):
        # return self.lesson.topic.module

        # return this sections parent's publishible parent
        return self.lesson.get_Publishable_parent()

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

# signals.pre_save.connect(module_pre_save_handler, sender=Module, dispatch_uid='Module_pre_save')


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

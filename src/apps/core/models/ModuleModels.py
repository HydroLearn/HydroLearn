from datetime import timedelta
from django.utils.timezone import now

from cms.models import PlaceholderField, ValidationError, uuid
from django.urls import reverse
from django.db import models, transaction
from django.conf import settings

from django_extensions.db.fields import (
    AutoSlugField
)

from taggit.managers import TaggableManager

from src.apps.core.managers.IterativeDeletionManagers import (
    IterativeDeletion_Manager,
    PolyIterativeDeletion_Manager
)

from src.apps.core.models.PublicationModels import (
    Publication,
    PolyPublicationChild
)

from src.apps.core.models.HS_AppFrameModels import AppReference

from cms.utils.copy_plugins import copy_plugins_to

User = settings.AUTH_USER_MODEL


class Lesson(Publication):

    # TODO: if needed for publishable, can inherit parent's meta
    #       class Meta(Publishable.Meta):
    class Meta:
        app_label = 'core'
        #unique_together = ('parent_lesson', 'name')  # enforce only unique topic names within a module
        #ordering = ('name',)
        ordering = ('position',)
        verbose_name_plural = 'Lessons'

    ########################################
    #   Fields
    ########################################

    # boolean field representing if a lesson is (soft) deleted
    #   TODO: this has not been factored into the system yet, implementation will require revision of delete method
    is_deleted = models.BooleanField(default=False)

    # the reference id for a lesson (used in slug generation)
    #   this reference id will be maintained for all copies of this lesson
    ref_id = models.UUIDField(default=uuid.uuid4, editable=False)

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

    # many to many relationship for collaborators
    # allowed to make edits to the draft of a publication
    collaborators = models.ManyToManyField(User, related_name="collaborations", through='Collaboration')

    # the content of this lesson
    summary = PlaceholderField('lesson_summary')


    ########################################
    # Cloning references
    ########################################

    # the date this lesson was cloned from a published lesson
    derived_date = models.DateTimeField(null=True)

    # the published lesson this lesson was derived from's ref_id
    derived_lesson_slug = models.CharField(null=True, default=None, editable=False, max_length=8)

    # the user that created the lesson this was derived from
    derived_lesson_creator = models.ForeignKey(User, null=True, blank=True, related_name='inspired_lessons')




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
    #       ______________________________
    #       parent_link
    #           When True and used in a model which inherits from another
    #           concrete model, indicates that this field should be used as
    #           the link back to the parent class, rather than the extra
    #           OneToOneField which would normally be implicitly created
    #           by subclassing.
    #
    # publishable = models.OneToOneField('core.Publishable', default=None, on_delete=modeld.SET_NULL, parent_link=True)

    def __str__(self):
        return self.name


    ########################################
    #   URL Methods
    ########################################

    # define for use by FormMixin
    # (calls this method specifically, but isn't defined by default... right...)
    def get_absolute_url(self):
        return self.absolute_url()

    def absolute_url(self):
        return reverse('core:lesson_detail', kwargs={
            'slug': self.slug
        })

    # path to the manage page for a topic
    def manage_url(self):
        return reverse('manage:lesson_content', kwargs={
            'slug': self.slug
        })

    # path to the edit page for a topic
    def edit_url(self):
        return reverse('editor:lesson_edit', kwargs={
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

    ########################################
    #   Query Methods/properties
    ########################################

    # TODO: Watch for this, as formsets may not access this with update
    def save(self, **kwargs):
        # print('---- in custom lesson save')
        # set depth level on save
        if self.parent_lesson:
            self.depth = self.parent_lesson.depth + 1
        else:
            self.depth = 0

        # TODO: this needs to be flipped
        # based on depth level set the depth label
        self.depth_label = {
            0: 'Module',
            1: 'Topic',
            2: 'Lesson',
        }.get(self.depth, "INVALID")

        super(Lesson, self).save(**kwargs)

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
        #           if not self.parent_lesson and self.is_draft and Lesson.objects.exclude(pk=self.pk).filter(name=self.name, is_draft=True).exists():
        #               raise ValidationError('A Draft-Lesson with this name already exists')

        return super(Lesson, self).validate_unique(exclude)

    @property
    def total_depth(self):
        '''
            method to return the total depth of this lesson's structure
            (the max level of nested children)
        :return: integer representation of child depth
        '''

        if self.sub_lessons:

            max_depth = 0
            for sub_lesson in self.sub_lessons.all():
                max_depth = max(max_depth, sub_lesson.total_depth)

            return max_depth + 1
        else:
            return 1

    @property
    def num_children(self):
        return self.num_sections + self.num_sub_lessons

    @property
    def num_sections(self):
        return self.sections.count()

    @property
    def num_sub_lessons(self):
        return self.sub_lessons.count()

    def derivation(self):
        '''
            Method to copy a published lesson instance and set
            derivation attributes to point to this lesson and it's creator

        :return: new lesson instance with attributes set to link to derived lesson
        '''

        derivation = self.copy()
        derivation.derived_date = now()
        derivation.derived_lesson_slug = self.slug
        derivation.derived_lesson_creator = self.created_by

        return derivation

    def derive_children_from(self,from_lesson):
        self.sections.delete()
        self.sub_lessons.delete()

        for section_item in from_lesson.sections.all():
            # copy the section items and set their linked lesson to this new instance
            new_section = section_item.copy()

            new_section.lesson = self
            new_section.position = section_item.position

            # save the copied section instance
            new_section.save()
            new_section.copy_content(section_item)
            new_section.copy_children(section_item)

        for sub_lesson in from_lesson.sub_lessons.all():
            # copy the sub-lesson items and set their linked parent_lesson to this new instance
            new_lesson = sub_lesson.derivation()

            new_lesson.parent_lesson = self
            new_lesson.position = sub_lesson.position

            # save the copied sub-lesson instance
            new_lesson.save()
            new_lesson.copy_content(sub_lesson)
            new_lesson.derive_children_from(sub_lesson)


    ########################################
    #   Publication Method overrides
    ########################################

    def copy(self, maintain_ref=False):
        '''
            generate a new (unsaved) lesson instance based on this lesson, with a fresh ref_id if specified.

            Notes:
                The newly generated instance:
                    - removes reference to parent
                    - marks 'position' as 0
                    - and sets 'is_deleted' to False

                Additionally, this method does not copy placeholder(content), tags, collaborators, or
                child-objects (use copy_content (or copy_children for children) after save to do this)


        :return: a new (unsaved) copy of this lesson
        '''

        new_instance = Lesson(

            parent_lesson = None,
            position=0,
            is_deleted = False,

            name = self.name,
            short_name = self.short_name,


        )

        # if specified, mark this new instance as the same lesson
        # typically only used in publication methods
        if maintain_ref:
            new_instance.ref_id = self.ref_id

        if self.derived_date:
            new_instance.derived_date = self.derived_date
            new_instance.derived_lesson_slug = self.derived_lesson_slug
            new_instance.derived_lesson_creator = self.derived_lesson_creator




        return new_instance

    def copy_children(self, from_instance, maintain_ref=False):
        '''
            Copy child relations (sub_lessons/sections) from a passed lesson, with the option of specifying
            if the ref_id should be maintained. this should only happen during publishing.

        :param from_instance: Lesson instance from which the child relations are provided.
        :param maintain_ref: Boolean representing if the ref_id should be maintained on the child objects, this should only be true in the case of publication.

        :return: None
        '''
        # copy over the content
        #self.copy_content(from_instance)

        # Before copying related objects from the old instance, the ones
        # on the current one need to be deleted. Otherwise, duplicates may
        # appear on the public version of the page
        self.sections.delete()
        self.sub_lessons.delete()
        #self.app_refs.delete()

        for section_item in from_instance.sections.all():
            # copy the section items and set their linked lesson to this new instance
            new_section = section_item.copy(maintain_ref)

            new_section.lesson = self
            new_section.position = section_item.position

            # save the copied section instance
            new_section.save()
            new_section.copy_content(section_item)
            new_section.copy_children(section_item, maintain_ref)

        for sub_lesson in from_instance.sub_lessons.all():
            # copy the sub-lesson items and set their linked parent_lesson to this new instance
            new_lesson = sub_lesson.copy(maintain_ref)

            new_lesson.parent_lesson = self
            new_lesson.position = sub_lesson.position

            # save the copied sub-lesson instance
            new_lesson.save()
            new_lesson.copy_content(sub_lesson)
            new_lesson.copy_children(sub_lesson, maintain_ref)

        for app_ref in from_instance.app_refs.all():
            new_ref = AppReference(
                app_name=app_ref.app_name,
                app_link=app_ref.app_link,
                lesson=self,
            )
            new_ref.save()

    def copy_content(self, from_instance):
        '''
            copy content including tags, and placeholder plugins to this instance from a passed Lesson

        :param from_instance: a Lesson object the content/tags are being copied from
        :return: None
        '''

        # add any tags from the 'from_instance'
        self.tags.add(*list(from_instance.tags.names()))

        # clear any existing plugins
        self.summary.clear()

        # get the list of plugins in the 'from_instance's intro
        plugins = from_instance.summary.get_plugins_list()

        # copy 'from_instance's intro plugins to this object's intro
        copy_plugins_to(plugins, self.summary, no_signals=True)

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

    def has_draft_access(self, user):

        # if passes the default permission check (owner/admin) return true
        if(super(Lesson, self).has_draft_access(user)):
            return True
        else:
            # else check if the current user is a collaborator for this lesson
            # or is a collaborator on the root object

            access_conditions = [
                self.collaborators.filter(pk=user.pk).exists(),
                self.get_Publishable_parent().collaborators.filter(pk=user.pk).exists(),
            ]
            
            return any(access_conditions)

    def has_edit_access(self, user):

        # user can edit if they are the owner or have been marked as a collaborator with
        # edit access on either this lesson or the parent publication
        access_conditions = [
            self.get_owner() == user,
            Collaboration.objects.filter(publication=self, collaborator=user, can_edit=True).exists(),
            Collaboration.objects.filter(publication=self.get_Publishable_parent(), collaborator=user, can_edit=True).exists(),
        ]

        return any(access_conditions)

    def get_owner(self):
        '''
            get the owner of the lesson (created-by), if this is a child lesson
            return the owner of it's parent
        :return: user who created the root lesson
        '''
        if self.parent_lesson:
            return self.parent_lesson.get_Publishable_parent().get_owner()
        else:
            return self.created_by





class Section(PolyPublicationChild):

    objects = PolyIterativeDeletion_Manager()

    class Meta:
        app_label = 'core'
        # unique_together = ('lesson','name')  # enforce only unique section names within a lesson
        ordering = ('position',)
        verbose_name_plural = 'Sections'
        manager_inheritance_from_future = True

    ########################################
    #   Fields
    ########################################

    # boolean field representing if a lesson is (soft) deleted
    #   TODO: this has not been factored into the system yet, implementation will require revision of delete method
    is_deleted = models.BooleanField(default=False)

    #ref_id = RandomCharField(unique=True,length=8,include_punctuation=False,)
    ref_id = models.UUIDField(default=uuid.uuid4, editable=False)

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
                         max_length=8,
                         unique=True,
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

    ########################################
    #   Methods
    ########################################
    # define for use by FormMixin
    # (calls this method specifically, but isn't defined by default... right...)
    def get_absolute_url(self):
        return self.absolute_url()


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

    ########################################
    #   Publication Method overrides
    ########################################

    def get_Publishable_parent(self):
        # return self.lesson.topic.module

        # return this sections parent's publishible parent
        return self.lesson.get_Publishable_parent()

    def has_draft_access(self, user):
        return self.lesson.has_draft_access(user)

    def has_edit_access(self, user):
        # user can edit if they have been marked as a collaborator with
        # edit access on either this sections parent lesson or the parent publication
        access_conditions = [
            self.lesson.get_owner() == user,
            Collaboration.objects.filter(publication=self.lesson, collaborator=user, can_edit=True).exists(),
            Collaboration.objects.filter(publication=self.get_Publishable_parent(), collaborator=user, can_edit=True).exists(),
        ]

        return any(access_conditions)

    def get_owner(self):
        return self.lesson.get_owner()

    @property
    def is_dirty(self):
        # a module is considered dirty if it's pub_status is pending, or if it contains any plugins
        # edited after the most recent change date.
        return super(Section, self).is_dirty



####################################################################
#   Collaborator relationship model
###################################################################

class Collaboration(models.Model):
    # dont think we need a meta for the m2m mapping table
    class Meta:
        app_label = 'core'
        verbose_name = 'Collaboration'
        verbose_name_plural = 'Collaborations'
        unique_together = (
            'publication',
            'collaborator',
        )




    # the publication being collaborated on
    publication = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE
    )

    # the user being granted draft permissions
    collaborator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text=u'User being given Draft-View Permissions.',
    )

    # collaboration permissions
    can_edit = models.BooleanField(
        default=True,
        help_text=u'Allow this person edit the Lesson? if not checked, user will only be given view permissions to the Draft.',
        )

    # the date the collaboration was initiated
    collaboration_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return "Collab: %s -> %s" % (self.collaborator.__str__(), self.publication.__str__())





''' --------------------------------------------------------------- 

    DEPRECIATED (Kept for potential future reference)
     Assign any signals needed for clearing placeholder fields of a model

     WARNING:
         IF A MODEL HAS A 'PLACEHOLDERFIELD' AND AN APPROPRIATE SIGNAL IS NOT SET FOR IT
         THE PLUGIN INSTANCES WILL REMAIN IN THE DATABASE, WHICH WILL LEAD TO ORPHANED DATA

--------------------------------------------------------------- '''

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

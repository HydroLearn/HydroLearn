import datetime
import uuid
import copy
from enum import Enum
from django.conf import settings
from django.db import models, transaction
# from django.db.models.query import QuerySet
# from django.utils.functional import cached_property

#from src.apps.core.models.module_models import Module
# from polymorphic.models import PolymorphicModel
#from treebeard.mp_tree import MP_NodeManager, MP_NodeQuerySet, MP_Node

from src.apps.core.models.CreationTrackingModels import (
    CreationTrackingBaseModel,
    PolyCreationTrackingBaseModel,
)

from src.apps.core.managers.PublicationManagers import (
    PublicationManager,
    PolyPublicationManager,
)

# from src.apps.core.managers.IterativeDeletionManagers import (
#     IterativeDeletion_QuerySet,
#     IterativeDeletion_Manager,
#     PolyIterativeDeletion_QuerySet,
#     PolyIterativeDeletion_Manager,
#
# )



User = settings.AUTH_USER_MODEL

# to get current user in a model method use the following local import
#   from cms.utils.permissions import get_current_user


#PUBLICATION_STATE_DEFAULT = 0
#PUBLICATION_STATE_DIRTY = 1
# Page was marked published, but some of page parents are not.
#PUBLICATION_STATE_PENDING = 4




'''
    to add a unique constraint for a field in an inheriting model: 
    - override the child model's 'validate-unique' method and perform the necessary tests raising 'ValidationError' if needed.
        - this will ensure that multiple Published versions can exist, allowing for potential reversion to older published copies
        
        i.e.
                                    draft-copy
        pub_1 -> pub_2 -> ... -> pub_n^
         
    example adding unique constraint on a name:
    
    PublishableChild(Publication):
        class Meta:
            #... ignore unique constraint here, unless absolutely needed...
            
        def validate_unique(self, exclude=None):        
            if self.is_draft and PublishableChild.objects.exclude(pk=self.pk).filter(name=self.name, is_draft=True).exists():
                raise ValidationError('A Draft-PubishableChild with this name already exists')

            return super(Module, self).validate_unique(exclude)
    
    
'''

class Publication(CreationTrackingBaseModel):
    class Meta:
        app_label = 'core'
        verbose_name_plural = 'Publications'
        unique_together = ('pub_id', 'is_draft')
        abstract = True
        base_manager_name = "objects"

    # define a non-sequential id field for publications, will be the same between pub/draft copies
    pub_id = models.UUIDField(default=uuid.uuid4, editable=False)

    # set a flag for marking 'draft' status
    is_draft = models.BooleanField(default=True, editable=False, db_index=True)

    # define the status states
    DRAFT_ONLY = "draft_only"
    PUBLISHED = "draft_published"

    # published states
    PUBLICATION_OBJECT = "current_publication"
    PAST_PUBLICATION = "past_publication"
    #PUB_CHILD = "pub_child"

    STATUS = (
        # draft States
        (DRAFT_ONLY, "Draft Only"),
        #(PENDING, "Pending Changes"),
        (PUBLISHED, "Published Draft"),

        # Published Copy states
        (PUBLICATION_OBJECT, "Current Publication"),
        (PAST_PUBLICATION, "Previously Published Copy"),
        #(PUB_CHILD, "Publication Child"),
    )

    publish_status = models.CharField(max_length=25, choices=STATUS, default=DRAFT_ONLY, editable=False)

    # the published copy relation (same pub_id will be used to relate pub/draft copies)
    published_copy = models.OneToOneField(
        'self',
        #on_delete=models.CASCADE,
        on_delete=models.SET_NULL,
        related_name='draft_copy',
        null=True,
        editable=False,
    )

    # potentially add in manually maintained published date
    published_date = models.DateTimeField(blank=True,null=True,default=None)

    objects = PublicationManager()

    def __str__(self):

        title = "({publish_status}) Publication".format(
            publish_status= self.publish_status,
        )

        return title

    def __repr__(self):
        display = '<{module}.{class_name} id={id} is_draft={is_draft} object at {location}>'.format(
            module=self.__module__,
            class_name=self.__class__.__name__,
            id=self.pk,
            is_draft=self.is_draft,
            location=hex(id(self)),
        )
        return display

    def save(self, **kwargs):

        if self.is_draft:
            if not bool(self.pk) or self.published_copy is None:
                self.publish_status = self.DRAFT_ONLY

            if self.published_copy is not None:
                self.publish_status = self.PUBLISHED

        else: # if saving a non-draft publication
            self.publish_status = self.PUBLICATION_OBJECT

        super(Publication, self).save(**kwargs)

    def delete(self, using=None, keep_parents=False):
        # if deleting the draft copy, also delete the published copy
        if self.is_draft:
            if self.published_copy:
                self.published_copy.delete()
        return super(Publication, self).delete(using,keep_parents)

    def _copy_attributes_to(self, target):
        """
        Copy all necessary publication data to the target. This excludes parent and other values
        that are specific to an exact instance.
        :param target: The Publication to copy the attributes to
        """

        target.pub_id = self.pub_id

    def revert_to_live(self):
        ''' if there is a published copy, revert the current draft to the published version
        '''
        # assert that we can only revert a draft copy
        assert self.is_draft, "Cannot 'revert_to_live' a published copy. Use draft copy."

        with transaction.atomic():

            publish_copy = self.get_public_object()
            assert publish_copy, "There is no published copy to revert to."

            # copy the attributes and contents to this (draft) instance of publication
            publish_copy._copy_attributes_to(self)

            self.publish_status = self.PUBLISHED

            self.save()

    def copy(self, maintain_ref=False):
        raise NotImplemented("Objects Inheriting from Publication must provide a 'copy' method to generate a new instance! (don't call this super method)")

    def copy_content(self, from_instance):
        raise NotImplemented("Objects Inheriting from a Publication must provide a 'copy_content' method to copy over content fields after saving a new 'copy'! (don't call this super method)")

    def copy_children(self, from_instance, maintain_ref=False):
        raise NotImplemented("Objects Inheriting from a Publication must provide a 'copy_children' method for copying any child objects! (don't call this super method)")

    def publish(self):
        '''
            Generate a new published copy for a Draft (publication with is_draft == True)
            or throw error if attempting to publish a published copy. (cant publish 'a publication', only 'a draft')
        :return: None
        '''

        '''
            TODO: 
                -   Modify this method to maintain a 'publish' copy instead of deleting it (maintaining the slug)
                -   implement a linkage between 'past publications' and the current publication
                -   determine if publication linkage should be utilizing the same FK relationship as 'draft/publish'
                    or if a new key relationship should be added. (should be able to get away with the same ideally)
                    
                
            ideal method will be: 
                - copy the current publication and store it. (linked to the current published copy)
                - update the current publication with the content of the current draft.
                
                
            
            
        '''

        assert self.is_draft, "Published instance cannot be published. Use Draft"


        with transaction.atomic():
            # if there's an existing publication, delete it (hopefully this wont delete the draft too...)
            if self.published_copy:
                self.published_copy.delete()
                self.published_copy = None
                self.save()

            # create a new publication with the same publication id as the draft, and same creator
            public_page = self.copy(True)



            # copy any additional attributes from draft to public copy
            self._copy_attributes_to(public_page)


            public_page.is_draft = False
            public_page.publish_status = self.PUBLICATION_OBJECT

            #public_page.published_date = datetime.datetime.now()

            # save publication to generate instance
            public_page.save()

            # copy any children
            public_page.copy_content(self)
            public_page.copy_children(self, True)

            # mark the current draft as published (happens in save)
            #self.publish_status = self.PUBLISHED
            self.published_copy = public_page

            # save the draft with the new reference to the public copy
            self.save()

            # only way to ensure published time is correct is to save it after the draft
            public_page.published_date = datetime.datetime.now()
            public_page.save()

        # save the new published copy
        #public_page.save()

    def unpublish(self):
        # if there is an existing published copy of this Publication, delete it and save
        assert self.is_draft, "Can only Unpublish from Draft Copy of Publication."

        with transaction.atomic():
            if self.published_copy:
                self.published_copy.delete()
                self.published_copy = None
                self.save()

    def is_published(self):
        assert self.is_draft, "Can only check publish status on Draft copy."
        return self.published_copy is not None


    @property
    def is_dirty(self):
        '''
            method to check if the publication child has been modified after the last
            change to it's parent publication
        :return: Boolean representing if the child is dirty
        '''
        if not self.is_draft:
            return False


        return self.publish_status != self.PUBLISHED

    def get_publish_status(self):
        return self.publish_status

    def get_public_url(self, language=None, fallback=True):
        try:
            return self.get_public_object().get_absolute_url(language, fallback)
        except:
            return ''

    def get_draft_url(self, language=None, fallback=True):
        try:
            return self.get_draft_object().get_absolute_url(language, fallback)
        except:
            return ''

    def get_draft_object(self):
        if not self.is_draft:
            return self.draft_copy
        return self

    def get_public_object(self):
        if not self.is_draft:
            return self
        return self.published_copy

    def has_draft_access(self, user):
        '''
            Method to determine if a passed user has access to draft content of this publication
            (expected to be overwritten by the inheriting object)
        :param user: the user object being checked for permission
        :return: Boolean representing if the user is allowed access to a publication's draft
        '''

        # define the list of access conditions for draft versions of this model
        if not user.is_authenticated(): return False

        draft_access_conditions = [
            user.is_admin or self.created_by == user,
        ]

        return all(draft_access_conditions)

    def user_has_access(self, user):
        '''
            Method to determine if a passed user has access to draft content of this publication.
            (expected to be overwritten by the inheriting object)
        :param user: the user object being checked for permission
        :return: Boolean representing if the user is allowed access to a publication

        '''
        # determine if user has access based on the publication state of this object
        return {
            # Published version is accessible
            self.PUBLICATION_OBJECT: True,

            # past publications are only available for users with draft access
            self.PAST_PUBLICATION: self.has_draft_access(user),

            # draft states
            self.PUBLISHED: self.has_draft_access(user),
            #self.PENDING: self.has_draft_access(user),
            self.DRAFT_ONLY: self.has_draft_access(user),

        }.get(self.publish_status, False)

    def get_owner(self):
        return self.created_by

class PublicationChild(CreationTrackingBaseModel):
    class Meta:
        app_label = 'core'
        verbose_name_plural = 'Publication Children'
        abstract = True

    def get_Publishable_parent(self):
        '''
            method to return the parent publication
        :return:
        '''
        raise NotImplemented("Models Inheriting from PublicationChild must define 'get_Publishable_parent method' to return the parent publication")


    def is_draft(self):
        parent = self.get_Publishable_parent()
        return parent.is_draft

    @property
    def is_dirty(self):
        '''
            method to check if the publication child has been modified after the last
            change to it's parent publication
        :return: Boolean representing if the child is dirty
        '''

        if self.get_Publishable_parent().published_copy is None: return True

        # theoretically this cant be right either...
        # publish draft (sets changed) -> edit child -> edit draft (sets changed) -> boom... wrong
        return self.changed_date > self.get_Publishable_parent().published_copy.published_date

    def has_draft_access(self, user):
        '''
            will be determined by parent publication's access
        :param user: the user object being checked for permission
        :return: Boolean representing if the user is allowed access to a publication's draft
        '''

        return self.get_Publishable_parent().has_draft_access(user)

    # should this override save to trigger saving of parent? this would technically be accurate, right?
    #   if a child changes, it's parent by relation has changed

    def get_owner(self):
        return self.get_Publishable_parent().get_owner()


class PolyPublication(PolyCreationTrackingBaseModel):
    class Meta:
        app_label = 'core'
        verbose_name_plural = 'Poly-Publications'
        #unique_together = ('node','is_draft')
        unique_together = ('pub_id', 'is_draft')
        abstract = True
        base_manager_name = "objects"

    # define a non-sequential id field for publications, will be the same between pub/draft copies
    pub_id = models.UUIDField(default=uuid.uuid4, editable=False)

    # set a flag for marking 'draft' status
    is_draft = models.BooleanField(default=True, editable=False, db_index=True)

    # define the status states
    DRAFT_ONLY = "draft_only"
    #PENDING = "pending_changes"
    PUBLISHED = "published"
    PUBLICATION_OBJECT = "current_publication"
    PAST_PUBLICATION = "past_publication"

    STATUS = (
        # draft States
        (DRAFT_ONLY, "Draft Only"),
        #(PENDING, "Pending Changes"),
        (PUBLISHED, "Published"),

        # Published Copy states
        (PUBLICATION_OBJECT, "Is Current Publish"),
        (PAST_PUBLICATION, "Previously Published"),
    )

    publish_status = models.CharField(max_length=25, choices=STATUS, default=DRAFT_ONLY, editable=False)

    # the published copy relation (same pub_id will be used to relate pub/draft copies)
    published_copy = models.OneToOneField(
        'self',
        # on_delete=models.CASCADE,
        on_delete=models.SET_NULL,
        related_name='draft_copy',
        null=True,
        editable=False,
    )

    objects = PolyPublicationManager()

    def __str__(self):

        title = "({publish_status}) Publication".format(
            publish_status=self.publish_status,
        )

        return title

    def __repr__(self):
        display = '<{module}.{class_name} id={id} is_draft={is_draft} object at {location}>'.format(
            module=self.__module__,
            class_name=self.__class__.__name__,
            id=self.pk,
            is_draft=self.is_draft,
            location=hex(id(self)),
        )
        return display

    def save(self, **kwargs):
        #print("**************** IN PUBLICATION SAVE")
        is_new_instance = not bool(self.pk)

        if not self.is_draft:  # if saving a non-draft publication
            self.publish_status = self.PUBLICATION_OBJECT

            # add in methods to change status on existing publications for this object to 'PAST_PUBLICATION'

        elif is_new_instance:  # and is a draft draft
            self.publish_status = self.DRAFT_ONLY

        else:  # is a draft, and is existing instance
            # if there's a published copy,
            #   check if this save is from the 'publish' method, if so set to PUBLISHED, otherwise PENDING changes
            if self.published_copy:
                return self.PUBLISHED
            else:  # if no published copy at time of save, set to draft only
                self.publish_status = self.DRAFT_ONLY

        super(PolyPublication, self).save(**kwargs)

    def delete(self, using=None, keep_parents=False):
        # if deleting the draft copy, also delete the published copy
        if self.is_draft:
            if self.published_copy:
                self.published_copy.delete()
        return super(PolyPublication, self).delete(using, keep_parents)

    def _copy_attributes_to(self, target):
        """
        Copy all necessary publication data to the target. This excludes parent and other values
        that are specific to an exact instance.
        :param target: The Publication to copy the attributes to
        """

        target.pub_id = self.pub_id

    def revert_to_live(self):
        ''' if there is a published copy, revert the current draft to the published version
        '''
        # assert that we can only revert a draft copy
        assert self.is_draft, "Cannot 'revert_to_live' a published copy. Use draft copy."

        with transaction.atomic():
            publish_copy = self.get_public_object()
            assert publish_copy, "There is no published copy to revert to."

            # copy the attributes and contents to this (draft) instance of publication
            publish_copy._copy_attributes_to(self)

            self.publish_status = self.PUBLISHED

            self.save()

    def publish(self):

        assert self.is_draft, "Published instance cannot be published. Use Draft"

        with transaction.atomic():
            # if there's an existing publication, delete it (hopefully this wont delete the draft too...)
            if self.published_copy:
                self.published_copy.delete()
                self.published_copy = None
                self.save()

            # create a new publication with the same publication id as the draft, and same creator
            public_page = self.copy(True)

            # copy any additional attributes from draft to public copy
            self._copy_attributes_to(public_page)

            public_page.is_draft = False
            public_page.publish_status = self.PUBLICATION_OBJECT
            public_page.published_copy = public_page

            # save publication to generate instance
            public_page.save()

            # copy any children
            public_page.copy_content(self)
            public_page.copy_children(self, True)

            # mark the current draft as published (happens in save)
            # self.publish_status = self.PUBLISHED
            self.published_copy = public_page

            # save the draft with the new reference to the public copy
            self.save()



        # save the new published copy
        # public_page.save()

        # TODO: add method of marking descendants as published (potentially add in an MP_Node implementation)

    def unpublish(self):
        # if there is an existing published copy of this Publication, delete it and save
        assert self.is_draft, "Can only Unpublish from Draft Copy of Publication."

        with transaction.atomic():
            if self.published_copy:
                self.published_copy.delete()
                self.published_copy = None
                self.save()

    def is_published(self):
        assert self.is_draft, "Can only check publish status on Draft copy."
        return self.published_copy is not None

    def get_publish_status(self):
        return self.publish_status

    def get_public_url(self, language=None, fallback=True):
        try:
            return self.get_public_object().get_absolute_url(language, fallback)
        except:
            return ''

    def get_draft_url(self, language=None, fallback=True):
        try:
            return self.get_draft_object().get_absolute_url(language, fallback)
        except:
            return ''

    def get_draft_object(self):
        if not self.is_draft:
            return self.draft_copy
        return self

    def get_public_object(self):
        if not self.is_draft:
            return self
        return self.published_copy

    def has_draft_access(self, user):
        '''
            Method to determine if a passed user has access to draft content of this publication
            (expected to be overwritten by the inheriting object)
        :param user: the user object being checked for permission
        :return: Boolean representing if the user is allowed access to a publication's draft
        '''

        # define the list of access conditions for draft versions of this model
        if not user.is_authenticated(): return False

        draft_access_conditions = [
            user.is_admin or self.created_by == user,
        ]

        return all(draft_access_conditions)

    def user_has_access(self, user):
            '''
                Method to determine if a passed user has access to draft content of this publication.
                (expected to be overwritten by the inheriting object)
            :param user: the user object being checked for permission
            :return: Boolean representing if the user is allowed access to a publication

            '''
            # determine if user has access based on the publication state of this object
            return {
                # Published version is accessible
                self.PUBLICATION_OBJECT: True,

                # past publications are only available for users with draft access
                self.PAST_PUBLICATION: self.has_draft_access(user),

                # draft states
                self.PUBLISHED: self.has_draft_access(user),
                #self.PENDING: self.has_draft_access(user),
                self.DRAFT_ONLY: self.has_draft_access(user),

            }.get(self.publish_status, False)

class PolyPublicationChild(PolyCreationTrackingBaseModel):
    class Meta:
        app_label = 'core'
        verbose_name_plural = 'Poly-Publication Children'
        abstract = True

    def copy(self, maintain_ref=False):
        raise NotImplemented("Objects Inheriting from Publication must provide a 'copy' method to generate a new instance! (don't call this super method)")

    def copy_content(self, from_instance):
        raise NotImplemented("Objects Inheriting from a Publication must provide a 'copy_content' method to copy over content fields! (don't call this super method)")

    def copy_children(self, from_instance, maintain_ref=False):
        raise NotImplemented("Objects Inheriting from a Publication must provide a 'copy_children' method for copying any child objects! (don't call this super method)")


    def get_Publishable_parent(self):
        '''
            method to return the parent publication
        :return:
        '''
        raise NotImplemented("Models Inheriting from PolyPublicationChild must define 'get_Publishable_parent method' to return the parent publication")

    def is_draft(self):
        parent = self.get_Publishable_parent()
        return parent.is_draft

    @property
    def is_dirty(self):
        '''
            method to check if the publication child has been modified after the last
            change to it's parent publication
        :return: Boolean representing if the child is dirty
        '''

        if self.get_Publishable_parent().published_copy is None: return True

        # theoretically this cant be right either...
        # publish draft (sets changed) -> edit child -> edit draft (sets changed) -> boom... wrong
        return self.changed_date > self.get_Publishable_parent().published_copy.published_date

    def has_draft_access(self, user):
        '''
            will be determined by parent publication's access
        :param user: the user object being checked for permission
        :return: Boolean representing if the user is allowed access to a publication's draft
        '''

        return self.get_Publishable_parent().has_draft_access(user)


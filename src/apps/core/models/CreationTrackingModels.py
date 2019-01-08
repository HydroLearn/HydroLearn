from django.db import models
from django.conf import settings
from polymorphic.models import PolymorphicModel

#from accounts.models import User

'''============================================================
  Abstract class for creation tracking
    -stores created/updated dates and users for all models that inherit it    
 ==========================================================='''

User = settings.AUTH_USER_MODEL

class CreationTrackingBaseModel(models.Model):
    '''
        Abstract model for keeping track of which user created a resource and last updater of the resource
        also keeps timestamps of each
    '''
    class Meta:
        abstract = True

    # map the creation/updater user and dates for the publication
    created_by = models.ForeignKey(User, null=False, blank=False, related_name='created_%(class)ss')
    changed_by = models.ForeignKey(User, null=False, blank=False, related_name='changed_%(class)ss')
    creation_date = models.DateTimeField(auto_now_add=True)
    changed_date = models.DateTimeField(auto_now=True)


    # def save(self, *args, **kwargs):
    #
    #     from cms.utils.permissions import get_current_user
    #     self.changed_by = get_current_user()
    #
    #     is_new_instance = not bool(self.pk)
    #
    #     if is_new_instance:
    #         self.created_by = self.changed_by
    #
    #
    #     super(CreationTrackingBaseModel, self).save(*args, **kwargs)

    def is_owner(self, user):
        # provided a user
        if user:
            # if user is the one that created this object return true
            if self.created_by == user:
                return True

        return False

class PolyCreationTrackingBaseModel(PolymorphicModel):
    '''
        Abstract model for keeping track of which user created a resource and last updater of the resource
        also keeps timestamps of each
        (PolymorphicModel inherited)
    '''
    class Meta:
        abstract = True

    # map the creation/updater user and dates for the publication
    created_by = models.ForeignKey(User, null=False, blank=False, related_name='created_%(class)ss')
    changed_by = models.ForeignKey(User, null=False, blank=False, related_name='changed_%(class)ss')
    creation_date = models.DateTimeField(auto_now_add=True)
    changed_date = models.DateTimeField(auto_now=True)

    # def save(self, *args, **kwargs):
    #     from cms.utils.permissions import get_current_user
    #     self.changed_by = get_current_user()
    #
    #     is_new_instance = not bool(self.pk)
    #
    #     if is_new_instance:
    #         self.created_by = self.changed_by
    #
    #     super(PolyCreationTrackingBaseModel, self).save(*args, **kwargs)

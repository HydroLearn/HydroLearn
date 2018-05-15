from django.db import models
from django.conf import settings
#from django.contrib.auth.models import User
from polymorphic.models import PolymorphicModel

from accounts.models import User

'''============================================================
  Abstract class for creation tracking
    -stores created/updated dates and users for all models that inherit it    
 ==========================================================='''

User = settings.AUTH_USER_MODEL

class CreationTrackingBaseModel(models.Model):
    class Meta:
        abstract = True

    created_at = models.DateTimeField(auto_now_add=True)
    #created_at = models.DateTimeField(default=datetime.now)

    updated_at = models.DateTimeField(auto_now=True)
    #updated_at = models.DateTimeField(default=datetime.now)

    created_by = models.ForeignKey(User, null=False, blank=False, related_name='created_%(class)ss')
    updated_by = models.ForeignKey(User, null=False, blank=False, related_name='last_updated_%(class)ss')

    #shared_with = models.ManyToManyField(User)

class PolyCreationTrackingBaseModel(PolymorphicModel):
    class Meta:
        abstract = True

    created_at = models.DateTimeField(auto_now_add=True)
    #created_at = models.DateTimeField(default=datetime.now)

    updated_at = models.DateTimeField(auto_now=True)
    #updated_at = models.DateTimeField(default=datetime.now)

    created_by = models.ForeignKey(User, null=False, blank=False, related_name='created_%(class)ss')
    updated_by = models.ForeignKey(User, null=False, blank=False, related_name='last_updated_%(class)ss')

    #shared_with = models.ManyToManyField(User)

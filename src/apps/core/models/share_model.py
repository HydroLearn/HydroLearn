from django.db import models
from django.conf import settings

from src.apps.core.models.module_models import Module


#from accounts.models import User  # not sure this is needed
User = settings.AUTH_USER_MODEL

class ShareMapping(models.Model):

    class Meta:
        unique_together = ('user', 'module')
        verbose_name_plural = 'ShareMappings'

    # map to a user and a module
    user = models.ForeignKey(User, null=False, blank=False, related_name='shared_with')
    module = models.ForeignKey(Module, null=False, blank=False, related_name='shared_module')

    # record the date the module was shared with the user
    shared_date = models.DateTimeField(auto_now_add=True)

    #  define share permissions
    can_view = models.BooleanField(default=True)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_publish = models.BooleanField(default=False)


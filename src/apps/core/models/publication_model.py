from django.db import models
from src.apps.core.models.module_models import Module

class Publication(models.Model):
    class Meta:
        app_label = 'core'
        verbose_name_plural = 'Publications'


    # map to a user and a module
    # user = models.ForeignKey(User, null=False, blank=False, related_name='shared_with')
    # module = models.ForeignKey(Module, null=False, blank=False, related_name='shared_module')

    # record the date the module was shared with the user
    # date = models.DateTimeField(auto_now_add=True)


    draft = models.ForeignKey(Module, null=False, blank=False, related_name='draft_copy')
    published = models.ForeignKey(Module, null=True, related_name='published_copy')


class PublishableModelMixin(models.Model):
    class Meta:
        abstract = True

    is_draft = models.BooleanField(default=True)


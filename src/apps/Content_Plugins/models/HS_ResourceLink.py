from django.db import models
from cms.plugin_base import CMSPlugin

from django.utils.translation import ugettext as _

class HS_ResourceLink_model(CMSPlugin):
    class Meta:
        verbose_name = 'HydroShare Resource Link'
        verbose_name_plural = 'HydroShare Resource Links'

    display_text = models.CharField(
        'Resource Display Text',
        blank=True,
        default="",
        help_text=_("Display Text for resource link (defaults to 'Resource Link url')"),
        max_length=255,
    )

    resource_type = models.CharField(
        "HydroShare Resource Type",
        blank=False,
        default="",
        help_text=_("Please supply a HydroShare Resource type"),
        max_length= 64,

    )

    resource_link = models.URLField(
        'HydroShare Resource Link',
        blank=False,
        default="",
        help_text=_('Please supply a HydroShare Resource Link'),
    )

    def __str__(self):
        return _('HS_Resource: %s:%s' % (self.resource_type, self.resource_link))

    def __unicode__(self):
        return _('HS_Resource: %s:%s' % (self.resource_type, self.resource_link))

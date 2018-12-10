from django.db import models, transaction
from src.apps.core.models.SectionTypeModels import ActivitySection

from django.utils.translation import ugettext as _

class Resource(models.Model):

    class Meta:
        app_label = 'core'
        verbose_name = 'Resource'
        verbose_name_plural = 'Resources'

    # the display text for the resource
    display_text = models.CharField(
        'Resource Display Text',
        blank=True,
        default="",
        help_text=_("Display Text for resource link (defaults to 'Resource Link url')"),
        max_length=255,
    )

    # the resource type of the HydroShare resource
    resource_type = models.CharField(
        "HydroShare Resource Type",
        blank=False,
        default="",
        help_text=_("Please supply a HydroShare Resource type"),
        max_length=64,

    )

    # the api link to the hydroshare resource
    resource_link = models.URLField(
        'HydroShare Resource Link',
        blank=False,
        default="",
        help_text=_('Please supply a HydroShare Resource Link'),
    )

    # the activity this resource is linked to
    activity = models.ForeignKey(
        'core.ActivitySection',
        related_name="resources",
        blank=False,
        default=None,
        help_text=u'Please specify the Activity Section for this Resource.',
        null=False,
        on_delete=models.CASCADE,
    )

    def __str__(self):
        return _('Resource: %s:%s' % (self.resource_type, self.resource_link))

    def __unicode__(self):
        return _('Resource: %s:%s' % (self.resource_type, self.resource_link))

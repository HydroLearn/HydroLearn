from django.db import models, transaction
from django.core.urlresolvers import reverse
# from src.apps.core.models.SectionTypeModels import ActivitySection

from django.utils.translation import ugettext as _

class AppReference(models.Model):

    class Meta:
        app_label = 'core'
        verbose_name = 'Application Reference'
        verbose_name_plural = 'Application Reference'

    changed_date = models.DateTimeField(auto_now=True)


    # the display text for the resource
    app_name = models.CharField(
        'App Name',
        blank=False,
        default="",
        help_text=_("Display Text for Application in your module (Tab Text)"),
        max_length=255,
    )

    # the api link to the hydroshare resource
    app_link = models.URLField(
        'Application URL',
        blank=False,
        default="",
        help_text=_('Please supply a URL to a valid HydroShare Hosted Application'),
    )

    # the activity this resource is linked to
    lesson = models.ForeignKey(
        'core.Lesson',
        related_name="app_refs",
        blank=False,
        default=None,
        help_text=u'Please specify the parent Lesson for this Application.',
        null=False,
        on_delete=models.CASCADE,
    )

    def edit_url(self):
        return reverse('editor:app_ref_edit', kwargs={
            'parent_lesson': self.lesson.slug,
            'pk': self.pk
        })

    def __str__(self):
        return _('AppReference: %s:%s' % (self.lesson.name, self.app_name))

    def __unicode__(self):
        return _('AppReference: %s:%s' % (self.lesson.name, self.app_name))

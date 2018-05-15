# -*- coding: utf-8 -*-

from django.db import models
from djangocms_text_ckeditor.fields import HTMLField
from filer.fields.image import FilerImageField

from cms.models import CMSPlugin

#
# class OverlaidImgModel(CMSPlugin):
#
#     Img = FilerImageField(
#         null=True,
#         blank=True,
#         related_name='background_img',
#         help_text=u"Please select an image to use as the background"
#     )
#
#     overlay = HTMLField(
#         configuration='CKEDITOR_SETTINGS_OverlayImg',
#         blank=True,
#         help_text=u"Please provide the text to display over the image.",
#     )
#
#     # def __unicode__(self):
#     #     return u''
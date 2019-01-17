from django.db import models
from django.db.models.fields.files import ImageField
from django.conf import settings

import os
from uuid import uuid4
from django.core.signing import Signer

User = settings.AUTH_USER_MODEL


def path_and_rename(instance, filename):
    '''
        mapper function for the 'upload_to' argument of file fields
        for storing media files

    :param instance: instance being saved
    :param filename: initial filename of media being saved
    :return:
    '''

    ext = filename.split('.')[-1]

    user_hash = str(instance.created_by.pk)

    # get filename
    if instance.pk:
        filename = '{}.{}'.format(instance.pk, ext)
    else:
        # set filename as random string
        filename = '{}.{}'.format(uuid4().hex, ext)
    # return the whole path to the file
    return os.path.join(instance.UPLOAD_ROOT, user_hash, filename)




class Image(models.Model):
    class Meta:
        app_label = 'uploads'
        ordering = ('creation_date',)
        verbose_name = 'Uploaded Image'
        verbose_name_plural = 'Uploaded Images'

    UPLOAD_ROOT = 'uploads/Images'

    # maintain reference to user and date created
    created_by = models.ForeignKey(
        User,
        null=False,
        blank=False,
        related_name='uploaded_images',
    )

    creation_date = models.DateTimeField(auto_now_add=True)

    # is_temp is designed to mark images that were uploaded
    #   through the editor
    #   upon saving a model with a reference to the image
    #   it is expected to update the associated images to is_temp=False
    is_temp = models.BooleanField(
        default=True,
        null=False,
        verbose_name="Temp Image",
        help_text="Checking this option marks the image for deletion within 24 hours. (allowing temp image hosting for use in the editor)",
    )


    # image field
    img = ImageField(upload_to=path_and_rename)




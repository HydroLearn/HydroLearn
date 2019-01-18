from django.db import models
from django.db.models.fields.files import ImageField
from django.conf import settings
import os
from uuid import uuid4

from django.dispatch import receiver

from easy_thumbnails.alias import aliases
from easy_thumbnails.fields import ThumbnailerImageField
from easy_thumbnails.files import get_thumbnailer
from easy_thumbnails.signals import saved_file
from easy_thumbnails.signal_handlers import generate_aliases_global


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
    # img = ImageField(upload_to=path_and_rename)
    img = ThumbnailerImageField(upload_to=path_and_rename, blank=True)


saved_file.connect(generate_aliases_global)

# generate thumbnail aliases for uploaded images
if not aliases.get('content_thumb'):
    aliases.set('content_thumb', {'size': (300, 200), 'crop': True})



# set up signal to auto delete the original image and any generated thumbnails
# on deletion of an image instance
#
@receiver(models.signals.post_delete, sender=Image)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """Deletes file from filesystem
    when corresponding `Image` object is deleted.
    """
    if instance.img:
        thumbmanager = get_thumbnailer(instance.img)
        thumbmanager.delete(save=False)
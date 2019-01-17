from django.contrib import admin
from src.apps.uploads.models import (
    Image
)


##############################################
#       Upload models admin
##############################################

class Uploads_ImageAdmin(admin.ModelAdmin):
    class Meta:
        model = Image
        exclude = ['is_temp']
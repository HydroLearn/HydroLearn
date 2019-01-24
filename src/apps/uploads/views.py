from django.db import transaction
from django.http import JsonResponse

from src.apps.uploads.models import (
    Image
)

from django.views.generic import (
    ListView,
    DetailView,

)

class Index(ListView):
    model = Image
    template_name = 'uploads/catalog.html'

class ImageListView(ListView):
    model = Image
    template_name = 'uploads/images/list.html'

    def get_queryset(self):
        return Image.objects.filter(created_by=self.request.user)

class ImageDetailView(DetailView):
    model = Image
    template_name = 'uploads/images/detail.html'



def ImageUpload(request):
    '''
        view method to process the adding of a temp image.
        Used by ckeditor for addition of image files in content

    :param request: request being processed
    :param User_pk: the user performing the upload
    :return: Json Response with a url parameter mapped to the newly uploaded image's url
            or None if process failed/not a post request
    '''

    if request.method == "POST":

        # get the uploaded file from the request
        file = request.FILES.get('upload', None)

        if file:
            # process the generation of the image object

            with transaction.atomic():
                # create a new upload image instance
                #   by default all uploaded images are marked as temp
                #   a separate process is run when content containers save
                #   to mark images that are actually used as non-temp
                new_upload = Image(
                        created_by=request.user,
                        img=file,
                    )
                # save the instance
                new_upload.save()

                # TODO:
                #   this method should return the link to the thumbnail
                #   not the image itself

                # return the new uploaded image's url
                return JsonResponse({'url': new_upload.img.url})

    return JsonResponse(None)



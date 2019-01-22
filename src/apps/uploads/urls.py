from django.conf.urls import url

from src.apps.uploads.views import (
    Index,
    ImageListView,
    ImageDetailView,

    ImageUpload,

)


app_name = 'uploads'
urlpatterns = [

    # image list view
    url(r'^$', Index.as_view(), name='catalog'),

    ####################################
    # Image Model Routes
    ####################################
        url(r'^imgs/$', ImageListView.as_view(), name='img_list'),
        url(r'^img/(?P<pk>[^/]+)$', ImageDetailView.as_view(), name='img_detail'),

        # upload a temp image
        # url(r'^image/upload/$', Index.as_view(), name="img_upload"),
        url(r'^image/upload/$', ImageUpload, name="img_upload"),

        # view a stored image
        url(r'^image/view/$', Index.as_view(), name="img_view"),

        # mark image as 'not temp'
        url(r'^image/mark/$', Index.as_view(), name="img_mark"),

        # delete image
        url(r'^image/delete/$', Index.as_view(), name="img_delete"),



]
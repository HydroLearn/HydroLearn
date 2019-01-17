from django.conf.urls import url

from src.apps.uploads.views import *


app_name = 'uploads'
urlpatterns = [

    # image list view
    url(r'^$', Index.as_view(), name='catalog'),

    ####################################
    # Image Model Routes
    ####################################
    # upload a temp image
    url(r'^image/upload/$', Index.as_view(), name="upload"),

    # view a stored image
    url(r'^image/view/$', Index.as_view(), name="view"),

    # mark image as 'not temp'
    url(r'^image/mark/$', Index.as_view(), name="mark"),

    # delete image
    url(r'^image/delete/$', Index.as_view(), name="delete"),

    # partial view paths
    # url(r'^my_listing/$', module_listing, name="module_list"),
    # url(r'^my_collabs/$', collab_listing, name="collab_list"),

]
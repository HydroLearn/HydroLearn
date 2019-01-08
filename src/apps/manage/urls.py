from django.conf.urls import url
from src.apps.manage.views import (
        Index,
        module_listing,
        collab_listing,
        find_modules,
        module_success,
        manage_ModuleCreateView,
        manage_ModuleEditView,
        manage_ModuleDeleteView,

        manage_ModulePublishIndex,
        manage_ModulePublish,

        manage_ModuleCollaboration,

        manage_PublicationCloneIndex,
        manage_PublicationClone,

        # manage_ModuleContent,
        # manage_TopicContent,
        manage_LessonContent,
        manage_SectionContent,

        find_filter_form,
        find_listing,
)

from src.apps.manage.hydroshare.views import get_hs_res_list


# 'manage' app urls
app_name = 'manage'
urlpatterns = [
    
        # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),
        
        # module list view
        url(r'^$', Index.as_view(), name="manage_index"),

        # partial view paths
        url(r'^my_listing/$', module_listing, name="module_list"),
        url(r'^my_collabs/$', collab_listing, name="collab_list"),
        url(r'^find/$', find_modules, name="find_modules"),
        url(r'^success/$', module_success, name="success"),

        # Module Actions
        url(r'^delete/module/(?P<slug>[^/]+)$', manage_ModuleDeleteView.as_view(), name="module_delete"),
        url(r'^publication/(?P<slug>[^/]+)/$', manage_ModulePublishIndex.as_view(), name="module_publishindex"),
        url(r'^publish/(?P<slug>[^/]+)/$', manage_ModulePublish.as_view(), name="module_publish"),

        url(r'^collab/(?P<slug>[^/]+)/$', manage_ModuleCollaboration.as_view(), name="module_collaborate"),

        # create and edit functionality have been offloaded to the editor interface
        url(r'^create/module/$', manage_ModuleCreateView.as_view(), name="module_create"),
        url(r'^edit/module/(?P<slug>[^/]+)$', manage_ModuleEditView.as_view(), name="module_update"),







        url(r'^content/(?P<slug>[^/]+)/$', manage_LessonContent.as_view(), name="lesson_content"),
        url(r'^content/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', manage_SectionContent.as_view(), name="section_content"),


        # find modules urls
        url(r'^find_form/$', find_filter_form, name="find_filter_form"),
        url(r'^find_list/$', find_listing, name="found_listing"),
        url(r'^clone_publication/(?P<slug>[^/]+)/$', manage_PublicationCloneIndex.as_view(), name="publication_clone_index"),
        url(r'^clone/(?P<slug>[^/]+)/$', manage_PublicationClone.as_view(), name="publication_clone"),

        # Hydroshare Resource Listing URL
        url(r'^hsreslist/$', get_hs_res_list, name="get_hs_res_list"),


]
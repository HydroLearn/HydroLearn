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

        # manage_ModuleContent,
        # manage_TopicContent,
        manage_LessonContent,
        manage_SectionContent,

)

from src.apps.manage.hydroshare.views import get_hs_res_list


# 'manage' app urls
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

        # Hydroshare Resource Listing URL
        url(r'^hsreslist/$', get_hs_res_list, name="get_hs_res_list"),

]
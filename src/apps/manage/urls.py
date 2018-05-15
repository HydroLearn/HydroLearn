from django.conf.urls import url
from src.apps.manage.views import *


# 'manage' app urls
urlpatterns = [
    
        # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),
        
        # module list view
        url(r'^$', Index.as_view(), name="manage_index"),

        url(r'^my_listing/$', module_listing, name="module_list"),
        url(r'^success/$', module_success, name="success"),

        # PRE-NESTED TESTING URLS
        url(r'^create/module/$', manage_ModuleCreateView.as_view(), name="module_create"),
        url(r'^edit/module/(?P<slug>[^/]+)$', manage_ModuleEditView.as_view(), name="module_update"),
        url(r'^delete/module/(?P<slug>[^/]+)$', manage_ModuleDeleteView.as_view(), name="module_delete"),
        url(r'^share/module/(?P<slug>[^/]+)$', manage_ModuleShareView.as_view(), name="module_share"),



        url(r'^content/(?P<slug>[^/]+)/$', manage_ModuleContent.as_view(), name="module_content"),
        url(r'^content/(?P<module_slug>[^/]+)/(?P<slug>[^/]+)/$', manage_TopicContent.as_view(), name="topic_content"),
        url(r'^content/(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<slug>[^/]+)/$', manage_LessonContent.as_view(), name="lesson_content"),
        url(r'^content/(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', manage_SectionContent.as_view(), name="section_content"),

        # # module detail view
        #url(r'^(?P<slug>[^/]+)/$', manage_ModuleDetailView.as_view(), name="module_detail"),
        #url(r'^(?P<slug>[^/]+)/$', manage_ModuleEditView.as_view(), name="module_detail"),


        

        
        
        
        
    
]
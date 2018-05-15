from django.conf.urls import url


from src.apps.module.views import *

handler404 = 'src.module.views.handler404'

# 'module' app urls
urlpatterns = [
    
        # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),
        
        # module list view
        url(r'^$', module_ModuleListView.as_view(), name="module_list"),

        # content views
        #       loads 'intro/summary' placeholder content for module/topic/lesson and content portion of sections
        url(r'^content/(?P<slug>[^/]+)/$', module_ModuleIntro.as_view(), name="module_content"),
        url(r'^content/(?P<module_slug>[^/]+)/(?P<slug>[^/]+)/$', module_TopicIntro.as_view(), name="topic_content"),
        url(r'^content/(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<slug>[^/]+)/$', module_LessonIntro.as_view(),name="lesson_content"),
        url(r'^content/(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', module_SectionDetailView.as_view(), name="section_content"),

        # module detail view
        url(r'^ref/(?P<ref_id>[^/]+)/$', module_ModuleRefLookup, name="module_ref"),
        url(r'^(?P<slug>[^/]+)/$', module_ModuleDetailView.as_view(), name="module_detail"),


        # section detail view

        
        
        
        # ======================================== PARTIAL VIEW RETURNS ====================
        
        
        
        
        
    
]
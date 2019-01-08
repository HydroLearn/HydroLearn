from django.conf.urls import url


from src.apps.module.views import *

handler404 = 'src.module.views.handler404'

# 'module' app urls
app_name = 'module'
urlpatterns = [
    
        # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),
        

        # content views
        #       loads 'intro/summary' placeholder content for module/topic/lesson and content portion of sections
        url(r'^content/(?P<slug>[^/]+)/$', module_LessonIntro.as_view(),name="lesson_content"),
        url(r'^content/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', module_SectionDetailView.as_view(), name="section_content"),

        # module detail view
        url(r'^ref/(?P<ref_id>[^/]+)/$', module_ModuleRefLookup, name="module_ref"),
        url(r'^(?P<slug>[^/]+)/$', module_LessonDetailView.as_view(), name="lesson_detail"),


        # section detail view

        # ======================================== PARTIAL VIEW RETURNS ====================
        
        
        
        
        
    
]
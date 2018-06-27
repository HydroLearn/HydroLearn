from django.conf.urls import url


from src.apps.core.views.ModuleViews import *

# 'core' app urls
urlpatterns = [
    
    # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),


    # module views
    url(r'^$', core_ModuleListView.as_view(), name="module_list"),
    url(r'^(?P<slug>[^/]+)/$', core_ModuleDetailView.as_view(), name="module_detail"),

    # topic views
    url(r'^(?P<module_slug>[^/]+)/topics/$', core_TopicListView.as_view(), name="topic_list"),
    url(r'^(?P<module_slug>[^/]+)/(?P<slug>[^/]+)/$', core_TopicDetailView.as_view(), name="topic_detail"),

    # lesson views
    url(r'^(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/lessons/$', core_LessonListView.as_view(), name="lesson_list"),
    url(r'^(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<slug>[^/]+)/$', core_LessonDetailView.as_view(), name="lesson_detail"),

    # section views
    url(r'^(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<lesson_slug>[^/]+)/sections/$', core_SectionListView.as_view(), name="section_list"),
    url(r'^(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', core_SectionDetailView.as_view(), name="section_detail"),

    # Quiz question view
    url(r'^(?P<module_slug>[^/]+)/(?P<topic_slug>[^/]+)/(?P<lesson_slug>[^/]+)/(?P<quiz_slug>[^/]+)/(?P<pk>[^/]+)/$', core_QuizQuestionDetailView.as_view(), name="quiz_question_detail"),

    # ======================================== PARTIAL VIEW RETURNS ====================
        
        



        
    
]
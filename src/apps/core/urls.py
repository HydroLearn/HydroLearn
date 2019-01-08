from django.conf.urls import url


from src.apps.core.views.ModuleViews import *

# 'core' app urls
app_name = 'core'
urlpatterns = [
    
    # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),

    # lesson views
    url(r'^$', core_LessonListView.as_view(), name="lesson_list"),
    url(r'^(?P<slug>[^/]+)/$', core_LessonDetailView.as_view(), name="lesson_detail"),

    # section views
    url(r'^(?P<lesson_slug>[^/]+)/sections/$', core_SectionListView.as_view(), name="section_list"),
    url(r'^(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', core_SectionDetailView.as_view(), name="section_detail"),

    # Quiz question view
    url(r'^(?P<lesson_slug>[^/]+)/(?P<quiz_slug>[^/]+)/(?P<pk>[^/]+)/$', core_QuizQuestionDetailView.as_view(), name="quiz_question_detail"),

    # ======================================== PARTIAL VIEW RETURNS ====================
        
        



        
    
]
from django.conf.urls import url


from src.apps.editor.views import (
    submission_success,

    # editor_LessonIntro,
    # editor_SectionDetailView,

    # editor_LessonForm,
    # editor_SectionForm,
    # editor_CreateLesson,
    # editor_EditLesson,

    editor_LessonView,
    editor_NewLessonView,
    editor_LessonUpdateView,
    editor_SectionUpdateView,

    editor_LessonCreateView,
    editor_SectionCreateView,

    editor_LessonDeleteView,
    editor_SectionDeleteView,
)

handler404 = 'src.editor.views.handler404'

# 'editor' app urls
urlpatterns = [
    
    # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),
    url(r'^success/$', submission_success, name="success"),

    # form views

    # create new lesson
    url(r'^content/new_lesson/$', editor_LessonCreateView.as_view(), name="new_lesson"),


    #  edit lesson
    url(r'^content/(?P<slug>[^/]+)/$', editor_LessonUpdateView.as_view(),name="lesson_content"),

    # add child lesson
    url(r'^content/(?P<parent_lesson>[^/]+)/new_lesson/$', editor_LessonCreateView.as_view(), name="new_child_lesson"),

    # add child section
    url(r'^content/(?P<parent_lesson>[^/]+)/new_section/(?P<section_type>[^/]+)/$', editor_SectionCreateView.as_view(), name="new_section"),

    # edit section
    url(r'^content/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', editor_SectionUpdateView.as_view(), name="section_content"),

    # Deletion views
    url(r'^delete/(?P<slug>[^/]+)/$', editor_LessonDeleteView.as_view(), name="lesson_delete"),
    url(r'^delete/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', editor_SectionDeleteView.as_view(), name="section_delete"),

    # editor detail view

    # editor view for new lessons
    url(r'^new/$', editor_NewLessonView.as_view(), name="lesson_create"),

    # main editor view
    url(r'^(?P<slug>[^/]+)/$', editor_LessonView.as_view(), name="lesson_edit"),


    # section detail view

    # ======================================== PARTIAL VIEW RETURNS ====================
        
        
        
        
        
    
]
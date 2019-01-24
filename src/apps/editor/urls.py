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

    editor_LessonCreateView,
    editor_LessonUpdateView,
    editor_LessonDeleteView,

    editor_LessonExportView,
    editor_LessonImportView,

    editor_SectionCreateView,
    editor_SectionUpdateView,
    editor_SectionDeleteView,


    editor_AppRefCreateView,
    editor_AppRefUpdateView,
    editor_AppRefDeleteView,
)

handler404 = 'src.editor.views.handler404'

# 'editor' app urls
app_name = 'editor'
urlpatterns = [
    
    # url(r'^tag/(?P<slug>[-\w]+)/$', TagIndexView.as_view(), name='tagged'),
    url(r'^success/$', submission_success, name="success"),

    # form views

    # create new lesson
    url(r'^content/new_lesson/$', editor_LessonCreateView.as_view(), name="new_lesson"),


    #  edit lesson
    url(r'^content/(?P<slug>[^/]+)/$', editor_LessonUpdateView.as_view(),name="lesson_content"),

    # add child lesson/section
    url(r'^content/(?P<parent_lesson>[^/]+)/new_lesson/$', editor_LessonCreateView.as_view(), name="new_child_lesson"),
    url(r'^content/(?P<parent_lesson>[^/]+)/new_section/(?P<section_type>[^/]+)/$', editor_SectionCreateView.as_view(), name="new_section"),

    # edit section
    url(r'^content/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', editor_SectionUpdateView.as_view(), name="section_content"),

    # Deletion views
    url(r'^delete/(?P<slug>[^/]+)/$', editor_LessonDeleteView.as_view(), name="lesson_delete"),
    url(r'^delete/(?P<lesson_slug>[^/]+)/(?P<slug>[^/]+)/$', editor_SectionDeleteView.as_view(), name="section_delete"),

    url(r'^app/add/(?P<parent_lesson>[^/]+)/$', editor_AppRefCreateView.as_view(), name="app_ref_create"),
    url(r'^app/edit/(?P<parent_lesson>[^/]+)/(?P<pk>[^/]+)/$', editor_AppRefUpdateView.as_view(), name="app_ref_edit"),
    url(r'^app/delete/(?P<parent_lesson>[^/]+)/(?P<pk>[^/]+)/$', editor_AppRefDeleteView.as_view(), name="app_ref_delete"),

    # editor view for new lessons
    url(r'^new/$', editor_NewLessonView.as_view(), name="lesson_create"),

    # import/export
    url(r'^export/(?P<slug>[^/]+)/$', editor_LessonExportView.as_view(), name="lesson_export"),
    url(r'^import/(?P<slug>[^/]+)/$', editor_LessonImportView.as_view(), name="lesson_import"),


    # main editor view
    url(r'^(?P<slug>[^/]+)/$', editor_LessonView.as_view(), name="lesson_edit"),




    # ======================================== PARTIAL VIEW RETURNS ====================
        
        
        
        
        
    
]
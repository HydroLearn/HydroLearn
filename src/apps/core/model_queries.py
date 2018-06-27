#
#   This file is generated to have helpful methods for grabbing querysets against the module
#   models
#           TODO: This should be converted into Model Managers for the given objects
#           and attached to the appropriate modles
#
from django.urls import reverse

from src.apps.core.models.ModuleModels import (
    Module,Topic,Lesson,Section
)
import json

# for checking the content type of queried objects
#   (used for determining the type of polymorphic children)
from django.contrib.contenttypes.models import ContentType

def get_all_modules():
    return Module.objects.all()

def get_my_modules(user):
    # if a superuser get all of the modules
    if user.is_superuser:        
        return get_all_modules()
    else:
        # otherwise only grab models created by this user (expand to check for shared)
        my_modules = Module.objects.filter(created_by=user)    
        return my_modules

def get_all_topics():
    return Topic.objects.all()

#get the child topics of a specified model (determined by it's slug)
def get_child_topics(module_slug):
    child_topics = Topic.objects.filter(module__slug=module_slug)
    return child_topics

def get_all_lessons():
    return Lesson.objects.all()

def get_child_lessons(topic_slug):
    child_lessons = Lesson.objects.filter(topic__slug=topic_slug)
    return child_lessons

def get_all_sections():
    return Section.objects.all()

def get_child_sections(lesson_slug):
    child_sections = Section.objects.filter(lesson__slug=lesson_slug)
    return child_sections

# def get_module_layers(module_slug):
#     layers = LayerRef.objects.filter(module__slug=module_slug)
#     return layers

def get_module_TOC_obj(module_slug):
    
    module = Module.objects.get(slug=module_slug)

    if not module:
        return {
                'module_name': 'Not Found!',
            }

    topic_objs = get_child_topics(module_slug)
    topics = [{'title': topic.name,
               'short_title': topic.short_name,
               'slug': topic.slug,
               'slug_trail': topic.slug,
               'intro_url': reverse('modules:topic_content', kwargs={
                                'module_slug': topic.module.slug,
                                'slug': topic.slug,
                            }),

        } for topic in topic_objs]
        
    for topic in topics:

        lesson_objs = get_child_lessons(topic['slug'])
        topic['child_lessons'] = [{
            'title': lesson.name,
            'short_title': lesson.short_name,
            'slug': lesson.slug,
            'slug_trail': "%s/%s" % (topic['slug_trail'], lesson.slug),
            'intro_url': reverse('modules:lesson_content', kwargs={
                            'module_slug': lesson.topic.module.slug,
                            'topic_slug': lesson.topic.slug,
                            'slug': lesson.slug,
                        }),

        } for lesson in lesson_objs]

        for lesson in topic['child_lessons']:

            section_objs = get_child_sections(lesson['slug'])


            lesson['child_sections'] = [{
                'title': section.name,
                'short_title': section.short_name,
                'sectionType': str(ContentType.objects.get_for_id(section.polymorphic_ctype_id)),
                'slug': section.slug,
                'slug_trail': "%s/%s" % (lesson['slug_trail'], section.slug),

                'href': reverse('modules:section_content', kwargs={
                                'module_slug': section.lesson.topic.module.slug,
                                'topic_slug': section.lesson.topic.slug,
                                'lesson_slug': section.lesson.slug,
                                'slug': section.slug,
                            }),

            } for section in section_objs]
        
        
    
    return_obj = {
        'module_name': module.name,
        'slug': module.slug,
        'content_url': reverse('modules:module_content', kwargs={'slug': module.slug,}),

        'topics': topics
    }
    

    
        
    return json.dumps(return_obj)
    
    
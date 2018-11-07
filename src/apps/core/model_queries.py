#
#   This file is generated to have helpful methods for grabbing querysets against the module
#   models
#           TODO: This should be converted into Model Managers for the given objects
#           and attached to the appropriate modles
#
from django.urls import reverse

from src.apps.core.models.ModuleModels import (
    # Module,
    # Topic,
    Lesson,
    Section
)
import json

# for checking the content type of queried objects
#   (used for determining the type of polymorphic children)
from django.contrib.contenttypes.models import ContentType


def get_all_lessons():
    return Lesson.objects.all()

def get_child_lessons(lesson_slug):
    child_lessons = Lesson.objects.filter(parent_lesson__slug=lesson_slug)
    return child_lessons

def get_my_lessons(user):
    # if a superuser get all of the modules
    if user.is_superuser:
        return Lesson.objects.all()
    else:
        # otherwise only grab models created by this user (expand to check for shared)
        my_lessons = Lesson.objects.filter(created_by=user)
        return my_lessons

def get_all_sections():
    return Section.objects.all()

def get_child_sections(lesson_slug):
    child_sections = Section.objects.filter(lesson__slug=lesson_slug)
    return child_sections

# def get_module_layers(lesson_slug):
#     layers = LayerRef.objects.filter(lesson__slug=lesson_slug)
#     return layers

def get_lesson_JSON_RAW(lesson_slug):
    '''
        generate a Lesson JSON representation containing children

    :param lesson_slug: slug for a lesson
    :return: a json object with various needed information for referencing a lesson in
            the module interface.
    '''

    # if no slug provided return the 'new_lesson' representation
    if not lesson_slug: return {
        'obj_type': 'lesson',
        'slug': "",
        'name': "New Lesson",
        'short_name': "New Lesson",
        'position': 0,
        'content_url': "",
        'children': [],
    }

    lesson = Lesson.objects.get(slug=lesson_slug)

    if not lesson: return None

    # TODO: verify that having filter object in list constructors does not trigger
    #       multiple queryset hits
    sub_lessons = [get_lesson_JSON_RAW(l.slug) for l in lesson.sub_lessons.all()]
    sections = [get_section_JSON_RAW(s.slug) for s in lesson.sections.all()]

    # sub_lessons.sort(key=lambda x: x['position'])
    # sections.sort(key=lambda x: x['position'])
    children = sections + sub_lessons
    children.sort(key=lambda x: x['position'])

    return {
        'obj_type': 'lesson',
        'slug': lesson.slug,
        'name': lesson.name,
        'short_name': lesson.short_name,
        'position': lesson.position,
        'content_url': reverse('modules:lesson_content', kwargs={'slug': lesson.slug,}),
        'children': children,
    }

def get_section_JSON_RAW(section_slug):
    '''
    generate a Lesson JSON representation containing children

    :param section_slug: slug for a lesson
    :return: a json object with various needed information for referencing a lesson in
            the module interface.


    '''

    section = Section.objects.get(slug=section_slug)

    if not Section: return None

    return {
        'obj_type': 'section',
        'slug': section.slug,
        'slug_trail': "%s/%s" % (section.lesson.slug, section.slug),
        'name': section.name,
        'short_name': section.short_name,
        'position': section.position,
        'sectionType': str(ContentType.objects.get_for_id(section.polymorphic_ctype_id)),
        'content_url': reverse('modules:section_content', kwargs={'lesson_slug': section.lesson.slug, 'slug': section.slug,}),

    }

def get_module_TOC_obj(lesson_slug):
    '''
    return a json representation for a lesson identified by the passed lesson_slug

    :param lesson_slug: slug for a lesson
    :return: a json string representation of the lesson structure to be passed to a view.
    '''
    return_obj = get_lesson_JSON_RAW(lesson_slug)

    return json.dumps(return_obj)
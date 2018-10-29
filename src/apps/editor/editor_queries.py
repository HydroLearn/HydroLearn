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
        'instance': False,
        'depth': 0,
        'slug': "new_lesson",
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

    def add_parent_slug(o, parent_slug):
        o['parent_slug'] = parent_slug
        return o

    # mark parent for each sub_lesson/section
    sub_lessons = [add_parent_slug(l, lesson_slug) for l in sub_lessons]
    sections = [add_parent_slug(s, lesson_slug) for s in sections]

    #sub_lessons.sort(key=lambda x: x['position'])
    #sections.sort(key=lambda x: x['position'])
    children = sections + sub_lessons
    children.sort(key=lambda x: x['position'])

    return {
        'obj_type': 'lesson',
        'is_instanced': True,
        'depth': lesson.depth,
        'slug': lesson.slug,
        'name': lesson.name,
        'short_name': lesson.short_name,
        'position': lesson.position,
        'content_url': reverse('editor:lesson_content', kwargs={'slug': lesson.slug,}),
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
        'is_instanced': True,
        'slug': "%s/%s" % (section.lesson.slug, section.slug),
        'slug_trail': "%s/%s" % (section.lesson.slug, section.slug),
        'name': section.name,
        'short_name': section.short_name,
        'position': section.position,
        'sectionType': str(ContentType.objects.get_for_id(section.polymorphic_ctype_id)),
        'content_url': reverse('editor:section_content', kwargs={'lesson_slug': section.lesson.slug, 'slug': section.slug,}),

    }

def get_editor_TOC_obj(lesson_slug):
    '''
    return a json representation for a lesson identified by the passed lesson_slug

    :param lesson_slug: slug for a lesson
    :return: a json string representation of the lesson structure to be passed to a view.
    '''
    return_obj = get_lesson_JSON_RAW(lesson_slug)

    # potentially modify this to return a parent object specifying editor/creation urls
    # with a child 'lessons' object that contains it's listing

    return json.dumps(return_obj)
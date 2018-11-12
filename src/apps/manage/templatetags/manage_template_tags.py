from django import template
from src.apps.manage.forms import (
    inlineLessonFormset,
    inlineSectionFormset
)
register = template.Library()

@register.inclusion_tag('manage/partials/_module_list_tag_template.html', takes_context=True)
def list_my_modules(context):
    '''
        displays the modules created by the current user

    :param context: the context of the current page
    :return: templated listing of all modules created by the user specified in view context
    '''
    my_lessons = context['user'].created_lessons.filter(depth=0).drafts().order_by('-changed_date')
    return {
        'my_modules': my_lessons,
    }

@register.inclusion_tag('manage/partials/_collab_list_tag_template.html', takes_context=True)
def list_my_collaborations(context):
    '''
        displays the modules created by the current user

    :param context: the context of the current page
    :return: templated listing of all modules created by the user specified in view context
    '''
    shared_modules = context['user'].collaborations.all()
    return {
        'shared_modules': shared_modules,
    }

# not sure how to handle this yet...
#@register.inclusion_tag('manage/forms/module_form.html')
# def display_module_form(module):
#     module_form = module
#     return {
#         module_form:
#     }

@register.inclusion_tag('manage/partials/_lesson_form.html')
#def show_lesson_form(form, sections, sub_lessons):
def show_lesson_form(form,  sections_fs=None, sub_lessons_fs=None):
    stop_here = None
    return {
        'form': form,
        # 'parent_prefix': parent_prefix,
        'sections': sections_fs,
        'sub_lessons': sub_lessons_fs,
    }

@register.inclusion_tag('manage/partials/_section_form.html')
def show_section_form(form):
    stop_here = None
    return {
        'form': form,
        # 'parent_prefix': parent_prefix,
    }

@register.inclusion_tag('manage/partials/_lesson_formset.html')
#def show_lesson_formset(parent_form, formset):
def show_lesson_formset(formset_type, formset):
    #lesson_fs = inlineLessonFormset()
    return {
        'formset': formset,
        'formset_type': formset_type,
        #'base_prefix': lesson_fs.prefix,
        # 'parent_prefix': parent_prefix,
    }



@register.inclusion_tag('manage/partials/_section_formset.html')
#def show_section_formset(parent_form, formset):
def show_section_formset(formset_type, formset):
    #section_fs = inlineSectionFormset()
    return {
        'formset': formset,
        'formset_type': formset_type,
        #'base_prefix': section_fs.prefix,
        # 'parent_prefix': parent_prefix,
    }

@register.inclusion_tag('manage/partials/_lesson_repr.html')
def show_lesson_representation(lesson):
    return {
        'lesson':lesson,
    }

@register.inclusion_tag('manage/partials/_section_repr.html')
def show_section_representation(section):
    return {
        'section': section,
    }
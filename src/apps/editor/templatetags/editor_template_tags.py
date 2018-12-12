from django import template
from django.conf import settings

register = template.Library()

# @register.inclusion_tag('editor/tag_templates/_map_container.html', takes_context=True)
# def map_container(context):
#     sezikai_ctx_var = getattr(settings, 'SEKIZAI_VARNAME', 'SEKIZAI_CONTENT_HOLDER')
#     layers = None
#
#     return {
#         'layers': layers,
#         sezikai_ctx_var: context[sezikai_ctx_var],
#     }

# @register.inclusion_tag('editor/forms/_editor_formset_init.html')
# def initalize_editor_formsets(sections_fs, sub_lessons_fs):
#     return {
#         'sections': sections_fs,
#         'sub_lessons': sub_lessons_fs,
#     }
#
#
# @register.inclusion_tag('editor/forms/_lesson_form.html')
# def show_lesson_form(form,  sections_fs=None, sub_lessons_fs=None):
#     stop = True
#     return {
#         'form': form,
#         'sections': sections_fs,
#         'sub_lessons': sub_lessons_fs,
#     }
#
# @register.inclusion_tag('editor/forms/_section_form.html')
# def show_section_form(form):
#     return {
#         'form': form,
#     }

@register.inclusion_tag('editor/forms/_resource_formset.html')
def show_resource_formset(formset):
    return {
        'formset': formset,
    }

@register.inclusion_tag('editor/forms/_resource_form.html')
def show_resource_form(form, can_delete=False):
    return {
        'form': form,
        'can_delete': can_delete,
    }

from django import template
from django.conf import settings
from src.apps.editor.forms import editor_AppRefForm

register = template.Library()

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

@register.inclusion_tag('editor/forms/_quiz_question_formset.html')
def show_quiz_question_formset(formset):
    return {
        'formset': formset,
    }

@register.inclusion_tag('editor/forms/_quiz_question_form.html')
def show_quiz_question_form(form, can_delete=False):
    return {
        'form': form,
        'can_delete': can_delete,
    }

@register.inclusion_tag('editor/forms/_quiz_answer_formset.html')
def show_quiz_answer_formset(formset):
    return {
        'formset': formset,
    }

@register.inclusion_tag('editor/forms/_quiz_answer_form.html')
def show_quiz_answer_form(form, can_delete=False):
    return {
        'form': form,
        'can_delete': can_delete,
    }

@register.inclusion_tag('editor/forms/_quiz_simulated_formset.html')
def show_answer_form_list(empty_answer_form, can_delete=False):
    return {
        'form': empty_answer_form,
        'can_delete': can_delete,
    }


@register.inclusion_tag('editor/tag_templates/_app_ref_editor.html')
def show_app_ref_editor(container_id, app_ref, parent_lesson):
    return {
        'id': container_id,
        'app': app_ref,
        'parent_lesson': parent_lesson
    }


@register.inclusion_tag('editor/forms/_app_ref_form.html')
def show_app_ref_form(parent_lesson, app=None):

    if app:
        form = editor_AppRefForm(initial={'app_name': app.app_name, 'app_link': app.app_link})
    else:
        form = editor_AppRefForm

    return {
        'app': app,
        'form': form,
        'parent_lesson': parent_lesson,
    }

@register.inclusion_tag('editor/forms/_learning_obj_formset.html')
def show_learningObj_formset(formset):
    return {
        'formset':formset,
    }

@register.inclusion_tag('editor/forms/_learning_obj_form.html')
def show_learningObj_form(form, can_delete=False):
    return {
        'form': form,
        'can_delete': can_delete,
    }
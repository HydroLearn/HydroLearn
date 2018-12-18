from django import template
from django.conf import settings

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
    return{
        'form': empty_answer_form,
        'can_delete': can_delete,
    }


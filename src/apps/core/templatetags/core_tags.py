from django import template
register = template.Library()


@register.filter
def verbose_name(obj):
    return obj._meta.verbose_name

@register.filter
def verbose_name_plural(obj):
    return obj._meta.verbose_name_plural

@register.filter
def form_model_verbose_name(form):
    return form._meta.model._meta.verbose_name


from django import template

register = template.Library()


@register.filter
def provider_filter(queryset_obj, provider):
    return queryset_obj.filter(provider=provider).first()
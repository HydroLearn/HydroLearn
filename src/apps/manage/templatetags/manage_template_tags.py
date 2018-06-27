from django import template

register = template.Library()

@register.inclusion_tag('manage/partials/_module_list_tag_template.html', takes_context=True)
def list_my_modules(context):
    '''
        displays the modules created by the current user

    :param context: the context of the current page
    :return: templated listing of all modules created by the user specified in view context
    '''
    my_modules = context['user'].created_modules.drafts().order_by('-changed_date')
    shared_modules = None
    return {
        'my_modules': my_modules,
        'shared_modules': shared_modules,
    }

# not sure how to handle this yet...
#@register.inclusion_tag('manage/forms/module_form.html')
# def display_module_form(module):
#     module_form = module
#     return {
#         module_form:
#     }
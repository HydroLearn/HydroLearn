from django import template
from django.conf import settings

register = template.Library()

@register.inclusion_tag('module/tag_templates/_pubstatus_banner.html')
def publication_status_banner(publication):
    '''
        renders the publication banner for the passed publication
        providing status of publication and links to draft/publish copies

    :param publication: a publication object (Module)
    :return: templated listing of all modules created by the user specified in view context
    '''

    draft_copy = publication.is_draft
    is_dirty = publication.is_dirty

    banner_class = {
        'draft_only': "draft_only",
        'draft_published': {
                True: "draft_dirty",
                False: "draft_clean",
            }.get(is_dirty,""),
        'current_publication': 'published_current',
        'past_publication': 'published_past',

    }.get(publication.publish_status, "")



    if draft_copy:
        if publication.get_public_object():
            link_url = publication.get_public_object().viewer_url()
        else:
            link_url = None
    else:
        link_url = publication.get_draft_object().viewer_url()

    return {
        'draft_copy': draft_copy,
        'is_dirty': is_dirty,
        'link_url': link_url,
        'banner_class': banner_class,

        'publish_status_display': publication.get_publish_status_display,
    }

@register.inclusion_tag('module/tag_templates/_section_edit_toolbar.html')
def content_editor_button(user, editable_obj):

    edit_link = None

    if editable_obj.has_draft_access(user) and editable_obj.is_draft:
        edit_link = editable_obj.manage_url()

    return {
        'edit_link': edit_link,
    }


@register.inclusion_tag('module/tag_templates/_map_container.html', takes_context=True)
def map_container(context):
    sezikai_ctx_var = getattr(settings, 'SEKIZAI_VARNAME', 'SEKIZAI_CONTENT_HOLDER')
    layers = None

    return {
        'layers': layers,
        sezikai_ctx_var: context[sezikai_ctx_var],
    }
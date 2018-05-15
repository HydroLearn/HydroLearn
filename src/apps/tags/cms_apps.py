from cms.app_base import CMSApp
from cms.apphook_pool import apphook_pool
from django.utils.translation import ugettext_lazy as _

@apphook_pool.register
class TagsApp(CMSApp):
    name = _('Tags')
    app_name = 'tags' # this is the app namespace

    def get_urls(self, page=None, language=None, **kwargs):
        return ["src.apps.tags.urls"]
    


from cms.app_base import CMSApp
from cms.apphook_pool import apphook_pool
from django.utils.translation import ugettext_lazy as _

@apphook_pool.register
class EditorApp(CMSApp):
    name = _('Editor')
    app_name = 'editor' # this is the app namespace
    
    def get_urls(self, page=None, language=None, **kwargs):
        return ["src.apps.editor.urls"]


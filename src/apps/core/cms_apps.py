from cms.app_base import CMSApp
from cms.apphook_pool import apphook_pool
from django.utils.translation import ugettext_lazy as _

@apphook_pool.register
class CoreApp(CMSApp):
    name = _('Core')
    app_name = 'core' # this is the app namespace

    def get_urls(self, page=None, language=None, **kwargs):
        return ["src.apps.core.urls"]

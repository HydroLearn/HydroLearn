from cms.plugin_pool import plugin_pool


# import content plugin definitions
#from src.apps.Content_Plugins.HS_ResourceLink.cms_plugins import HS_ResourceLink_plugin
# from src.apps.Content_Plugins.HS_ResourceLink.forms import HS_ResourceLink_AdminForm

from django.conf import settings
from cms.plugin_base import CMSPluginBase
#from src.apps.Content_Plugins.HS_ResourceLink.models import HS_ResourceLink_model
from src.apps.Content_Plugins.models.HS_ResourceLink import HS_ResourceLink_model

class HS_ResourceLink_plugin(CMSPluginBase):
    # form = HS_ResourceLink_AdminForm
    name = "HydroShare Resource Link"
    model = HS_ResourceLink_model
    render_template = "HS_ResourceLink/_HS_Resource_Link_plugin.html"
    text_enabled = True

    def render(self, context, instance, placeholder):

        # pass the plugin instance with the template context
        context['object'] = instance

        return context

    def icon_src(self, instance):
        return settings.STATIC_URL + 'HS_ResourceLink/images/HS_Resource_icon.png'

    def icon_alt(self, instance):
        return 'HS Resource: %s' % instance



# register content plugins to app pool
plugin_pool.register_plugin(HS_ResourceLink_plugin)




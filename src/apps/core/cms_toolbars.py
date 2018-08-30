from cms.toolbar_pool import toolbar_pool
from cms.cms_toolbars import PlaceholderToolbar


toolbar_pool.unregister(PlaceholderToolbar)

@toolbar_pool.register
class PlaceholderToolbarNoWizard(PlaceholderToolbar):
    def add_wizard_button(self):
        pass
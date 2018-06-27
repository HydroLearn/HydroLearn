from django.utils.translation import ugettext as _

from cms.wizards.wizard_pool import wizard_pool
from cms.wizards.wizard_base import Wizard

from src.apps.core.forms import CreateNewModule_WizardForm, CreateNewTopic_WizardForm, CreateNewSection_WizardForm
from src.apps.core.models.ModuleModels import Module

#from pprint import pprint

class ModuleWizard(Wizard):
    def get_title(self, **kwargs):
        return super(ModuleWizard, self).get_title(**kwargs)
    
    def get_success_url(self, obj, **kwargs):
        """
            this method expects to return a string.
            
            upon adding a module to the system it is expected to be redirected to the
            edit view for the new module. or possibly the module itself.
            
            but regardless being that the model is housed in the 'core' app and not the modules app,
            this is bound to require some custom redirecting here.
            
            the default implementation looks at the 'absolute_url' of the 'obj' and returns it
            with '?edit' at the end.
            (i was getting errors when i tried this, so change it)
            
            potentially just define some new model methods to return 'edit view' 'preview view' etc
        """
        
        """ sample of the following print's output (reference)
            {
                '_state': <django.db.models.base.ModelState object at 0x04B55DD0>,
                '_uncommitted_filefields': [],
                'creation_date': datetime.datetime(2017, 11, 30, 22, 17, 56, 210888, tzinfo=<UTC>),
                'id': 6,
                'name': 'wizard 2',
                'slug': 'wizard-2',
                'changed_date': datetime.datetime(2017, 11, 30, 22, 17, 56, 210888, tzinfo=<UTC>)
            }
           so if anything this may be useful for grabbing the slug for generating the new success url
           
        """
        #pprint(obj.__dict__)
        
        """ sample of the following print output
        {'language': 'en'}
        """
        #pprint(kwargs)
        
        return super(ModuleWizard, self).get_success_url(obj, **kwargs)
    
    def user_has_add_permission(self, user, **kwargs):
        
        """ this can potentially add additional restrictions to what users can add a module and where.
            (doing the 'super' method below will restrict to only users defined
            in the backend with module__add permissions)
            
            that might be good enough
            
            
            supposedly this method has access to a 'page' attribute which
            will allow us to determine if the 'current page' is valid for showing this wizard.
            
        """
        return super(ModuleWizard, self).user_has_add_permission(user, **kwargs)
    
    
class TopicWizard(Wizard):
    def get_title(self, **kwargs):
        return super(TopicWizard, self).get_title(**kwargs)
    
    def get_success_url(self, obj, **kwargs):
        return super(TopicWizard, self).get_success_url(obj, **kwargs)
    
    def user_has_add_permission(self, user, **kwargs):
        return super(TopicWizard, self).user_has_add_permission(user, **kwargs)
 
class SectionWizard(Wizard):
    def get_title(self, **kwargs):
        return super(SectionWizard, self).get_title(**kwargs)
    
    def get_success_url(self, obj, **kwargs):
        return super(SectionWizard, self).get_success_url(obj, **kwargs)
    
    def user_has_add_permission(self, user, **kwargs):
        return super(SectionWizard, self).user_has_add_permission(user, **kwargs)
 
 
#module_wizard = Wizard(
module_wizard = ModuleWizard(
    title = ('New Module'),
    weight = 300,
    form = CreateNewModule_WizardForm,
    #model = Module,
    
    
    description = _('Create a new Module. (REPLACE WITH MANAGE INTERFACE METHODS FOR MODULE CREATION)'),
    
    # prevents forcing of edit mode on success, most likely will not be changing this setting
    # edit_mode_on_success = False, 
)

topic_wizard = TopicWizard(
    title = ('New Topic'),
    weight = 300,
    form = CreateNewTopic_WizardForm,
    #model = Module,
    
    
    description = _('Create a new Topic under this module.'),
    
    # prevents forcing of edit mode on success, most likely will not be changing this setting
    # edit_mode_on_success = False, 
)

section_wizard = SectionWizard(
    title = ('New Section'),
    weight = 300,
    form = CreateNewSection_WizardForm,
    #model = Module,
    
    
    description = _('Create a new Section under this module.'),
    
    # prevents forcing of edit mode on success, most likely will not be changing this setting
    # edit_mode_on_success = False, 
)



#wizard_pool.register(module_wizard)

# these may not be possible... as far as i can tell currently
#wizard_pool.register(topic_wizard)
#wizard_pool.register(section_wizard)
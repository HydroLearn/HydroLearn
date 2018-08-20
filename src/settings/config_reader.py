import os
import json
from django.core.exceptions import ImproperlyConfigured

# load secret config values
#       the expected result of the Environment variable 'HYDROLEARN_CONF'
#       is a JSON file containing sensitive information such as the following
#           - Django secret Key
#           - email user/password
#           - database name/host/user/pass
#           - any authentication backend keys
#
#       this config file can be expanded to contain additional
#       values to be loaded by the below defined 'get_config_setting' method
#       just define another value in the dictionary contained within the config file
#
#       values are retrieved by calling:
#           get_config_setting("[SETTING_NAME]")
#
with open(os.environ.get('HYDROLEARN_CONF')) as f:
    configs = json.loads(f.read())


# method to retrieve config values from external config file
def get_config_setting(setting, configs=configs):
    try:
        val = configs[setting]
        if val == 'True':
            val = True
        elif val == 'False':
            val = False
        return val
    except KeyError:
        error_msg = "ImproperlyConfigured: Set {0} environment variable".format(setting)
        raise ImproperlyConfigured(error_msg)
# import the configuration reader module's get method
from src.settings.config_reader import get_config_setting

# ************************SECURITY SETTINGS************************************


'''
    Prod settings
'''

# will need to be updated with domain
ALLOWED_HOSTS = ['HydroLearn.org', '.hydrolearn.org', 'localhost', '127.0.0.1', '[::1]', '0.0.0.0', '132.148.83.239']


# need to set up environment variable for this value
# (either in virtualenv or on host machine)
SECRET_KEY = get_config_setting("SECRET_KEY")

#
# ADMINS = (
#     ('You', 'you@email.com'),
# )
# MANAGERS = ADMINS

# cant deny this, django cms loads forms in frames
# X_FRAME_OPTIONS = 'DENY'

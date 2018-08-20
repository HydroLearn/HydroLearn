from src.settings.config_reader import get_config_setting

#get secret key
SECRET_KEY = get_config_setting("SECRET_KEY")


# ************************SECURITY SETTINGS************************************
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

'''
    Dev settings
'''
#SECRET_KEY = 's(fwbwrr##yn8r_cyjst5i^pjft^_5-%47m@^18xc@h+mz9f+^'

ALLOWED_HOSTS = ['HydroLearn.org', 'localhost', '127.0.0.1', '[::1]']
CSRF_COOKIE_SECURE = False

# used for django_extensions' pydot rendering of DB schema
GRAPH_MODELS = {
    'all_applications': True,
    'group_models': True,
}



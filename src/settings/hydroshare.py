from src.settings.config_reader import get_config_setting
'''
    Hydroshare Settings
'''

SOCIAL_AUTH_HYDROSHARE_KEY = get_config_setting("HS_KEY")
SOCIAL_AUTH_HYDROSHARE_SECRET = get_config_setting("HS_KEY")


SOCIAL_AUTH_ADMIN_USER_SEARCH_FIELDS = ['email']
SOCIAL_AUTH_SLUGIFY_USERNAMES = True
SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/manage/'
SOCIAL_AUTH_LOGIN_ERROR_URL = '/accounts/login/'

AUTHENTICATION_BACKENDS = (
    'accounts.oauth.hydroshare.HydroShareOAuth2',
    'django.contrib.auth.backends.ModelBackend',
)
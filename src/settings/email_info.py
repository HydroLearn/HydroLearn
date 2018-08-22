from src.settings.config_reader import get_config_setting

# currently setup with gmail, need to revise this to use Office356 from prod
EMAIL_USE_TLS = get_config_setting('EMAIL_USE_TLS')
EMAIL_HOST = get_config_setting('EMAIL_HOST')
EMAIL_PORT = get_config_setting('EMAIL_PORT')
EMAIL_HOST_USER = get_config_setting('EMAIL_USER')
EMAIL_HOST_PASSWORD = get_config_setting('EMAIL_PASS')
DEFAULT_FROM_EMAIL = get_config_setting('EMAIL_DEFAULT_FROM')



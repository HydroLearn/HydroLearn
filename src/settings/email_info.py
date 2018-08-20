from src.settings.config_reader import get_config_setting

# currently setup with gmail, need to revise this to use Office356 from prod
EMAIL_USE_TLS = True
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_USER = get_config_setting('EMAIL_USER')
EMAIL_HOST_PASSWORD = get_config_setting('EMAIL_PASS')
EMAIL_PORT = 587
DEFAULT_FROM_EMAIL = 'HydroLearn <accounts.no-reply@hydrolearn.org>'


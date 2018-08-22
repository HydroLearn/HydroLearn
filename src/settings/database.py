from src.settings.config_reader import get_config_setting

# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 0,
        'ENGINE': get_config_setting('DB_ENGINE'),
        'PORT': get_config_setting('DB_PORT'),
        'HOST': get_config_setting("DB_HOST"),
        'NAME': get_config_setting("DB_NAME"),
        'USER': get_config_setting('DB_USER'),
        'PASSWORD': get_config_setting('DB_PASS'),

    }


}
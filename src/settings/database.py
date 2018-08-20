from src.settings.config_reader import get_config_setting

# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 0,
        'ENGINE': 'django.db.backends.sqlite3',
        'HOST': get_config_setting('DB_HOST'),
        'NAME': get_config_setting('DB_NAME'),
        'USER': get_config_setting('DB_USER'),
        'PASSWORD': get_config_setting('DB_PASS'),
        'PORT': '',

    }

    # sample postgres setup ( to be used later
    # 'default': {
    #     'ENGINE': 'django.db.backends.postgresql',
    #     'NAME': 'mydatabase',
    #     'USER': 'mydatabaseuser',
    #     'PASSWORD': 'mypassword',
    #     'HOST': '127.0.0.1',
    #     'PORT': '5432',
    # }
}
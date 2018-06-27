import os

print("// Loading Production Settings")

# ************************SECURITY SETTINGS************************************
DEBUG = False
# DEBUG = bool(os.environ.get('DJANGO_DEBUG'))

'''
    Prod settings
'''

# need to set up environment variable for this value (either in virtualenv or on host machine)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# will need to be updated with domain
ALLOWED_HOSTS = ['example.com', 'HydroLearn.org', 'localhost', '127.0.0.1', '[::1]', '0.0.0.0', '18.188.44.162']

# cant deny this, django cms loads forms in frames
# X_FRAME_OPTIONS = 'DENY'

'''
    suggested production settings
        -though use of middleware states the following

        ?: (security.W001) You do not have 'django.middleware.security.SecurityMiddleware' 
            in your MIDDLEWARE_CLASSES so the 
                SECURE_HSTS_SECONDS, 
                SECURE_CONTENT_TYPE_NOSNIFF, 
                SECURE_BROWSER_XSS_FILTER, 
                and SECURE_SSL_REDIRECT settings will have no effect.

'''

# CORS_REPLACE_HTTPS_REFERER = True
# HOST_SCHEME = 'https://'
# SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_SECONDS = True
# SECURE_FRAME_DENY = True

# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 0,
        'ENGINE': 'django.db.backends.sqlite3',
        'HOST': 'localhost',
        'NAME': '/home/ubuntu/source/HydroLearn/project.db',
        'PASSWORD': '',
        'PORT': '',
        'USER': ''
    }
}

# Mail is sent using the SMTP host and port specified in the
# EMAIL_HOST and EMAIL_PORT settings.

# The EMAIL_HOST_USER and EMAIL_HOST_PASSWORD settings,
# if set, are used to authenticate to the
# SMTP server, and the EMAIL_USE_TLS and EMAIL_USE_SSL settings control
# whether a secure connection is used.

'''
    SAMPLE EMAIL SETTINGS
'''
# EMAIL_HOST = ''
# EMAIL_HOST_USER = 'user@gmail.com'

# should technically use an environment var for this, os.environ.get('EMAIL_PASSWORD')
# EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_PASSWORD')

# EMAIL_PORT = #[portnumber]
# EMAIL_USE_TLS = True
# DEFAULT_FROM_EMAIL = 'Your Name <you@email.com>'
#
# ADMINS = (
#     ('You', 'you@email.com'),
# )
# MANAGERS = ADMINS
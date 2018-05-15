"""
WSGI config for src project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.8/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Set environment variables for testing production instance of site
#os.environ["DJANGO_DEBUG"] = ""
#os.environ["DJANGO_SECRET_KEY"] = "s(fwbwrr##yn8r_cyjst5i^pjft^_5-%47m@^18xc@h+mz9f+^"

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.settings")




application = get_wsgi_application()

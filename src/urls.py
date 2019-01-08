# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

# from cms.sitemaps import CMSSitemap
from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
#from django.contrib.auth.views import LogoutView
from django.contrib.sitemaps.views import sitemap
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic import RedirectView

from django.contrib.auth.views import (
        LoginView,
        LogoutView,

        #password reset views
        #PasswordResetView,
        PasswordResetDoneView,
        PasswordResetConfirmView,
        PasswordResetCompleteView,


        #password change views
        PasswordChangeView,
        PasswordChangeDoneView,

    )


from django.views.static import serve

from src.views import home

admin.autodiscover()

handler404 = 'src.views.handler404'
handler403 = 'src.views.handler403'
handler500 = 'src.views.handler500'

urlpatterns = [
    # url(r'^sitemap\.xml$', sitemap,
    #     {'sitemaps': {'cmspages': CMSSitemap}}),
]

urlpatterns += i18n_patterns(

    # TODO... Need to add a home page
    url(r'^$', home, name='home'),
    url(r'^home/', home, name='home'),

    ###########################################
    #  app url imports
    ###########################################
    url(r'^accounts/', include('accounts.urls')),
    url(r'^core/', include('src.apps.core.urls')),
    url(r'^module/', include('src.apps.module.urls')),
    url(r'^editor/', include('src.apps.editor.urls')),
    url(r'^manage/', include('src.apps.manage.urls')),

    # *****************************************************

    url(r'^admin/', include(admin.site.urls)),  # NOQA
    url(r'^oauth2/', include('social_django.urls', namespace='social')),  # OAuth, should be placed prior to cms urls
    # url(r'^', include('cms.urls')),
)  + staticfiles_urlpatterns()

# url(r'^static/(?P<path>.*)$',serve,{'document_root': settings.STATIC_ROOT})



# This is only needed when using runserver.
if settings.DEBUG:
    urlpatterns = [
        url(r'^media/(?P<path>.*)$', serve,
            {'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
        ] + staticfiles_urlpatterns() + urlpatterns

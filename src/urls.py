# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

from cms.sitemaps import CMSSitemap
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
        PasswordResetView,
        PasswordResetConfirmView,
        PasswordResetCompleteView,

        #password change views
        PasswordChangeView,
        PasswordChangeDoneView,

    )


from django.views.static import serve

from accounts.views import (
        RegisterView,
        #LoginView,
        #LogoutView,
        UserProfileUpdateView,
    )

admin.autodiscover()

handler404 = 'src.views.handler404'
handler403 = 'src.views.handler403'
handler500 = 'src.views.handler500'

urlpatterns = [
    url(r'^sitemap\.xml$', sitemap,
        {'sitemaps': {'cmspages': CMSSitemap}}),
]

urlpatterns += i18n_patterns(

    # include accounts url
    url(r'^accounts/login/$', LoginView.as_view(), name='login'),
    url(r'^accounts/logout/$', LogoutView.as_view(next_page='/'), name='logout'),
    url(r'^accounts/register/$', RegisterView.as_view(), name="register"),

    # password reset views (Currently don't work as requires email)
    url(r'^accounts/PasswordReset/$', PasswordResetView.as_view(), name='password_reset'),
    url(r'^accounts/PasswordResetConfirm/(?P<uidb64>[0-9A-Za-z]+)-(?P<token>.+)/$', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    url(r'^accounts/PasswordResetComplete/$', PasswordResetCompleteView.as_view(), name='password_reset_complete'),

    # password change views
    url(r'^accounts/PasswordChange/$', PasswordChangeView.as_view(), name='password_change'),
    url(r'^accounts/PasswordChangeDone/$', PasswordChangeDoneView.as_view(), name='password_change_done'),

    url(r'^accounts/profile/$', UserProfileUpdateView.as_view(), name='user_profile'),
    url(r'^accounts/profile/(?P<email>.*)/', UserProfileUpdateView.as_view()),

    url(r'^admin/', include(admin.site.urls)),  # NOQA
    url(r'^oauth2/', include('social_django.urls', namespace='social')),  # OAuth, should be placed prior to cms urls
    url(r'^', include('cms.urls')),
)  + staticfiles_urlpatterns()

# This is only needed when using runserver.
if settings.DEBUG:
    urlpatterns = [
        url(r'^media/(?P<path>.*)$', serve,
            {'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
        ] + staticfiles_urlpatterns() + urlpatterns

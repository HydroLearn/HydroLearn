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
        #PasswordResetView,
        PasswordResetDoneView,
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
        PasswordResetView,
        UserProfileUpdateView,

        UserAccount_VerificationSent,
        activate
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
    url(r'^accounts/login/$', LoginView.as_view(
            template_name='accounts/registration/login.html'
        ), name='login'),

    url(r'^accounts/logout/$', LogoutView.as_view(next_page='/'), name='logout'),


    #***************************************************** password reset views
    url(r'^accounts/password/reset/$',
        PasswordResetView.as_view(),name='password_reset'),

    url(r'^accounts/password/reset/done/$',
        PasswordResetDoneView.as_view(
            template_name='accounts/registration/password_reset_done.html'
        ), name='password_reset_done'),

    url(r'^accounts/password/reset/confirm/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,23})/$',
        PasswordResetConfirmView.as_view(
            template_name='accounts/registration/password_reset_confirm.html'
        ), name='password_reset_confirm'),

    url(r'^accounts/password/reset/complete/$',
        PasswordResetCompleteView.as_view(
            template_name='accounts/registration/password_reset_complete.html'
        ), name='password_reset_complete'),

    #*****************************************************

    #***************************************************** password change views

    url(r'^accounts/password/change/$', PasswordChangeView.as_view(), name='password_change'),
    url(r'^accounts/password/change/done/$', PasswordChangeDoneView.as_view(), name='password_change_done'),

    #*****************************************************

    #***************************************************** Account Profile
    url(r'^accounts/profile/$', UserProfileUpdateView.as_view(), name='user_profile'),
    url(r'^accounts/profile/(?P<email>.*)/', UserProfileUpdateView.as_view()),

    #*****************************************************

    #***************************************************** Account Activation
    url(r'^accounts/register/$', RegisterView.as_view(), name="register"),
    url(r'^accounts/activation-sent/$', UserAccount_VerificationSent.as_view(), name='account_activation_sent'),
    #
    url(r'^accounts/activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        activate, name='activate'),

    # *****************************************************

    url(r'^admin/', include(admin.site.urls)),  # NOQA
    url(r'^oauth2/', include('social_django.urls', namespace='social')),  # OAuth, should be placed prior to cms urls
    url(r'^', include('cms.urls')),
)  + staticfiles_urlpatterns()

# url(r'^static/(?P<path>.*)$',serve,{'document_root': settings.STATIC_ROOT})



# This is only needed when using runserver.
if settings.DEBUG:
    urlpatterns = [
        url(r'^media/(?P<path>.*)$', serve,
            {'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
        ] + staticfiles_urlpatterns() + urlpatterns

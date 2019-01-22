from django.conf.urls import url

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

from accounts.views import (
        RegisterView,
        #LoginView,
        #LogoutView,
        PasswordResetView,
        UserProfileUpdateView,

        UserAccount_VerificationSent,
        activate
    )


app_name = 'accounts'
urlpatterns = [

    url(r'^login/$', LoginView.as_view(template_name='accounts/registration/login.html'), name='login'),
    url(r'^logout/$', LogoutView.as_view(next_page='/'), name='logout'),


    # ******************* password reset views
    url(r'^password/reset/$',PasswordResetView.as_view(), name='password_reset'),
    url(r'^password/reset/done/$',PasswordResetDoneView.as_view(template_name='accounts/registration/password_reset_done.html'), name='password_reset_done'),
    url(r'^password/reset/confirm/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,23})/$',PasswordResetConfirmView.as_view(template_name='accounts/registration/password_reset_confirm.html'), name='password_reset_confirm'),
    url(r'^password/reset/complete/$',PasswordResetCompleteView.as_view(template_name='accounts/registration/password_reset_complete.html'), name='password_reset_complete'),


    # ******************* password change views
    url(r'^password/change/$', PasswordChangeView.as_view(), name='password_change'),
    url(r'^password/change/done/$', PasswordChangeDoneView.as_view(), name='password_change_done'),


    # ******************* Account Profile
    url(r'^profile/$', UserProfileUpdateView.as_view(), name='user_profile'),
    url(r'^profile/(?P<email>.*)/', UserProfileUpdateView.as_view(), name='update_user_profile'),



    # ******************* Account Activation
    url(r'^register/$', RegisterView.as_view(), name="register"),
    url(r'^activation-sent/$', UserAccount_VerificationSent.as_view(), name='account_activation_sent'),
    #
    url(r'^activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$', activate, name='activate'),

]
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.views import (
    LoginView,
    LogoutView,
    PasswordResetView
)
from django.contrib import messages
from django.db import transaction
from django.http import (
    HttpResponseRedirect,
    HttpResponse,

)
# from django.shortcuts import render, redirect
# from django.utils.http import is_safe_url
from django.shortcuts import render, render_to_response, redirect
from django.views.generic import CreateView, FormView, RedirectView

from accounts.forms import LoginForm, RegisterForm, UserForm, UserProfileForm

from django.views.generic import TemplateView

from accounts.models import User
from accounts.models import Profile
from django.contrib.auth.decorators import login_required
from django.views.generic.edit import UpdateView
from django.core.urlresolvers import reverse_lazy
from django.utils.translation import gettext as _

# used in register view (from tutorial, may be better ways)
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from accounts.tokens import account_activation_token


class RegisterView(CreateView):
    form_class = RegisterForm
    template_name = "accounts/register.html"
    #success_url = "/accounts/login/"
    success_url = "/accounts/activation-sent/"

    def form_valid(self, form):

        try:
            with transaction.atomic():
                # create record for new user to track activation
                user = form.save(commit=False)
                user.is_active = False
                user.save()
                self.object = user

                current_site = get_current_site(self.request)

                # construct the account verification email
                subject = "Activate your HydroLearn.org Account"
                message = render_to_string('/accounts/registration/account_activation_email.html', {
                        'user': user,
                        'domain':current_site.domain,
                        'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                        'token': account_activation_token.make_token(user)
                    })


                # send email to supplied email address
                user.email_user(subject,message)

                return HttpResponseRedirect("{0}?u={1}".format(self.get_success_url(), user.get_username()))
                #return redirect(self.get_success_url(), context={'username':user.username})

        except:
            return render(self.request, '/accounts/registration/account_activation_invalid.html')

        #return super().form_valid(form)

class UserAccount_VerificationSent(TemplateView):
    template_name = '/accounts/registration/account_activation_sent.html'

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(UserAccount_VerificationSent, self).get_context_data(**kwargs)

        #context['user_requesting_activation'] = kwargs.get('user_requesting_activation')
        context['new_account'] = self.request.GET.get('u','Error')

        return context



'''
    Account activation view.
    expected to recieve a uidb64 value and an activation token
    generated during the registration process.
    
    upon calling this view:
        - the uid is decoded and if there is a user associated
        - the token is checked for validity, against the received user
        - if everything checks out the user's 'is_active' flag is set to true
            -this will allow the user to login in the future
'''
def activate(request, uidb64, token):
    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.profile.email_confirmed = True
        user.save()
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')

        messages.success(request, _("Successfully Verified Account:'%s'" % user.get_username()))
        return HttpResponseRedirect('/')
    else:
        return render(request, '/accounts/registration/account_activation_invalid.html')


class LoginView(LoginView):
    next_page = '/manage/'


class LogoutView(LogoutView):
    """
    A view that logout user and redirect to homepage.
    """
    #permanent = False
    #query_string = True

    next_page = '/'
    #template_name = 'accounts/logout.html'

    def get_redirect_url(self, *args, **kwargs):
        """
        Logout user and redirect to target url.
        """
        if self.request.user.is_authenticated():
            logout(self.request)
        return super(LogoutView, self).get_redirect_url(*args, **kwargs)


class PasswordResetView(PasswordResetView):
    template_name = 'accounts/registration/password_reset_form.html'
    email_template_name = 'accounts/registration/password_reset_email.html'

class UserProfileView(TemplateView):
    template_name = 'accounts/profile.html'

    def get_context_data(self, **kwargs):
        u = User.objects.none()
        if 'user' in kwargs:
            try:
                u = User.objects.get(pk=kwargs['user'])
            except:
                u = User.objects.get(email=kwargs['user'])


        elif self.request.GET.get('user', False):
            try:
                u = User.objects.get(pk=self.request.GET['user'])
            except:
                u = User.objects.get(email=self.request.GET['user'])


        elif not self.request.user.is_anonymous():
            # if the user is logged in and no user is specified, show logged in user
            u = User.objects.get(pk=self.request.user.id)


        # if requesting user is not the profile user, then show only resources that the requesting user has access
        if self.request.user != u:
            if self.request.user.is_authenticated():
                if self.request.user.is_superuser:
                    # admin can see all resources owned by profile user
                    pass

        return {
            'profile_user': u,
        }


class UserProfileUpdateView(UpdateView):
    template_name = 'accounts/profile_update.html'
    #model = Profile
    #fields = ['first_name', 'last_name']
    form_class = UserProfileForm
    success_url = reverse_lazy('accounts:user_profile')

    def get_object(self, queryset=None):
        obj = Profile.objects.none()
        try:

            if self.request.user.is_authenticated():

                if "email" not in self.kwargs:
                    u = User.objects.get(pk=self.request.user.id)
                else:
                    u = User.objects.get(email=self.kwargs['email'])
                if u == self.request.user or self.request.user.is_superuser:
                    obj, created = Profile.objects.get_or_create(user=u)
        except:
            pass

        return obj

    def get_context_data(self, **kwargs):
        context = super(UserProfileUpdateView, self).get_context_data(**kwargs)

        u = self.request.user
        if "email" in self.kwargs:
            u = User.objects.get(email=self.kwargs['email'])
        context["parameter_user"] = u
        return context

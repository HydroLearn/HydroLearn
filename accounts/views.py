from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import render, redirect
from django.utils.http import is_safe_url
from django.views.generic import CreateView, FormView, RedirectView

from accounts.forms import LoginForm, RegisterForm, UserForm, UserProfileForm

from django.views.generic import TemplateView

from accounts.models import User
from accounts.models import Profile
from django.contrib.auth.decorators import login_required
from django.views.generic.edit import UpdateView
from django.core.urlresolvers import reverse_lazy

class RegisterView(CreateView):
    form_class = RegisterForm
    template_name = "accounts/register.html"
    success_url = "/accounts/login/"

# class LoginView(FormView):
#     form_class = LoginForm
#     template_name = "accounts/login.html"
#     success_url = "/"
#
#     def form_valid(self, form):
#
#         next_ = self.request.GET.get('next')
#         next_post = self.request.POST.get('next')
#         redirect_path = next_ or next_post or None
#
#         email = form.cleaned_data.get("email")
#         password = form.cleaned_data.get("password")
#         user = authenticate(self.request, username=email, password=password)
#
#         if user is not None:
#             login(self.request, user)
#
#             # leftovers from tutorial for his session based guest login
#             # try:
#             #     del request.session['guest_email_id']
#             # except:
#             #     pass
#             #
#
#             if is_safe_url(redirect_path, self.request.get_host()):
#                 return redirect(redirect_path)
#             else:
#                 return redirect('/')
#         else:
#             return super(LoginView, self).form_invalid(form)

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


class UserProfileView(TemplateView):
    template_name = 'accounts/profile.html'

    def get_context_data(self, **kwargs):
        u = User.objects.none()
        if 'user' in kwargs:
            try:
                u = User.objects.get(pk=int(kwargs['user']))
            except:
                u = User.objects.get(email=kwargs['user'])


        elif self.request.GET.get('user', False):
            try:
                u = User.objects.get(pk=int(self.request.GET['user']))
            except:
                u = User.objects.get(email=self.request.GET['user'])


        elif not self.request.user.is_anonymous():
            # if the user is logged in and no user is specified, show logged in user
            u = User.objects.get(pk=int(self.request.user.id))


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
    success_url = reverse_lazy('user_profile')

    def get_object(self, queryset=None):
        obj = Profile.objects.none()
        try:
            if self.request.user.is_authenticated():

                if "email" not in self.kwargs:
                    u = User.objects.get(pk=int(self.request.user.id))
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

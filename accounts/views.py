from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import render, redirect
from django.utils.http import is_safe_url
from django.views.generic import CreateView, FormView, RedirectView

from accounts.forms import LoginForm, RegisterForm

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
from django.shortcuts import render

###############################################
#   DEFINE CUSTOM ERROR VIEWS TO BE USED BY THE PROJECT
###############################################

def handler404(request):
    response = render(request, 'shared/404.html', {})
    response.status_code = 404
    return response

def handler500(request):
    response = render(request, 'shared/500.html', {})
    response.status_code = 500
    return response

def handler403(request):
    response = render(request, 'shared/403.html', {})
    response.status_code = 403
    return response

def home(request):
    response = render(request, 'home.html', {})
    return response

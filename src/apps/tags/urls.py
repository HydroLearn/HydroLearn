from django.conf.urls import url


from src.apps.tags.views import *

# 'tag' app urls
urlpatterns = [
        
        url(r'^$', TagBrowserView.as_view(), name="alltags"),        
        
            
        # tag detail view
        url(r'^(?P<slug>[^/]+)/$', TagDetailView.as_view(), name="tagged"),        
        
        # ======================================== PARTIAL VIEW RETURNS ====================
        
        
        
        
        
    
]
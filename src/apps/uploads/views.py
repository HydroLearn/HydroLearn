from src.apps.uploads.models import (
    Image
)

from django.views.generic import (
    ListView,
    DetailView,
)

class Index(ListView):
    model = Image
    template_name = 'catalog.html'
from .base import *
from .production import *

# try to load local settings if they exist, (expected not to on production instance)
try:
    from .local import *
except:
    pass
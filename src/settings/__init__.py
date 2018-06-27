from .base import *

try:
    from .production import *
except:
    pass

# try to load local settings if they exist, (expected not to on production instance)
try:
    from .local import *
except:
    pass
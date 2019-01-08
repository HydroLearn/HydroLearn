import os

print("//Loading Base settings...")
from src.settings.base import *

# check for the existence of a test settings directory
TEST_SETTINGS_DIR_EXISTS = os.path.isdir(os.path.dirname(os.path.abspath(__file__)) + '/test_settings')

# try to load test settings if they exist,
#   (expected not to on production instance)
# Otherwise, load the production settings

if TEST_SETTINGS_DIR_EXISTS:
    try:

        # load all python modules declared in
        #   src.settings.test_settings.__init__.py
        #   -   to add additional settings files just add include statements
        #       to the child __init__.py file in the /test_settings directory
        #   -   this allows for testing of settings without modifying
        #       the production setting values
        #

        from src.settings.test_settings import *

    except Exception as e:
        print("// XXXXX - Failed to load test settings - XXXXX")
        print("// message: " + str(e))
        print("// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
else:
    try:
        print("//Loading Production settings...")
        from src.settings.production import *
        # from src.settings.cms_settings import *
        from src.settings.ckeditor import *
        from src.settings.database import *
        from src.settings.ssl import *
        from src.settings.hydroshare import *
        from src.settings.email_info import *

    except Exception as e:
        print("// XXXXX - Failed to load production settings - XXXXX")
        print("// message: " + str(e))
        print("// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")


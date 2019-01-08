# HydroLearn
Repository for the HydroLearn Project

HydroLearn has been developed utilizing:  
- Python 3.5.4
- django 1.11.7

*Note:* the following steps will be simplified in a future release.

# Running Project

## Prerequisites 
- *python*: the current version has been built using python 3.5   
  - link: https://www.python.org/downloads/release/python-354/
  
*be sure to include pip installation*

it is expected that you install hydrolearn in it's own seperated virtual environment allowing for easy implementation of patches
- *virtualenvwrapper*
  - on Windows, this can be installed by opening the command prompt and running:
    -  `pip install virtualenvwrapper-win`
  - on a Unix system, this can be done by opening the terminal and running:
    - `pip install virtualenvwrapper`


once python and virtualenvwrapper are installed, it is expected that you to generate a new virtual environment to contain the packages outlined in requirements.txt


ADDITIONALLY
you will need to provide a json config file for the project in a protected directory
and map the HYDROLEARN_CONF environment variable within the environment

this JSON file is expected to contain a single dictionary containing the following values: 
*more can be added if needed, keep in mind the below example uses placeholder values instead of production values for security purposes*

*Additionally, comments are not allowed in this file*


    {
          "SECRET_KEY": "...enter a long randomized string for secret key value...",

          "EMAIL_USE_TLS": true,
          "EMAIL_USER": "...add a test email user (generated a seperate gmail account for testing)...",
          "EMAIL_PASS": "...supply password...",
          "EMAIL_HOST": "...this will depend on email being used ('smtp.gmail.com' used for testing)",
          "EMAIL_PORT": 587,
          "EMAIL_DEFAULT_FROM": "HydroLearn <...value from EMAIL_USER ...>",


          "DB_ENGINE":"...db engine (recommend 'django.db.backends.sqlite3' for testing)...",
          "DB_PORT":"...db port     ('' by default for sqlite)...",
          "DB_NAME":"...db name     ('project.db' for testing instance)...",
          "DB_HOST":"...db host     ('localhost')",
          "DB_USER":"...db user     ('' by default)...",
          "DB_PASS":"...db password ('' by default)...",


          "HS_KEY": "...hydroshare key value...",
          "HS_SECRET": "...hydroshare secret key..."

        
    }

*If these values are not present in the config file an error will be thrown upon running the server.*

You will need to ensure that the environment variable linking to this file is mapped before the project will be able to run. 

depending on how you've installed the environment you will have to determine the best way to define this environment variable so that is accessible by the project settings.

## Installation

Generate a directory where you would like the project to be placed on your machine, and perform a checkout of the source code.

### the following steps will be performed in the command prompt / terminal

1. Once the project has been downloaded, create a new virtual environment. for ease of instruction let's name it 'HydroLearn' 
this can be accomplished by opening the command prompt/terminal and running the following command:

    `mkvirtualenv HydroLearn`

2. Once this process completes, activate your new virtual environment:

    `workon HydroLearn`

    - Your prompt should now be preceeded by `(HydroLearn)` indicating that you have successfully activated the environment, now any installations you run will take place within the generated virtual environment.

3. Navigate to the directory where you downloaded the source code  (the directory containing `requirements.txt`)

4. Ensure the virtual environment is still active, and install HydroLearn's required packages by running the following command 

    `pip install -r requirements.txt`
    - *let this process complete before moving on to the following steps.*
    
5. Once everything is installed, you will need to run the initial migration to generate the database used by the project. run the following command:
    
    - `python manage.py migrate`
    
    *this will generate the database from the included migrations* 

6. Next, we need to collect the static files associated with the project into a root directory. To do this, run the following:
    - `python manage.py collectstatic`
    
    *this will generate the 'static_root' directory in your project*
    
7. Finally we need to create the superuser for the system. run the following command and answer the prompts to generate the superuser:
    - `python manage.py createsuperuser`
      - this should be obvious, but *REMEMBER THE LOGIN INFORMATION*
    
8. Once completed you can run the project locally by running the following:
    - `python manage.py runserver`
    - this will spin up the server and display the URL to the project. by default it should be 'http://localhost:8000' or 'http://127.0.0.1:8000',
    
    BUT this will not work until we set up some local settings.
      

## Create a Test Settings Directory

In order to test new configuration settings and override some of the production defaults that will differ within your local development environment, you will need to set up a test settings directory to house settings that either differ from the production environment or are still in testing before migrating to production settings.

**This will need to be generated before you can login to the site!**

The settings-directory's initialization procedure is set to first check for the existence of a child `test_settings` directory (*which is ignored by the repository*) before loading the default production settings. if this directory exists, it will attempt to load these settings instead of the settings provided by the repository.  to add your `test_settings` directory you will need to do the following:

  1. Within your project navigate to the settings directory located at `src/settings/` and create a child directory named `test_settings`
  2. within the `test_settings` directory you will create two new files.
     - `__init__.py`
     - `local.py`
  3. Open `.../test_settings/__init__.py` and add the following code to the file:
  
     ```      
      # this print output should displayed when running the server
      # this is a quick way to tell you've loaded the correct settings for your local development environment
      print("//Loading TEST settings...")
      
      # import test directory settings
      from src.settings.test_settings.local import *
      
      # if you have created any other experimental setting files you can import them here
      
      # import some settings from the root project settings
      from src.settings.hydroshare import *
      from src.settings.ckeditor import *
      from src.settings.database import *
     ```
     
  4. save `__init__.py`
  5. open `.../test_settings/local.py` and add the following code:
  
     ```
      from src.settings.config_reader import get_config_setting

      # ************************SECURITY SETTINGS************************************
      # SECURITY WARNING: don't run with debug turned on in production!
      DEBUG = True
    
      # get secret key from config
      SECRET_KEY = get_config_setting("SECRET_KEY")
    
      
      # Dev settings      
      ALLOWED_HOSTS = ['HydroLearn.org', 'localhost', '127.0.0.1', '[::1]']
      CSRF_COOKIE_SECURE = False

     ```
   
  6. save `local.py`
  
To check if your settings are loading properly for you dev environment, navigate to the projects root folder containing `manage.py` and attempt to run the server using `python manage.py runserver`, and you should be greeted with the following output:

```
//Loading Base settings...
//Loading TEST settings...
Performing system checks...

System check identified no issues (0 silenced).
November 07, 2018 - 08:53:57
Django version 1.11.7, using settings 'src.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.

```

_The important part being the `//Loading TEST settings...` output._

 Once the above steps have been completed and no errors are thrown, the application should now be useable.


  
  
    

    
    

    

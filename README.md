# HydroLearn
Repository for the HydroLearn Project

HydroLearn has been developed utilizing:  
Python 3.5


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
    
5. Once everything is installed, you will need to generate and update the database used by the project. run the following commands:
    - `python manage.py makemigrations`
    
    *look over the suggested changes and ensure there were no errors generating the migrations* 
    
    - `python manage.py migrate`
    
    *this will generate the database from the generated migrations* 

6. Next, we need to collect the static files associated with the project into a root directory. To do this, run the following:
    - `python manage.py collectstatic`
    
    *this will generate the 'static_root' directory in your project*
    
7. Finally we need to create the superuser for the system. run the following command and answer the prompts to generate the superuser:
    - `python manage.py createsuperuser`
      - this should be obvious, but *REMEMBER THE LOGIN INFORMATION*
    
8. Once completed you can run the project locally by running the following:
    - `python manage.py runserver`
    - this will spin up the server and display the URL to the project. by default it should be 'http://localhost:8000',
    
    BUT this will not work until we create the pages in the `admin` interface.
      
      
## Not quite done.. 
though the project has been installed, there is still some configurations that need to take place in the application itself before becoming usable. ensure the server is running and do the following
Once the project is running you will need to connect some pages to the installed apphooks included in the `src/apps/` directory
    
  1. With the server running. access the admin interface by navigating to the following:
  
  http://localhost:8000/admin

  2. Login using the credentials you provided in the `createsuperuser` prompts in the previous section. 
    
  3. once in the admin interface, You should see a section titled 'DJANGOCMS'
    - find this section and click the `Pages` link.
    
  4. First things first, we need to generate the Home page. Select the "New Page" button on the top right and in the form that appears add the following:
      - Title should be set to Home
        - *the slug field should have auto generated as 'home' when entering the title.*
      - At the bottom of the form click the 'Save and continue editing' button (this will trigger a page refresh)
      - Scroll to the bottom of the form and you should now see an 'Advanced Settings' option to the bottom left. click it.
        - Under "TEMPLATE" select the 'HOME_TEMPLATE' option
      - SAVE the page.
      - you will be redirected to the Page Tree and you will now see the 'Home' page listed. 
      - click on the Blue dot on the page and select 'Publish'
      
  5. Next, we will need to add the application pages to the project. There are currently 3, and the process to add each is similar so I will detail this once and you can substitute the names of the pages.
    using the 'Module' page as the example:
      1. Click the 'New Page' button to the top right of the Page Tree listing.
      2. Once the form loads, enter 'Module' as the title, and the slug field should auto-generate.
      3. Scroll to the bottom of the form and click, 'Save and continue editing'
      4. Scroll to the bottom again and click, 'Advanced Settings'
      5. Scroll down until you see the 'APPLICATION' dropdown box, and select the 'Module' option.
      6. Save the page.
      
      7. Repeat this process for the 'Manage' and 'Tags' applications. substituting the names.
    
  
    

    
    

    

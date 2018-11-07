gettext = lambda s: s

# settings directly related to djangocms plugins
CMS_LANGUAGES = {
    ## Customize this
    1: [
        {
            'code': 'en',
            'name': gettext('en'),
            'redirect_on_fallback': True,
            'public': True,
            'hide_untranslated': False,
        },
    ],
    'default': {
        'redirect_on_fallback': True,
        'public': True,
        'hide_untranslated': False,
    },
}

CMS_TEMPLATES = (
    ## Customize this
    ('layout.html', 'HYDROLEARN_TEMPLATE'),
    ('home.html', 'HOME_TEMPLATE'),
    ('content.html', 'TOOLBAR_ENABLED_TEMPLATE'),
)

CMS_PERMISSION = True

CMS_PLACEHOLDER_CONF = {
    'lesson_summary': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This lesson\'s summary doesn\'t appear to have any content.',
                }
            }
        ]
    },

    'reading_content': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This Reading Section doesn\'t appear to have any content.',
                }
            }
        ]
    },

    'activity_content': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This Activity Section doesn\'t appear to have any content.',
                }
            }
        ]
    },

    'question_text': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This Question hasn\'t been populated yet! Please add the question content!',
                }
            }
        ]
    },

    'answer_text': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This Answer hasn\'t been populated yet! Please add the answer content!',
                }
            }
        ]
    },

}

# CMS_TOOLBAR_HIDE = True
# CMS_PAGE_CACHE = False
# CMS_PLACEHOLDER_CACHE = False
# CMS_PLUGIN_CACHE = False
# CMS_MEDIA_PATH = 'cms/'

# ?edit_off (CMS_TOOLBAR_URL__EDIT_OFF)
# ?build (CMS_TOOLBAR_URL__BUILD)
# ?toolbar_off (CMS_TOOLBAR_URL__DISABLE)
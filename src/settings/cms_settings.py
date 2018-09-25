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
)

CMS_PERMISSION = True

CMS_PLACEHOLDER_CONF = {
    'module_intro': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This module\'s introduction doesn\'t appear to have any content.',
                }
            }
        ]
    },

    'topic_summary': {
        'plugins': ['TextPlugin', ],
        'limits': {
            'TextPlugin': 1,
        },
        'default_plugins': [
            {
                'plugin_type': 'TextPlugin',
                'values': {
                    'body': 'This topic\'s summary doesn\'t appear to have any content.',
                }
            }
        ]
    },

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

# some additional settings for the edit toolbar (potentially can set these when loading view)
#CMS_TOOLBAR_URL__EDIT_ON = True
# -- or --
#CMS_TOOLBAR_URL__EDIT_OFF = True

# CMS_TOOLBAR_URL__DISABLE = True

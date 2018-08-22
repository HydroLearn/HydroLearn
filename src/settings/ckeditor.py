# CKeditor settings (adding style elements to content dropdown)
CKEDITOR_SETTINGS = {
    # 'language': '{{ language }}',
    # 'toolbar': 'CMS',
    # 'skin': 'moono',
    'toolbar_CMS': [
        ['Undo', 'Redo'],
        ['cmsplugins', '-', 'ShowBlocks'],
        ['Styles'],
        ['TextColor', 'BGColor', '-', 'PasteText', 'PasteFromWord'],
        ['Maximize', ''],
        '/',
        ['Bold', 'Italic', 'Underline', '-', 'HorizontalRule', "-", 'Subscript', 'Superscript', '-', 'Blockquote',
         'RemoveFormat'],

        ['JustifyLeft', 'JustifyCenter', 'JustifyRight'],
        ['Link', 'Unlink'],
        ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Table'],
        ['Source']
    ],

    # See: https://github.com/yakupadakli/django_blog/blob/master/ckeditor/ckeditor/styles.js
    # for default style definitions.
    'stylesSet': [

        {
            'name': 'Main Section Header',
            'element': 'h2',
            'attributes': {
                'class': 'lesson-header',
            }
        },
        {
            'name': 'Subsection Header',
            'element': 'h3',
            'attributes': {
                'class': 'lesson-subheader',
            }
        },
        {
            'name': 'body text',
            'element': 'p',
        },

    ]
}

CKEDITOR_SETTINGS_OverlayImg = {
    'toolbar_HTMLField': [
        ['Undo', 'Redo'],
        ['Format', 'Styles'],
        ['Bold', 'Italic', 'Underline', '-', 'Subscript', 'Superscript', '-', 'RemoveFormat'],
    ]
}

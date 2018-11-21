// object to extend functionality of TOC_manager to account for loading
// of forms and interface changes within editor

function EDITOR_TOC(target_container_selector, TOC_Listing, editor_access){

    // set whether the table of contents will be loaded in edit mode
    this.editor_access = (typeof(editor_access) != 'undefined') ? editor_access : false;

    // provide mapped configuration to parent 'Editor' constructor
    TABLE_OF_CONTENTS_MANAGER.call(this, target_container_selector, TOC_Listing);

    // add custom event triggers for editing actions
    this.EVENT_TRIGGERS['ADD_SECTION'] = '_TOC_add_section';
    this.EVENT_TRIGGERS['ADD_LESSON'] = '_TOC_add_lesson';
    this.EVENT_TRIGGERS['REMOVE_OBJ'] = '_TOC_remove_obj';
    this.EVENT_TRIGGERS['DELETE_DIALOG'] = '_TOC_delete_dialog';

    // bind custom trigger events to target container
    $(this._target).on(this.EVENT_TRIGGERS.ADD_SECTION, this._add_section_evt.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.ADD_LESSON, this._add_lesson_evt.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.REMOVE_OBJ, this._remove_obj_event.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.DELETE_DIALOG, this._show_deletion_dialog_listener.bind(this))





}

// extend this object's prototype to extend from TABLE_OF_CONTENTS_MANAGER's prototype
EDITOR_TOC.prototype = Object.create(TABLE_OF_CONTENTS_MANAGER.prototype)


/*----------------------------------------------------
    Override TOC_MGR methods for editor interface
----------------------------------------------------*/
    EDITOR_TOC.prototype.parse_listing = function(listing) {

                // perform the same action as default TOC
                TABLE_OF_CONTENTS_MANAGER.prototype.parse_listing.call(this, listing)

                if(listing.slug == 'new_lesson'){
                    $('#Base_Lesson_obj').addClass('TOC_NEW_OBJ')
                    $('#Base_Lesson_obj').find('.Lesson_Link').first().click();
                }


                if(this.editor_access){
                    this._add_section_contextMenus();
                }



            }

    EDITOR_TOC.prototype.generate_lesson_obj = function(lesson, start_expanded){

            // perform the default generate lesson operation
            var lesson_obj = TABLE_OF_CONTENTS_MANAGER.prototype.generate_lesson_obj.call(this, lesson, start_expanded)


            // if this is an instantiated lesson add the Add controls
            if(!!lesson.is_instanced && this.editor_access){

                // grab the content container and add the 'Add New' buttons
                var accord_content = lesson_obj.find('.accord-content').first()
                var accord_header = lesson_obj.find('.accord-title').first()

                lesson_obj.attr('data-is-instanced', lesson.is_instanced)
                accord_header.attr('title', "Right-Click for more options.")

                // TODO: find a way to extract this into it's own method
                //          currently theres a dependancy on grabbing the lesson depth
                //          when making sub-menu items
                //          this will have to be reworked.
                var manager = this;

                function lesson_c_menu_view_evt(key, options){
                    // trigger selection of this element
                    manager.trigger_event(manager.EVENT_TRIGGERS.SELECT_OBJ, [$(this).closest('.Lesson_obj').attr('data-TOC-obj-id')]);
                }

                function lesson_c_menu_add_lesson_evt(key, options){

                    var lesson_id = $(this).closest('.Lesson_obj').attr('data-TOC-obj-id');
                    manager.trigger_event(manager.EVENT_TRIGGERS.ADD_LESSON, [lesson_id])
                }

                function lesson_c_menu_add_section_evt(key, options){

                    var lesson_id = $(this).closest('.Lesson_obj').attr('data-TOC-obj-id');
                    var poly_type = "invalid";

                    // determine which polymorphic type was selected
                    switch(key){
                        case "add_reading":
                            poly_type = 'reading_section';
                            break;
                        case "add_activity":
                            poly_type = 'activity_section';
                            break;
                        case "add_quiz":
                            poly_type = 'quiz_section';
                            break;
                        default:
                            poly_type = 'invalid';

                    }

                    // if this was an unrecognized key, throw an error
                    if( poly_type == "invalid"){
                        throw new Error('TOC_MGR: invalid section type provided when adding.')
                    }

                    // if there was a valid poly-type found trigger the add section event
                    manager.trigger_event(manager.EVENT_TRIGGERS.ADD_SECTION, [lesson_id, poly_type])
                }

                function lesson_c_menu_delete_evt(key, options){

                    // so this should apply for all lessons
                    var obj_id = $(this).closest('.Lesson_obj').attr('data-TOC-obj-id');
                    manager.trigger_event(manager.EVENT_TRIGGERS.DELETE_DIALOG, [obj_id]);

                }

                var lesson_c_menu_items = {
                        // there will be a header with the selected lesson title
                        "head-sep": "---------",
                        "view": {name: "View",icon: "fas fa-eye",callback: lesson_c_menu_view_evt},

                        "add_submenu": {
                                "name": "Add",
                                "icon": "add",
                                "items": (lesson.depth < 2)?
                                    { // if this lesson is less than a depth of 2, include an add-lesson item
                                        "add_reading":{name: "New Reading", className:"add_reading_menu_item", icon:"add", callback: lesson_c_menu_add_section_evt},
                                        "add_activity":{name: "New Activity", className:"add_activity_menu_item", icon:"add", callback: lesson_c_menu_add_section_evt},
                                        "add_quiz":{name: "New Quiz",   className:"add_quiz_menu_item",icon:"add", callback: lesson_c_menu_add_section_evt},
                                        'add_submenu-menu-sep': "---------",
                                        'add_lesson':{name: "New Lesson", icon:"add", callback: lesson_c_menu_add_lesson_evt}
                                    }:
                                    { // if this lesson at a depth of 2 or more, dont include 'add lesson'

                                        "add_reading":{name: "New Reading", icon:"add", className:"reading_section", callback: lesson_c_menu_add_section_evt},
                                        "add_activity":{name: "New Activity", icon:"add", className:"activity_section", callback: lesson_c_menu_add_section_evt},
                                        "add_quiz":{name: "New Quiz", icon:"add", className:"quiz_section", callback: lesson_c_menu_add_section_evt},

                                    },

                            },

                        "sep1": "---------",
                        "delete": {name: "Delete",icon: "delete",callback: lesson_c_menu_delete_evt},
                    };

                var lesson_c_menu_opts1 = {
                    trigger:'right',
                    className: 'data-title',
                    selector:'h3.accord-title',
                    events: {
                        show: function(options){
                            // add the lesson's title to the context menu
                            // for added clarity of object being interacted with
                            options.$menu.attr('data-menutitle', "{0}".format($(this).text()))
                        },
                    },

                    callback: function(key, options) {
                        console.warn('ContextMenu: no method has been specified for "{0}" menu item.'.format(key))
                    },
                    items: lesson_c_menu_items,
                };

                var lesson_c_menu_opts2 = {
                    trigger:'right',
                    className: 'data-title',
                    selector:'.Lesson_Link',
                    events: {
                        show: function(options){
                            // add the lesson's title to the context menu
                            // for added clarity of object being interacted with
                            options.$menu.attr('data-menutitle', "{0}".format($(this).closest('.Lesson_obj').find('.accord-title').first().text()))
                        },
                    },

                    callback: function(key, options) {
                        console.warn('ContextMenu: no method has been specified for "{0}" menu item.'.format(key))
                    },
                    items: lesson_c_menu_items,
                };

                // attach context menu to the lesson header object
                $(lesson_obj).contextMenu(lesson_c_menu_opts1);
                //$(lesson_obj).contextMenu(lesson_c_menu_opts2);




            }

            // return the updated lesson object
            return lesson_obj;


        }

    EDITOR_TOC.prototype.generate_section_obj = function(section) {
           var section_obj = TABLE_OF_CONTENTS_MANAGER.prototype.generate_section_obj.call(this, section)


           // if this is an instantiated lesson add the Add controls
            if(!!section.is_instanced && this.editor_access){
                // grab the content container and add the 'Add New' buttons
                section_obj.attr('data-is-instanced', section.is_instanced)
                section_obj.attr('title', "Right-Click for more options.")
            }

            // return the updated lesson object
            return section_obj;

        }

    EDITOR_TOC.prototype._add_section_contextMenus = function(){
        var manager = this;

        function section_c_menu_view_evt(key, options){
            // trigger selection of this element
            manager.trigger_event(manager.EVENT_TRIGGERS.SELECT_OBJ, [$(this).attr('data-TOC-obj-id')]);
        }

        function section_c_menu_delete_evt(key, options){

            manager.trigger_event(manager.EVENT_TRIGGERS.DELETE_DIALOG, [$(this).attr('data-TOC-obj-id')]);

        }

        var section_c_menu_items = {
                // there will be a header with the selected lesson title
                "head-sep": "---------",
                "view": {name: "View",icon: "fas fa-eye",callback: section_c_menu_view_evt},
                "sep1": "---------",
                "delete": {name: "Delete",icon: "delete",callback: section_c_menu_delete_evt},
            };

        var section_c_menu_opts = {
            trigger:'right',
            selector: '.Section_obj[data-is-instanced=true]',
            className: 'data-title',

            events: {
                show: function(options){
                    // add the lesson's title to the context menu
                    // for added clarity of object being interacted with
                    options.$menu.attr('data-menutitle', "{0}".format($(this).text()))
                },
            },

            callback: function(key, options) {
                console.warn('ContextMenu: no method has been specified for "{0}" menu item.'.format(key))
            },
            items: section_c_menu_items,
        };

        $(this._target).contextMenu(section_c_menu_opts)




    }

/*----------------------------------------------------
    Add some additional functionality
----------------------------------------------------*/

    EDITOR_TOC.prototype.get_lesson_listing = function(value) {
        lesson_listing = $(this._target).find('.TOC_listing[data-lesson-slug="{0}"]'.format(value))

        if(lesson_listing.length){
            return lesson_listing
        }else{
            return null
        }

    }



    EDITOR_TOC.prototype.generate_new_lesson_placeholder = function(parent_slug){

        // TODO: theoretically this representation needs to be passed in the lesson_listing
        var new_lesson_obj = {
            'obj_type': 'lesson',
            'is_instanced': false,
            'slug': parent_slug + '/new_lesson',
            'name': "New Lesson",
            'short_name': "New Lesson",
            'position': 0,
            'content_url': "",
            'children': [],
        }

        var new_lesson_ph = this.generate_lesson_obj(new_lesson_obj, true)
        new_lesson_ph.addClass('TOC_NEW_OBJ')
        new_lesson_ph.find('.Lesson_Link').addClass('TOC_NEW_OBJ')
        return new_lesson_ph

    }

    EDITOR_TOC.prototype.generate_new_section_placeholder = function(parent_slug, section_type){

        // TODO: theoretically this representation needs to be passed in the lesson_listing
        var new_section_obj = {
            'obj_type': 'section',
            'is_instanced': false,
            'slug': "{0}/new_section/{1}".format(parent_slug, section_type),
            'slug_trail': "{0}/new_section/{1}".format(parent_slug, section_type),
            'name': "New Section",
            'short_name': "New Section",
            'position': 0,
            'sectionType': section_type,
            'content_url': null,

        }

        // set the slug information to point to the correct section type
        switch(section_type){
            case 'reading_section':
                    new_section_obj['name'] = "New Reading"
                    new_section_obj['short_name'] = "New Reading"
                break;

            case 'activity_section':
                    new_section_obj['name'] = "New Activity"
                    new_section_obj['short_name'] = "New Activity"
                break;

            case 'quiz_section':
                    new_section_obj['name'] = "New Quiz"
                    new_section_obj['short_name'] = "New Quiz"
                break;

            case 'default':
                    throw Error('Failed to generate new-section placeholder! unrecognized type provided to Editor TOC')
                break;
        }


        var new_section_ph = this.generate_section_obj(new_section_obj)
        new_section_ph.addClass('TOC_NEW_OBJ')
        return new_section_ph


    }

    EDITOR_TOC.prototype.is_nav_blocked = function(){

        if($(this._target).find('.TOC_EDITED_OBJ, .TOC_NEW_OBJ').length){
            return true;
        }
        else{
            return false
        }

    }

    EDITOR_TOC.prototype._add_new_lesson = function (parent_lesson) {
            // check that we're currently not editing a form,
            //  or currently in another 'new' form
            //if($('.TOC_EDITED_OBJ, .TOC_NEW_OBJ').length){

            if(this.is_nav_blocked()){
                $('#lesson-nav-denied-dialog').dialog("open");
                return;
            }

            // generate the new placeholder
            var new_placeholder = this.generate_new_lesson_placeholder(parent_lesson)

            // add it to the parent lesson's listing
            this.get_lesson_listing(parent_lesson).first().append(new_placeholder)

            new_placeholder.find('.Lesson_Link').click()

        }

    EDITOR_TOC.prototype._add_new_section = function (parent_lesson, section_type) {

            //if($('.TOC_EDITED_OBJ, .TOC_NEW_OBJ').length){

            if(this.is_nav_blocked()){
                $('#lesson-nav-denied-dialog').dialog("open");
                return;
            }

            // generate the new section placeholder of the associated type
            var new_placeholder = this.generate_new_section_placeholder(parent_lesson, section_type)


            // append a new section placeholder to the end of it's lesson listing
            this.get_lesson_listing(parent_lesson).first().append(new_placeholder)

            // auto focus new section form
            new_placeholder.click();

        }

    EDITOR_TOC.prototype._remove_object = function(obj_id){

        var removal = this.get_TOC_obj(obj_id)

        if(!!removal){
            removal.remove();
        }else{
            throw new Error("EDITOR_TOC: Could not locate TOC Object with id '{0}' for removal!".obj_id)
        }

    }



/*----------------------------------------------------
    Trigger-able event listeners
----------------------------------------------------*/

    EDITOR_TOC.prototype._add_section_evt = function(evt, parent_lesson, section_type ,callback_fn, callback_args_array){
        if(typeof(parent_lesson) == "undefined") throw new Error("EDITOR_TOC: cannot trigger _add_section without parent lesson, must be provided in event trigger!")

        this._add_new_section(parent_lesson, section_type)

        if(typeof(callback_fn) != undefined && typeof(callback_fn) == "function"){
            callback_fn.apply(null, callback_args_array)
        }
    }

    EDITOR_TOC.prototype._add_lesson_evt = function(evt, parent_lesson, callback_fn, callback_args_array){
        if(typeof(parent_lesson) == "undefined") throw new Error("EDITOR_TOC: cannot trigger _add_lesson without parent lesson, must be provided in event trigger!")

        this._add_new_lesson(parent_lesson);

        if(typeof(callback_fn) != undefined && typeof(callback_fn) == "function"){
            callback_fn.apply(null, callback_args_array)
        }
    }

    EDITOR_TOC.prototype._remove_obj_event = function(evt, obj_id, callback_fn, callback_args_array){

        if(typeof(obj_id) == "undefined") throw new Error("EDITOR_TOC: cannot trigger object removal without specifying object_id, must be provided in event trigger!")


        this._remove_object(obj_id)

        if(typeof(callback_fn) != "undefined" && typeof(callback_fn) == "function"){
            callback_fn.apply(null, callback_args_array)
        }
    }

    EDITOR_TOC.prototype._show_deletion_dialog_listener = function(event, obj_id){

        if(typeof(obj_id) == "undefined") throw new Error('EDITOR_TOC: cannot show deletion dialog without valid object id')

        var manager = this;
        // hide the controls while loading
        $('#delete-confirmation-confirm').hide()
        $('#delete-confirmation-cancel').hide()

        // load the delete form for the current loaded section
        $('#delete-confirmation-content').html("Loading Form...")

        // generate the delete url, and get the associated form
        var delete_url = '/editor/delete/{0}'.format(obj_id)



        $('#delete-confirmation-content').load(delete_url, function(){

            // after loading show the controls
            $('#delete-confirmation-confirm').show()
            $('#delete-confirmation-cancel').show()

            // map the confirm button's click action to submit form
            $('#delete-confirmation-confirm').unbind('click');
            $('#delete-confirmation-confirm').click(function(){

                // serialize the loaded form
                var form = $('#delete-confirmation-content').find('form');
                var form_method = $(form).attr('method');
                var form_action =  $(form).attr('action');
                var form_data =  $(form).serialize();


                $('#delete-confirmation-confirm').hide()
                $('#delete-confirmation-cancel').hide()

                $('#delete-confirmation-content').html('Processing request...')

                // submit the form,
                // if success
                //  refresh the content,
                //  and remove TOC representation

                // if error
                //      display error

                $.ajax({
                    url: form_action,
                    type: form_method,
                    method: form_method,
                    data: form_data,

                    success: function(response){

                        $('#delete-confirmation-content').html(response)
                        $('#delete-confirmation-content').append('<p>You may now close this dialog</p>');

                        //var section_value = $('.current_selected_section').attr('value')
                        var TOC_obj = TOC_MGR.get_TOC_obj(obj_id)

                        // if deleted base lesson, return to manage interface
                        if(TOC_obj.attr('id') == "Base_Lesson_obj"){
                            window.location = "/manage/"
                            return;
                        }

                        // trigger the removal of the newly deleted object from toc
                        manager.trigger_event(manager.EVENT_TRIGGERS.REMOVE_OBJ, [obj_id])

                        // redirect view to base lesson form
                        manager.trigger_event(manager.EVENT_TRIGGERS.SELECT_OBJ, [$('#Base_Lesson_obj').attr('data-TOC-obj-id')]);


                    },

                    error: function(response){
                        $('#delete-confirmation-content').html("There was an error processing your request, Please try again later");

                    },
                })



            })


        })

        $('#delete-confirmation-dialog').dialog("open")
    }





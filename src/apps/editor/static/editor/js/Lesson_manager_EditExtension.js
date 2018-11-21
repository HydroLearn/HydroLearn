/*

    TODO: This file's definition of:
        get_content_query_data
        get_Section_SitePath

    suggests needing to revise, LESSON_VIEW and LESSON_MANAGER's
    functionality to accept a url instead of having to do
    what i'm doing here for these methods...

    but... time-constraints
*/

// define a custom view object for use by the Viewport manager
function EDIT_LESSON_VIEW(ViewName, target_container_selector, Lesson_Manager){
    LESSON_VIEW.call(this, ViewName, target_container_selector, Lesson_Manager)

}

    EDIT_LESSON_VIEW.prototype = Object.create(LESSON_VIEW.prototype)


    // modify lesson view to pull from 'editor/content'
    EDIT_LESSON_VIEW.prototype.get_content_query_data = function(passed_section) {

            // if there is no passed section set it to empty string
                //      triggers loading of module's intro content
                if(typeof(passed_section) == 'undefined') return null;

                var query_data = {};
                query_data['url'] = '/editor/content/' + passed_section

                return query_data;

            }

    EDIT_LESSON_VIEW.prototype.post_display = function (passed_section) {
        // perform the default operations
        LESSON_VIEW.prototype.post_display.call(this, passed_section)


        // TODO: need to tie an event to this once it's generated
        //      but it's not being generated until the iframe
        //      is generated after double-clicking the text
        //
        //$('a.cms-btn.cms-btn-action.default')



        // setup edit button functionality
        $('.Toggle_edit_btn').unbind('click');
        $('.Toggle_edit_btn').click(function(){

            if($('.form_block').is(":visible")){
                $('.form_block').hide()
                $('.content_block').show()
            }else{

                //TODO: need to add class to TOC object to require confirmation before leaving
                LESSON_MGR.get_Loaded_Section()
                $('.current_selected_section').addClass('TOC_EDITED_OBJ')

                $('.form_block').show()
                $('.content_block').hide()
            }
        })

        // if the formblock is a new instance set to visible as there will be no
        // content section

        var new_form = $('.form_block[data-existing-instance=False]').first()
        if(new_form.length){
            //$('.current_selected_section').addClass('TOC_EDITED_OBJ')
            $(new_form).show()


            /*
                Being that this is a new form will need to set the position it's being added at in the loaded form
                set the hidden position field based on number of children in parent lesson obj
            */

            // get this sections closest lesson object, and get the number of siblings
            var num_siblings;

            if($('.current_selected_section').hasClass('Lesson_Link')){
                // if this is a new lesson link, see how many siblings the parent lesson object has
                num_siblings = $('.current_selected_section').closest(".Lesson_obj").siblings().length;

            }else{
                // otherwise this is a section, see how many siblings it has
                num_siblings = $('.current_selected_section').siblings().length;

            }

            // if there's a position field in the newly added child form,
            //      set it's position based on the number of siblings
            var position_field = $(new_form).find('input#id_position');
            if(position_field.length){
                $(position_field).val(num_siblings)
            }



        }

        $('.Delete_button').unbind('click');
        $('.Delete_button').click(function(event){
            event.preventDefault()

            var obj_id = LESSON_MGR.get_Loaded_Section()
            debugger;
            TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.DELETE_DIALOG, [obj_id]);

            return
            // hide the controls while loading
            $('#delete-confirmation-confirm').hide()
            $('#delete-confirmation-cancel').hide()

            // load the delete form for the current loaded section
            $('#delete-confirmation-content').html("Loading Form...")

            // generate the delete url, and get the associated form
            var delete_url = '/editor/delete/{0}'.format(LESSON_MGR.get_Loaded_Section())

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
                    debugger;
                    $.ajax({
                        url: form_action,
                        type: form_method,
                        method: form_method,
                        data: form_data,

                        success: function(response){
                            debugger;
                            $('#delete-confirmation-content').html(response)
                            $('#delete-confirmation-content').append('<p>You may now close this dialog</p>');

                            var is_lesson = $('.current_selected_section').hasClass('Lesson_Link')
                            var section_value = $('.current_selected_section').attr('value')
                            var TOC_obj = TOC_MGR.get_TOC_obj(section_value)

                            // if this was the base lesson object redirect to the management page
                            if(TOC_obj.attr('id') == "Base_Lesson_obj"){
                                window.location = "/manage/"
                                return;
                            }

                            TOC_obj.remove();

                            // redirect view to base lesson form
                            LESSON_MGR.Show_Section(LESSON_MGR.get_Loaded_Module())

                        },

                        error: function(response){

                            $('#delete-confirmation-content').html("There was an error processing your request, Please try again later");

                        },
                    })



                })


            })


            $('#delete-confirmation-dialog').dialog("open")

            // mark this form to delete on submit
            //$('#id_delete_on_submit').val("True")

            // fire submit event
            //$('.Submit_button').click()

        });


        $('.Cancel_button').unbind('click');
        $('.Cancel_button').click(function(event){
            /*
              TODO: need to check if new lesson

                 if new, delete placeholder from TOC
                 if not, swap back from edit mode, and remove 'confirmation requirement'
            */
            event.preventDefault()

            if($('.current_selected_section').hasClass('TOC_EDITED_OBJ')){
                $('.current_selected_section').removeClass('TOC_EDITED_OBJ')
                $('.Toggle_edit_btn').click()
            }

            // if in a new lesson link
            if($('.current_selected_section').hasClass('Lesson_Link')){

                var parent_lesson = $('.current_selected_section').closest('.Lesson_obj')

                if(parent_lesson.hasClass('TOC_NEW_OBJ')){

                    TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.REMOVE_OBJ, [$('.current_selected_section').attr('value')])


                    // no natural return point after this removal
                    //      so load the Root Lesson Introduction
                    LESSON_MGR.Show_Section(LESSON_MGR.get_Loaded_Module())
                }else{



                }


            }

            // if a new section
            if($('.current_selected_section').hasClass('TOC_NEW_OBJ')){
                TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.REMOVE_OBJ, [$('.current_selected_section').attr('value')])

                // no natural return point after this removal
                //      so load the Root Lesson Introduction
                LESSON_MGR.Show_Section(LESSON_MGR.get_Loaded_Module())
            }





        })

        // disable the content form's 'Enter to submit' functionality
        $("#content_form").keypress(function(e) {
          //Enter key
          if (e.which == 13) {
            return false;
          }
        });

        // hide the errors container on load
        $('#content_form_errors').hide();

        // initialize validation for the loaded form (this includes form submission method)
        $('#content_form').validate({
            ignore: "",
            rules: window.custom_validator_rules,
            messages: window.custom_validator_messages,
            submitHandler: submit_content_form_evt.bind(this),

        })



    }

function EDITOR_LESSON_MANAGER(target_container_selector, Module_name, Loaded_Module, Loaded_Section){

    // provide mapped configuration to parent 'Editor' constructor
    LESSON_MANAGER.call(this, target_container_selector, Module_name, Loaded_Module, Loaded_Section);
    //  add the restriction that the currently edited object requires confirmation before
    //  navigation

    this._nav_confirmation_required = ['TOC_EDITED_OBJ', 'TOC_NEW_OBJ'];
}

// extend this object's prototype to extend from TABLE_OF_CONTENTS_MANAGER's prototype
EDITOR_LESSON_MANAGER.prototype = Object.create(LESSON_MANAGER.prototype)


/* -----------------------------------------------------------
    update LESSON_MANAGER to point to the editor interface for urls
----------------------------------------------------------- */

    EDITOR_LESSON_MANAGER.prototype.get_Section_SitePath = function (sectionID) {

            // Construct the URL
            var newURL ="{0}/{1}".format('editor', this.get_Loaded_Module());

            // if a section id was specified append it's query var to the end of the url
            if (!!sectionID) {
               newURL = "{0}/?v={1}".format(newURL,sectionID);
            }

            return newURL;
        }


    // confirmed leave the section in dialog (triggers refresh to the queued section)
    EDITOR_LESSON_MANAGER.prototype.Confirmed_Section_Nav = function() {

            var current_view_TOC_obj = $(".Section_Link[value='{0}']".format(this.get_Loaded_Section()))

            // if this is an existing form remove edited status
            if($(current_view_TOC_obj).hasClass('TOC_EDITED_OBJ')){
                $(current_view_TOC_obj).removeClass('TOC_EDITED_OBJ');
            }


            // check if this is a new LESSON if so remove it's lesson obj
            if($(current_view_TOC_obj).hasClass('Lesson_Link')){

                var parent_lesson = $(current_view_TOC_obj).closest('.Lesson_obj')
                if(parent_lesson.hasClass('TOC_NEW_OBJ')){
                    TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.REMOVE_OBJ, [$(current_view_TOC_obj).attr('value')])
                }

                // no natural return point after this removal
                //      so load the Root Lesson Introduction
                LESSON_MGR.Show_Section(LESSON_MGR.get_Loaded_Module())
            }

            // otherwise if this is a new section, remove the placeholder from the table of contents
            if($(current_view_TOC_obj).hasClass('TOC_NEW_OBJ')){
                TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.REMOVE_OBJ, [$(current_view_TOC_obj).attr('value')])
            }

            // perform default operations
            LESSON_MANAGER.prototype.Confirmed_Section_Nav.call(this)


            //
        }
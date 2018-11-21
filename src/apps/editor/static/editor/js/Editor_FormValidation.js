// define custom validation rules for the Module form fields
window.custom_validator_rules = {
        'name': {
                required: true,
                minlength: 4,

            },

        'duration': {
                required: true,
                validDuration: true,
            },
    }

window.custom_validator_messages = {
    'name': {

            required: "Name is required.",
            minlength: "Please enter at least 4 characters.",
            //name: true,
        },
    'duration': {

            required: "Duration is required.",
            validDuration: "Specified duration is invalid, please double check your input.",
            //duration:true,
        }

}

//// if there are already inputs populated on the form, add validation rules to these elements
//function initialize_existing_validation(){
//    $('#post-new-module').find('input#id_name').rules('add', custom_validator_rules['name']);
//
//    $('#post-new-module').find('input[name$="-name"]').each(function(){
//        $(this).rules('add', custom_validator_rules['name']);
//    });
//
//    $('#post-new-module').find('input[name$="-duration"]').each(function(){
//        $(this).rules('add', custom_validator_rules['duration']);
//    });
//}

function submit_content_form_evt(){

            // hide message containers
            $('#content_form_errors').hide();
            $('#content_form_success').hide();


            // get the form and it's specified action
            var form = $('#content_form');
            var url = $(form).attr('action')

            // send the updated form data
            $.ajax({
                url: url,
                type: "post",
                data: $(form).serialize(),

                success: function(response){


                    // if form submission was valid, redirect to the provided redirect url
                    if(response.success){
                        console.log('success')

                        var existing_toc_obj = TOC_MGR.get_TOC_obj($('.current_selected_section').attr('value'))

                        //response.data.slug
                        //response.data.updated_toc_obj
                        switch(response.data.updated_toc_obj.obj_type){
                            case 'lesson':

                                    // if the submitted lesson was a new-base-lesson redirect to the edit page
                                    if(existing_toc_obj.attr('id') == "Base_Lesson_obj" && existing_toc_obj.hasClass('TOC_NEW_OBJ')){

                                        window.location = "/editor/{0}/".format(response.data.updated_toc_obj.slug)
                                        return;
                                    }

                                    if(existing_toc_obj.attr('id') == "Base_Lesson_obj"){
                                        TOC_MGR.parse_listing(response.data.updated_toc_obj)
                                        $('#Base_Lesson_obj').find('.Lesson_Link').first().addClass('current_selected_section')


                                    }else{
                                        var updated_toc_obj = TOC_MGR.generate_lesson_obj(response.data.updated_toc_obj, true)
                                        updated_toc_obj.find('.Lesson_Link').first().addClass('current_selected_section')
                                        existing_toc_obj.replaceWith(updated_toc_obj)
                                    }

                                break;
                            case 'section':

                                    var updated_toc_obj = TOC_MGR.generate_section_obj(response.data.updated_toc_obj)

                                    updated_toc_obj.addClass('current_selected_section')

                                    existing_toc_obj.replaceWith(updated_toc_obj)

                                break;
                        }



                        // show the newly updated Lesson/Section
                        // or if just editing just re-highlight the current section
                        //if($('.current_selected_section').attr('value') != response.data.updated_toc_obj.slug){
                        if(LESSON_MGR.get_Loaded_Section() != response.data.updated_toc_obj.slug){
                            LESSON_MGR.Show_Section(response.data.updated_toc_obj.slug)
                        }else{

                            TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.HIGHLIGHT_OBJ, [response.data.updated_toc_obj.slug])
                        }





                        // clear out any errors, and show the success message for this form
                        $('#content_form_errors').html("")
                        $('#content_form_success').html(response.message)
                        $('#content_form_success').fadeIn();


                    }else{
                        // otherwise parse the provided error list
                        // and display messages where appropriate
                        console.log('invalid')


                        $('#content_form_errors').html(response.message)
                        $('#content_form_errors').append(response.data.errors)


                        // response.data.errors should be a dictionary
                        //      indexed by field name, mapped to a list of
                        //      respective error objects containing:
                        //          - code - error code
                        //          - message - display message
                        //      each list entry pertains to a form error

                        $('#content_form_errors').fadeIn();
                    }

                },

                error: function(data){

                    $('#content_form_errors').html('<p>There was a problem submitting your form!</p><p>Please, try again later.</p>');
                    $('#content_form_errors').show();



                },
            })
        }

$(function(){

    // ADD custom validator methods ****************************
    $.validator.addMethod('validDuration', function(value, element){
        return this.optional(element) || /^[\d]{1,2}:[\d]{1,2}:[\d]{1,2}$/.test(value)
    }, 'Your specified Duration is invalid.')

    // set any defaults
    $.validator.setDefaults({
        //debug: true,

        // add class to error labels
        errorClass: 'form-error',

        // add class to error'd input fields
        highlight: function(element){
            $(element).addClass('has_error')
        },

        // remove highlight class from editor fields
        unhighlight: function(element){
            $(element).removeClass('has_error')
        },

    });


});


// define custom validation rules for the Module form fields
var custom_validator_rules = {
        'name': {
                required: true,
                minlength: 4,
                messages: {
                    required: "Name is required.",
                    minlength: "Please enter at least 4 characters.",
                },
            },

        'duration': {
                required: true,
                validDuration: true,
                messages: {
                    required: "Duration is required.",
                    validDuration: "Specified duration is invalid, please double check your input formatting."
                },
            },
    }

custom_validator_messages = {
    'name': {
            required: "Name is required.",
            minlength: "Please enter at least 4 characters.",
        },
    'duration':{
            required: "Duration is required.",
            validDuration: "Specified duration is invalid, please double check your input.",
        }

}

// if there are already inputs populated on the form, add validation rules to these elements
function initialize_existing_validation(){
    $('#post-new-module').find('input#id_name').rules('add', custom_validator_rules['name']);

    $('#post-new-module').find('input[name$="-name"]').each(function(){
        $(this).rules('add', custom_validator_rules['name']);
    });

    $('#post-new-module').find('input[name$="-duration"]').each(function(){
        $(this).rules('add', custom_validator_rules['duration']);
    });
}

$(function(){

    // modify the checkForm method of jquery validate to handle same name elements
    //      ensures that each element with same name is checked in validation
    //
    $.validator.prototype.checkForm = function(){

        this.prepareForm();
        for (var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++) {
            if (this.findByName(elements[i].name).length !== undefined && this.findByName(elements[i].name).length > 1) {
                for (var cnt = 0; cnt < this.findByName(elements[i].name).length; cnt++) {
                    this.check(this.findByName(elements[i].name)[cnt]);
                }
            } else {
                this.check(elements[i]);
            }
        }
        return this.valid();
    }

    // ADD custom validator methods ****************************
    $.validator.addMethod('validDuration', function(value, element){
        return this.optional(element) || /^[\d]{1,2}:[\d]{1,2}:[\d]{1,2}$/.test(value)
    }, 'Your specified Duration is invalid.')


    // END custom validator methods ****************************


    // set any defaults
    $.validator.setDefaults({
        //debug: true,
        errorClass: 'form-error',
        highlight: function(element){
            $(element).addClass('has_error')
        },

        unhighlight: function(element){
            $(element).removeClass('has_error')
        },

        // doesn't keep the correct number of invalid fields, due to same-name problem
        invalidHandler: function(event, validator) {

            var errors = validator.numberOfInvalids();
            if (errors) {
              $("#module_form_error_message").html('Submission failed! Please correct the highlighted errors below!');
              $("#module_form_error_message").show();
            } else {
              $("#module_form_error_message").hide();
            }
        },

        // due to the construction of the form
        //  there are duplicate names/id's marking the field until submissions
        //  are processed by the FormManager
        //      -   to ensure that each validation field has it's own label
        //          showErrors must be overwritten to process highlighting/unhighlighting
        //          and adding of error messages
        showErrors: function(errorMap, errorList) {

            // errorlist is an array of currently validated elements
            // each object contains element and message

            // for each error element call highlight, and add/update-text of the error label
           for(var i=0; i < errorList.length; i++){

                this.settings.highlight.call( this, errorList[i].element );
                var current_error_label = $(errorList[i].element).parent().find('label.'+ this.settings.errorClass)

                if(current_error_label.length){
                    $(current_error_label).html(errorList[i].message)
                }else{
                    var new_message_element = $('<label>', {'class': this.settings.errorClass}).html(errorList[i].message)
                    $(errorList[i].element).parent().append(new_message_element)
                }
           }

            // for each valid element, remove any existing error label, and call unhighlight
            for (var i = 0, elements = this.validElements(); elements[i]; ++i) {
                var current_error_label = $(elements[i]).parent().find('label.'+ this.settings.errorClass)

                if(current_error_label.length){
                    $(current_error_label).remove()
                }

                // call unhighlight for each valid element
                this.settings.unhighlight.call(this, elements[i], this.settings.errorClass, this.settings.validClass);
            }

        },

    });



    $('#post-new-module').validate({
        ignore: "",
        rules: custom_validator_rules,
        messages: custom_validator_messages,

        submitHandler: function(form){

            console.log('Submitting new module');
            form_action = $(form).attr('action')
            form_data = FormManager.generate_post_data()
            //Manage_View_Stack.refresh_top_view(form_data)

             $.ajax({
                url: form_action,
                type: "post",
                data: form_data,

                success: function(response){


                    // if form submission was valid, redirect to the provided redirect url
                    if(response.success){
                        console.log('success')
                        if(response.data.redirect_url){
                            window.location.replace(response.data.redirect_url);
                        }

                    }else{
                        // otherwise parse the provided error list
                        // and display messages where appropriate
                        console.log('invalid')



                        // output the errors to the message container and forms themselves
//                        $('#module_form_error_message').html(JSON.stringify(response.data))
//                        $('#module_form_error_message').show()
//
                        FormManager.populate_errors(response.data)


                    }

                },

                error: function(data){

                    $('#module_form_error_message').html('There was an error processing your submitted form! Please try again later.')
                    $('#module_form_error_message').show()



                },
            })




        }
    });




});


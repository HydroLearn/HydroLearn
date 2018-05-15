/*
    Author: Cary Rivet
    (Django 1.11 extension)
    Object for controlling the adding of forms custom formsets
        - Handles DOM manipulation of adding forms to formsets
        - Generates the display objects for forms
        - Handles form submission
        - Utilizes CSS classes and html attributes for constructing dynamic formset

    Description of custom HTML attributes and css classes used for definition
        HTML Attributes:
            - FM-Type -     the type of object represented by a formset-header

            - FM-Prefix -   taking advantage of django's template language, automatically
                            updates once added in place to become the unique identifier for
                            the formset instances

            - FM-Parent -   marks the parent type of a formset for nested formsets

            - FM-Index -    the index of an FM_Form instance, used for updating prefixes and
                            keeping track of creation order.

        CSS classes:

            - FM_formset_header -   the header definition for a formset, contains the markup
                                    to be displayed before each instance of a formset.
                                    typically including a 'FM_add_form' buttons.
                                    header is expected to have FM-Type/FM-Prefix attributes.
                                    ADDITIONALLY: formset headers are expected to contain
                                        the 'FM_mgmt_form' for the formset

                                    upon initialization, FormManager will add a child
                                    'FM_formset_forms' object which will hold the child forms
                                    for each individual formset.


            - FM_empty_form -   the empty form for a given object type. expected to contain
                                the django supplied empty form for a formset type.

            - FM_formset -      the 'in form' placement of a given formset. used to house an
                                instance of a formset and it's added forms. Can also be included
                                in an empty form, and supplied an 'FM-parent' for keeping track
                                of nested formsets
                                expected to have FM-type/FM-prefix attributes

            - FM_add_form -     class given to header 'add form' buttons automatically binds
                                click event for adding an empty form instance to a formset.
                                these elements can also be supplied an FM-poly-type attribute
                                for handling of polymorphic models.


*/

var FormManager = {

    form_selector: '',
    _post_formset_init_events: {},   // dictionary of methods to run after initializing a formset indexed by form-type
    _post_form_add_events: {},   // dictionary of methods to run after adding a form to a formset indexed by form-type

    formset_header_templates: {},  // dictionary of formset headers indexed by object type
    empty_form_templates: {},


    init: function(form_selector, is_bound){

        if(!!!form_selector)
            throw new Error('A form selector not specified when initializing the FormManager.')
        else
            this.form_selector = form_selector

        if(typeof is_bound == 'undefined') is_bound = true

        // collect the formset headers, store them, and remove them from the DOM
        //      (the nested mgmt forms may mess with the functionality otherwise)
        $('.FM_formset_header:not(.FM_instance)').each(function(){

            var header_type = $(this).attr('FM-Type')
            var header_prefix = $(this).attr('FM-Prefix')

            // throw errors if this header definition doesn't has the required attributes
            if(!!!header_type || (!!header_type && header_type == "")) throw new Error('A FM_formset_header was supplied without a specified type.')
            if(!!!header_prefix|| (!!header_prefix && header_prefix == "")) throw new Error('A FM_formset_header was supplied without a specified prefix.')

            // check if the managment form has been supplied by looking for nested
            // id_..._TOTAL-FORMS object
            if(!$(this).find('#id_'+ header_prefix +'-TOTAL_FORMS').length){
                throw new Error(
                        'Managment_form for formset header of type "' + header_type + '" could not be found '+
                        'Please double-check that this management_form has been added to the FM_formset_header definition'
                    )
            }


            FormManager.formset_header_templates[header_type] = $(this)
            $(this).remove()
        })

        // collect the empty forms, store them, and remove them from the DOM
        //      (the nested mgmt forms may mess with the functionality otherwise)
        $('.FM_empty_form').each(function(){
            var form_type = $(this).attr('FM-Type')
            var poly_type = $(this).attr('FM-poly-type')

            if(!!!form_type || (!!form_type && form_type == "")) throw new Error('A FM_empty_form was supplied without a specified type.')

            // account for polymorphic form types
            if(!!poly_type){
                FormManager.empty_form_templates[form_type + "__" + poly_type] = $(this)
            }else{
                FormManager.empty_form_templates[form_type] = $(this)
            }

            $(this).remove()
        })


        // collect the formset prefixes from the FM_formset_wrappers
        $('.FM_formset:not(.FM_initialized)').each(function(){
            var formset_type = $(this).attr('FM-Type')
            var formset_prefix = $(this).attr('FM-Prefix')
            var formset_mgmt_form = $(this).children('.FM_mgmt_form')

            // throw errors if this header definition doesn't has the required attributes
            if(!!!formset_type || (!!formset_type && formset_type == "")) throw new Error('A FM_formset was supplied without a specified type.')
            if(!!!formset_prefix || (!!formset_prefix && formset_prefix == "")) throw new Error('A FM_formset was supplied without a specified prefix.')


            FormManager.initialize_formset($(this), is_bound);
        })

    },

    initialize_formset: function(formset_element, is_bound){
        if(!!!is_bound) is_bound = false

        // get this formset's type and prefix
        var formset_type = formset_element.attr('FM-Type')
        var formset_prefix = formset_element.attr('FM-Prefix')
        var formset_header = FormManager.get_formset_header_of_type(formset_type)

        // check for existing Managment form/fieldset errors for this fieldset
        var formset_mgmt_form = formset_element.children('.FM_mgmt_form')
        var formset_errors = formset_element.children('.FM_formset_errors')


        //$(empty_form).find('.FM_formset_errors') replaceWith(formset_errors)
        // collect any provided formset_forms
        var formset_forms = formset_element.children('.FM_formset_forms[FM-type='+ formset_type+']')

        // determine if this formset has a parent
        var has_parent = (!!formset_element.attr('FM-parent'))

        // update the new header's prefix to the declared formset prefix
        formset_header.attr('FM-prefix', formset_prefix)

        // replace header's empty mgmt form with instantiation
        if(formset_mgmt_form.length){
            formset_header.children('.FM_mgmt_form').replaceWith(formset_mgmt_form)
        }

        // replace header's empty errors with instantiation
        if(formset_errors.length){
            formset_header.children('.FM_formset_errors').replaceWith(formset_errors)
        }

        formset_header.addClass('FM_instance')

        // create the forms container for the formset and add it to the instantiated header
        var forms_container_attrs = {
                'class': 'FM_formset_forms',
                'FM-Type': formset_type,
                'FM-Prefix': formset_prefix,
            }

        var forms_container = $('<div>', forms_container_attrs)


        // for each of the provided forms of this type,
        // instantiate it's empty form and replace the content
        $(formset_forms).children('.FM_form[FM-type='+ formset_type + ']').each(function(){
            var form_content = $(this).children('.FM_form_content')
            var form_content = $(this).children('.FM_form_content')

            var form_poly_type = $(this).attr('FM-poly-type')
            var empty_form_instance = FormManager.get_empty_form_of_type(formset_type, form_poly_type)


            // if this formset is unbound, treat as empty form, but populate provided values

//            if(!is_bound){
//                debugger;
//                // mark as new empty form
//                $(empty_form_instance).addClass('FM_new_form')
//
//                populated_fields = $(form_content).find('input')
//                empty_fields = $(empty_form_instance).find('input')
//
//                $(empty_fields).each(function(index){
//                    $(this).val($(populated_fields[index]).val())
//                })
//
//            }else{
                // if formset is bound, just add in the content directly
                $(empty_form_instance).find('.FM_form_content').replaceWith(form_content)

            //}


            // mark this form as non-empty
            $(empty_form_instance).removeClass('FM_empty_form')
            $(empty_form_instance).addClass('FM_form')



            // set up the 'remove' button click event
            $(empty_form_instance).find('.FM_remove_form').click(FormManager.remove_form_event)

            forms_container.append(empty_form_instance)

            // remove the placeholder form definition since now being represented in
            // the instantiated header
            $(this).remove();

        });

        // now that the formset forms have been processed, remove from DOM
        formset_forms.remove();

        formset_header.append(forms_container)

        formset_header.prependTo(formset_element)

        formset_header.show()

        // set click events for each 'polymorphic' add button declared for this object
        formset_header.find('.FM_add_form[FM-Type=' + formset_type +']').each(function(){
            // allow for polymorphic forms, this assumes an empty form for each
            // polymorphic type exists in the markup, with a FM-poly-type attribute
            var polymorphic_type = $(this).attr('FM-poly-type')
            var event_args = {
                FM_type:formset_type,
                FM_prefix:formset_prefix,
                FM_poly_type:polymorphic_type
            }

            $(this).click(event_args, FormManager.add_form_btn_event)

        })

        formset_element.addClass('FM_initialized')

        FormManager._perform_post_formset_init_event(formset_type)
    },

    get_formset_header_of_type: function(formset_type){

        if(!!!FormManager.formset_header_templates[formset_type]) throw new Error('FM_formset_header of FM-type "' + formset_type + '" was not supplied')
        return FormManager.formset_header_templates[formset_type].clone()

    },

    get_empty_form_of_type: function(formset_type, polymorphic_type){
        // if there is a polymorphic type passed, be sure to get the correct type instance
        var empty_form_id = (!!polymorphic_type)? formset_type + "__" + polymorphic_type : formset_type;

        if(!!!FormManager.empty_form_templates[empty_form_id]) throw new Error('FM_empty_form of FM-type "' + empty_form_id + '" was not supplied')

        return FormManager.empty_form_templates[empty_form_id].clone()
    },

    form_count: function(formset_prefix, formset_type){

        return $('.FM_formset_forms[FM-Prefix='+ formset_prefix +']').find('.FM_form[FM-Type='+ formset_type +']').length
    },


    add_form_btn_event: function(event){

        var formset_type = event.data.FM_type
        var formset_prefix = event.data.FM_prefix
        var polymorphic_type = event.data.FM_poly_type // if normal form, this will be undefined. no harm, no foul

        //var forms_container_selector = '.FM_formset_forms[FM-Prefix="'+ formset_prefix +'"]'

        // get the forms container (assumes this button is included in the formset, most likely in header)
        var formset_header = $(this).closest('.FM_formset_header[FM-Type="'+ formset_type +'"]')
        var formset_mgmt_form = formset_header.children('.FM_mgmt_form')
        var forms_container = formset_header.children('.FM_formset_forms')



        var form_count = FormManager.form_count(formset_prefix, formset_type)
        var is_nested = (!!forms_container.closest('.FM_formset_header').attr('FM-Parent'))

        //  create a new form wrapper, append the empty form to it,
        //  and add it to the related FM_formset_forms container
        var new_form_wrapper_attrs = {
                'class': 'FM_form',
                'FM-Type': formset_type,
                //'FM-Index': form_count
            }

        var new_form_wrapper = $('<div>', new_form_wrapper_attrs);

        var new_form = FormManager.get_empty_form_of_type(formset_type, polymorphic_type)

        new_form.removeClass('FM_empty_form')
        new_form.addClass('FM_form')
        new_form.addClass('FM_new_form')

        // add the new form to the end of its wrapper
        //new_form_wrapper.append(new_form)

        // append the new wrapper to the forms container 'FM_formset_forms'
        //forms_container.append(new_form_wrapper);
        forms_container.append(new_form);

        // add the click event to any 'remove form' buttons contained in this form
        $(new_form).find('.FM_remove_form').click(FormManager.remove_form_event)

        // check if the empty form contains a nested child formset
        if(new_form.find('.FM_formset').length > 0){

            // for each nested formset of the new form, initialize the formset header
            new_form.find('.FM_formset').each(function() {
                FormManager.initialize_formset($(this))
            });


        }

        FormManager._perform_post_add_event(formset_type)

    },

    remove_form_event: function(){
        //debugger;
        // TODO: maybe add in a prompt to confirm

        // get the parent form to this delete button
        var form = $(this).closest('.FM_form')


        // if this is a new form, just remove it
        if(form.hasClass('FM_new_form')){
            form.slideUp(function(){
                form.remove();
            });

        }else{
            // otherwise, set the 'DELETE' field for the current form to checked
            //      and hide it. (maybe populate a deleted list for restoring it)
//            var form_content = form.find('.FM_form_content').filter(function(){
//                return $(this).closest('.FM_form').is(form)
//            })


            // find this form's delete field (technically... each child should be deleted too... right?)
            var delete_field = form.find("input[name$='-DELETE']").filter(function(){
                return $(this).closest('.FM_form').is(form)
            })
            //delete_field.show()
            //delete_field.prop('checked', true)
            delete_field.val(true)


            form.addClass('FM_deleted_form')
            // set the delete checkbox to checked
            debugger;





            // animate the removal of the form then actually remove it
            form.slideUp(function(){});
        }




    },

    add_post_formset_init_event: function(formset_type, post_add_event){
        FormManager._post_formset_init_events[formset_type] = post_add_event

    },

    add_post_add_event: function(formset_type, post_add_event){
        FormManager._post_form_add_events[formset_type] = post_add_event

    },

    _perform_post_add_event: function(formset_type){

        // perform specific event defined for this formset
        if(!!FormManager._post_form_add_events[formset_type]){
            FormManager._post_form_add_events[formset_type]()
        }

        // if there are post-add events for all added forms perform them
        if(!!FormManager._post_form_add_events["ALL"]){
            FormManager._post_form_add_events["ALL"]()
        }


    },

    _perform_post_formset_init_event: function(formset_type){

        // perform specific event defined for this formset
        if(!!FormManager._post_formset_init_events[formset_type]){
            FormManager._post_formset_init_events[formset_type]()
        }

        // if there are post-add events for all added forms perform them
        if(!!FormManager._post_formset_init_events["ALL"]){
            FormManager._post_formset_init_events["ALL"]()
        }


    },

    // method to update the prefixes of each formset's mgmt form
    // and the prefixes of each new form added during the session
    // and return a serialized collection of form input values

    generate_post_data: function(){

        // index each input field to copy user input
        var user_inputs = $(this.form_selector).find('input,textarea,select')


        $(user_inputs).each(function(){
            $(this).attr('FM-value', $(this).val().trim())
        })

        // clone the current form to work with (and avoid changing any entered values)
        var form_instance = $(this.form_selector).clone(true)

        // find all initialized top-level formsets in this form
        var formsets = form_instance.find('.FM_formset.FM_initialized').filter(function(){
            return ($(this).parent().closest('.FM_formset.FM_initialized').length == 0)
        })

        // TODO: revise this to handle the actual attribute fields instead of full string replace
        function process_prefixes(level, formset){

            console.log('processing: ' + formset.attr('FM-type') + "-" + level)
            // get this formset's header
            var header = formset.children('.FM_formset_header')

            // get the mgmt_form and forms_container
            var mgmt_form = header.children('.FM_mgmt_form')
            var forms_container = header.children('.FM_formset_forms')
            var forms_count = forms_container.children('.FM_form').length


            // replace this header's mgmt form prefixes
            mgmt_form.html(mgmt_form.html().replace(/([\w-]*?)__prefix__/g, "$1" + level))

            // update the total number of forms in container
            //mgmt_form.find('input[name$="-TOTAL_FORMS"]').val(forms_count)
            mgmt_form.find('input[name$="-TOTAL_FORMS"]').attr('FM-value',forms_count)
//            mgmt_form.find('input[name$="-INITIAL_FORMS"]').attr('FM-value',forms_count)
//            mgmt_form.find('input[name$="-MAX_NUM_FORMS"]').attr('FM-value',forms_count)


            // for each child form in the forms_container
            $(forms_container).children('.FM_form').each(function(form_index){

                // update child form prefixes to contain current formset's instance index
                $(this).html($(this).html().replace(/("[\w-]*?)__prefix__/g, "$1" + form_index))


                // get any nested formsets in this form
                var nested_formsets = $(this).find('.FM_formset.FM_initialized').filter(function(){
                    return ($(this).parent().closest('.FM_formset.FM_initialized').is(formset))
                })

                // if this form has a nested formsets process them as well
                $(nested_formsets).each(function(){
                    process_prefixes(form_index, $(this))
                })
            })
        }


        $(formsets).each(function(index){
            process_prefixes(0, $(this))
        })

        cloned_inputs = $(form_instance).find('input,textarea,select')

        $(cloned_inputs).each(function(index){

            $(this).val($(this).attr('FM-value'))
        })

        return form_instance.serialize()

    },

    // WARNING : this is not as dynamic as it needs to be, and only handles a single chain of formsets
    populate_errors: function(error_collection){
        $('.form_error_container').hide()

        if(!!error_collection){

            // errors are going to be a dictionary mapping
            // fieldname -> list of error objects containing an error message
            var errors = JSON.parse(error_collection.errors)
            var error_list = this.generate_error_list(errors)

            $('#module_form_error_message').html('There was an error processing your submitted form!')

            $('#module_form_error_message').append(error_list)

            $('#module_form_error_message').show()

            //will need to find FM_forms based on hierarchy
            // grab FM_form_errors container

            child_formset = $(this.form_selector).find('.FM_formset.FM_initialized').first()
            this._populate_formset_errors(child_formset, error_collection.formset)

        }




    },

    generate_error_list: function(error_object){
        // error_object is expected to be an object mapping field names
        //      to a list of that field's errors


        // if this error object is empty return an empty string
        if(Object.keys(error_object).length == 0) return ""

        // otherwise generate the error list
        var error_list_wrapper = $("<ul>", {'class': 'error_message_list'})
        $.each(error_object, function(field_name, field_errors){
            var error_list_item = $("<li>")
            $.each(field_errors, function(index, error){
                error_list_item.append(error.message)
                error_list_item.append('<br/>')
            })
            error_list_wrapper.append(error_list_item)
        })

        return error_list_wrapper
    },

    _populate_formset_errors: function(formset_object, formset_errors){

        var forms = formset_object.find('.FM_form').filter(function(){
            return ($(this).closest('.FM_formset.FM_initialized').is(formset_object))
        })

        $(forms).each(function(index){
            var error_container = $(this).find('.FM_form_errors').filter(function(){
                return $(this).closest('.FM_form').is(forms[index])
            })

            var error_list_obj = FormManager.generate_error_list(JSON.parse(formset_errors[index].errors))

            if(error_list_obj != ""){
                error_container.html(error_list_obj)
                error_container.show()
            }

            if(!!formset_errors[index].formset){
                child_formset = $(forms[index]).find('.FM_formset.FM_initialized').first()
                FormManager._populate_formset_errors(child_formset, formset_errors[index].formset)
            }

        })


    },
}


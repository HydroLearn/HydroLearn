/*
    Author: Cary Rivet
    Revision: 2

    (Django 1.11 extension)
    Object for controlling the adding of forms custom formsets
        - Handles DOM manipulation of adding forms to formsets
        - Generates the display objects for forms
        - Handles form submission
        - Utilizes CSS classes and html attributes for constructing dynamic formset

    For any given formset type the user will define a single
        - 'FM-formset-header'
        - 'FM-empty-form'
            - if the formset is over a polymorphic model, there must be a seperate empty-form for
                each type and specify a 'FM-poly-type' attribute for each unique form type
                the system should handle the rest


    typical expected structure after initialization is as follows:

        FM_formset(type, supplied_prefix)
            |
            |_> FM_formset_header(type, base_prefix),   [copy of initial header]
                |
                |_> FM_formset_errors, i.e. non_form_errors
                |_> FM_mgmt_form, i.e. formset's management form
                |_> FM_formset_forms (type)
                    |_> FM_form (type),                 [copy of empty_form]
                            |_> FM_form_content
                                    |_> FM_form_errors
                                    |_> child 'FM_formset's

    Description of custom HTML attributes and css classes used for definition
        HTML Attributes:
            - FM-Type -     the type of object represented by a formset-header

            - FM-Prefix -   taking advantage of django's template language, automatically
                            updates once added in place to become the unique identifier for
                            the formset instances

            - FM-poly-type- the polymorphic type of a form


        CSS classes:

            - FM_formset_header -   the header definition for a formset, contains the markup
                                    to be displayed before each instance of a formset.
                                    typically including a 'FM_add_form' buttons.
                                    header is expected to have FM-Type/FM-Base-Prefix attributes.

                                    ADDITIONALLY: formset headers are expected to contain
                                        the a 'FM_mgmt_form' container for the base formset

                                    upon initialization, FormManager will add a child
                                    'FM_formset_forms' object which will hold the child forms
                                    for each individual formset.


            - FM_empty_form -   the empty form for a given object type. expected to contain
                                the expected markup for a form of specified type.

            - FM_formset -      the 'in form' placement of a given formset. used to house an
                                instance of a formset and it's added forms. Can also be included
                                in an empty form expected to have the following attributes:
                                    - FM-type
                                    - FM-prefix provided from existing forms (i.e. pulled in from database)


            - FM_add_form -     class given to header 'add form' buttons automatically binds
                                click event for adding an empty form instance to a formset.
                                these elements can also be supplied an FM-poly-type attribute
                                for handling of polymorphic models.


*/

var FormManager = {

    form_selector: '',
    _post_formset_init_events: {},  // dictionary of methods to run after initializing a formset indexed by form-type
    _post_form_add_events: {},      // dictionary of methods to run after adding a form to a formset indexed by form-type

    formset_header_templates: {},   // dictionary of formset headers indexed by object type
    empty_form_templates: {},       // dictionary of empty forms indexed by object type

    /*****************************************************
                INITIALIZATION
    *****************************************************/
    init: function(form_selector){

        if(!!!form_selector)
            throw new Error('A form selector not specified when initializing the FormManager.')
        else
            this.form_selector = form_selector

        // collect the formset headers, store them, and remove them from the DOM
        //      (the nested mgmt forms may mess with the functionality otherwise)
        $('.FM_formset_header:not(.FM_instance)').each(function(){

            // get the header's associated type and ensure it was provided
            var header_type = $(this).attr('FM-Type')
            if(!!!header_type || (!!header_type && header_type == "")) throw new Error('A FM_formset_header was supplied without a specified type.')

            // get the headers specified base prefix, and ensure it was provided
            var header_prefix = $(this).attr('FM-Base-Prefix')
            if(!!!header_prefix|| (!!header_prefix && header_prefix == "")) throw new Error('A FM_formset_header for, '+ header_type + ', was supplied without a specified prefix.')

            // check if the managment form has been supplied by looking for nested
            // id_..._TOTAL-FORMS object
            if(!$(this).find('#id_'+ header_prefix +'-TOTAL_FORMS').length){
                throw new Error(
                        'Managment_form for formset header of type "' + header_type + '" could not be found '+
                        'Please double-check that this management_form has been added to the FM_formset_header definition'
                    )
            }

            // store mgmt form values in data attribute for submission later
            // trim any values avoid storing excess white-space
            $(this).children('.FM_mgmt_form').find('input').each(function(){
                $(this).attr('FM-value', $(this).val().trim())
            })

            // store this header
            FormManager.formset_header_templates[header_type] = $(this)

            // remove header template from DOM
            $(this).remove()
        })

        // collect the empty forms, store them, and remove them from the DOM
        //      (the nested mgmt forms may mess with the functionality otherwise)
        $('.FM_empty_form').each(function(){
            var form_type = $(this).attr('FM-Type')
            var poly_type = $(this).attr('FM-poly-type')

            if(!!!form_type || (!!form_type && form_type == "")) throw new Error('A FM_empty_form was supplied without a specified type.')

            // store the empty form template for each type for each form type
            if(!!poly_type){
                // if polymorphic store in the form '[type]__[polymorphic-type]'
                FormManager.empty_form_templates[form_type + "__" + poly_type] = $(this)
            }else{
                FormManager.empty_form_templates[form_type] = $(this)
            }
            //debugger;
            // remove the empty-form template from the DOM
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


            FormManager.initialize_formset($(this));
        })

    },

    initialize_formset: function(formset_element){

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
        // TODO: this needs to be deterministic (i.e. look for this header,
        //var has_parent = (!!formset_element.attr('FM-parent'))


        // potentially DEPRECIATED
        // update the new header's prefix to the declared formset prefix
        //formset_header.attr('FM-prefix', formset_prefix)

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
                //'FM-Prefix': formset_prefix,
            }

        var forms_container = $('<div>', forms_container_attrs)


        // for each of the provided forms of this type,
        // instantiate it's empty form and replace the content
        $(formset_forms).children('.FM_form[FM-type='+ formset_type + ']').each(function(){

            var form_content = $(this).children('.FM_form_content')
            var form_poly_type = $(this).attr('FM-poly-type')

            //debugger;
            var empty_form_instance = FormManager.get_empty_form_of_type(formset_type, form_poly_type)

            // if formset is bound, just add in the content directly
            $(empty_form_instance).find('.FM_form_content').replaceWith(form_content)

            // mark this form as non-empty
            $(empty_form_instance).removeClass('FM_empty_form')
            $(empty_form_instance).addClass('FM_form')

            // set up the 'remove' button click event
            $(empty_form_instance).find('.FM_remove_form').click(FormManager._remove_form_event)

            // set any applicable click events for sorting
            var move_up_button = $(empty_form_instance).find('.FM-sort-up')
            if(move_up_button.length > 0){
                move_up_button.click(FormManager._move_form_up)
                move_up_button.attr('title', 'Move Up')
            }

            var move_down_button = $(empty_form_instance).find('.FM-sort-down')
            if(move_down_button.length > 0){
                move_down_button.click(FormManager._move_form_down)
                move_down_button.attr('title', 'Move Down')
            }

            $(empty_form_instance).find('.FM-sorting-handle').attr('title', 'Move Form (click and drag)')

            FormManager.init_linked_labels(empty_form_instance)

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
        //debugger

        //TODO: this is only expecting an add button for this formset type
        //formset_header.find('.FM_add_form[FM-Type=' + formset_type +']').each(function(){
        formset_header.find('.FM_add_form[FM-type='+ formset_type + ']').each(function(){
            //debugger;
            // allow for polymorphic forms, this assumes an empty form for each
            // polymorphic type exists in the markup, with a FM-poly-type attribute
            var polymorphic_type = $(this).attr('FM-poly-type')
            var event_args = {
                FM_type:formset_type,
                FM_prefix:formset_prefix,
                FM_poly_type:polymorphic_type
            }

            $(this).click(event_args, FormManager._add_form_btn_event)

        })

        FormManager.init_container_sortability(forms_container)

        formset_element.addClass('FM_initialized')

        FormManager._perform_post_formset_init_event(formset_type)
    },

    init_container_sortability: function(forms_container){

        // add sortable functionality to the forms container
        $(forms_container).sortable({
            items: ".FM_form[fm-type='"+ forms_container.attr('fm-type') +"']",
            placeholder: "ui-state-highlight",
            start: function(e, ui){
                    // set the placeholder's height to be the current item height
                    //  helps with visual representation
                    ui.placeholder.height(ui.item.height());
                },
            handle: ".FM-sorting-handle",
            helper : 'clone',
            update: FormManager._formset_sorted_evt
        })

    },

    init_linked_labels: function(form){

        // grab all linked labels in this form
        var linked_label = $(form).find('.FM_linked_label').filter(function(){
                return $(this).closest('.FM_form').is(form)
            })

        // for each linked label set up the update events on input change
        $.each(linked_label, function(index, label_obj) {

            // get the specified selector for input object we're listening for
            var linked_input_selector = $(label_obj).attr('FM-linked-selector')

            // if found
            if(linked_input_selector){

                // get the linked input on the current form
                var linked_input = $(form).find(linked_input_selector).filter(function(){
                    return $(this).closest('.FM_form').is(form)
                })

                // if the linked input has a value, update the label
                if(linked_input.val()){
                    linked_label.html(linked_input.val())
                }else{
                    // otherwise set label text to specified default value
                    var default_value = linked_label.attr('fm-label-default')
                    linked_label.html((default_value? default_value: "no default specified"))
                }
                //debugger;
                // listen for change event on input label to trigger label update
                $(linked_input).on('change', { 'linked_label': linked_label}, FormManager._linked_input_changed_evt)

                // listen for update signal on the label
                $(linked_label).on('update_linked_labels', FormManager._update_linked_labels)
            }else
                throw new Error('A linked label was specified without a "FM-linked-selector" attribute.')
        });



    },

    /*****************************************************
                METHODS
    *****************************************************/

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

//      DEPRECIATED
//    form_count: function(formset_prefix, formset_type){
//        // TODO: this should be revised to check a parent container's forms of type
//        return $('.FM_formset_forms[FM-Prefix="'+ formset_prefix +'"]').find('.FM_form[FM-Type="'+ formset_type +'"]').length
//    },

    move_form_up: function(form){
        var prev_form = $(form).prev('.FM_form[fm-type="'+form.attr('fm-type') +'"]')

        if (prev_form.length > 0){
            $(form).fadeOut(function(){
                $(form).insertBefore(prev_form)
                FormManager.update_positions($(form).closest('.FM_formset_forms'))
                $(form).fadeIn(400)
            })

        }


    },

    move_form_down: function(form){
        var next_form = $(form).next('.FM_form[fm-type="'+form.attr('fm-type') +'"]')

        if (next_form.length > 0){
            $(form).fadeOut(function(){
                $(form).insertAfter(next_form)
                FormManager.update_positions($(form).closest('.FM_formset_forms'))
                $(form).fadeIn(400)
            })
        }

    },

    // set the values for 'position' for each form of a passed formset, based on current position
    update_positions: function(formset){
        // get the list of forms associated with this formset from jquery-ui sortable
        child_forms = formset.children('.FM_form')

        // update the position value for each of the child forms for the current sortable
        $.each(child_forms, function(index, child){
            $(child).find('[id$="-position"]').first().val(index)
        })
    },

    /*****************************************************
                EVENTS
    *****************************************************/

    // form order sorted event (sortable plugin event)
    _formset_sorted_evt: function(event, ui){
        FormManager.update_positions($(this))

    },

    _move_form_up: function(event){
        event.stopPropagation();
        FormManager.move_form_up($(this).closest('.FM_form'))
    },

    _move_form_down: function(event){
        event.stopPropagation();
        FormManager.move_form_down($(this).closest('.FM_form'))
    },

    _add_form_btn_event: function(event){
        //debugger;
        var formset_type = event.data.FM_type
        var formset_prefix = event.data.FM_prefix
        var polymorphic_type = event.data.FM_poly_type // if normal form, this will be undefined. no harm, no foul

        // get the forms container (assumes this button is included in the formset, most likely in header)
        var formset_header = $(this).closest('.FM_formset_header[FM-Type="'+ formset_type +'"]')
        var formset_mgmt_form = formset_header.children('.FM_mgmt_form')
        var forms_container = formset_header.children('.FM_formset_forms')

        var new_form = FormManager.get_empty_form_of_type(formset_type, polymorphic_type)

        new_form.removeClass('FM_empty_form')
        new_form.addClass('FM_form')
        new_form.addClass('FM_new_form')

        // set any applicable click events for sorting
        var move_up_button = new_form.find('.FM-sort-up')
        if(move_up_button.length > 0){
            move_up_button.click(FormManager._move_form_up)
            move_up_button.attr('title', 'Move Up')
        }

        var move_down_button = new_form.find('.FM-sort-down')
        if(move_down_button.length > 0){
            move_down_button.click(FormManager._move_form_down)
            move_down_button.attr('title', 'Move Down')
        }

        new_form.find('.FM-sorting-handle').attr('title', 'Move Form (click and drag)')

        FormManager.init_linked_labels(new_form)

        // append the new wrapper to the forms container 'FM_formset_forms'
        forms_container.append(new_form);

        FormManager.update_positions(forms_container);

        // add the click event to any 'remove form' buttons contained in this form
        $(new_form).find('.FM_remove_form').click(FormManager._remove_form_event)

        // check if the empty form contains a nested child formset
        if(new_form.find('.FM_formset').length > 0){

            // for each nested formset of the new form, initialize the formset header
            new_form.find('.FM_formset').each(function() {
                FormManager.initialize_formset($(this))
            });


        }

        // perform any supplied 'post-add' events for this form type
        FormManager._perform_post_add_event(formset_type)

    },

    _remove_form_event: function(){
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

            // find this form's delete field (technically... each child should be deleted too... right?)
            var delete_field = form.find("input[name$='-DELETE']").filter(function(){
                return $(this).closest('.FM_form').is(form)
            })

            delete_field.val(true)

            form.addClass('FM_deleted_form')

            // animate the removal of the form then actually remove it
            form.slideUp(function(){});
        }




    },

    _linked_input_changed_evt: function(event){
        //debugger;
        $(event.data.linked_label).trigger('update_linked_labels', [$(event.currentTarget).val()])
    },

    _update_linked_labels: function(event, new_val) {
        //debugger;
        $(event.currentTarget).html(new_val)
    },

    /*****************************************************
                CUSTOM USER-ADDED EVENTS
    *****************************************************/
    add_post_formset_init_event: function(formset_type, post_add_event){
        FormManager._post_formset_init_events[formset_type] = post_add_event

    },

    add_post_add_event: function(formset_type, post_add_event){
        FormManager._post_form_add_events[formset_type] = post_add_event

    },


    /*****************************************************
                INTERNAL FUNCTIONALITY
    *****************************************************/
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

    // method to update the prefixes of each formset's mgmt form
    // and the prefixes of each new form added during the session
    // and return a serialized collection of form input values

    generate_post_data: function(){

        // index each input field to copy user input
        var user_inputs = $(this.form_selector).find('input,textarea,select')//.filter(function(){return !($(this).parent().hasClass('FM_mgmt_form'))});

        // trim any values avoid storing excess white-space
        $(user_inputs).each(function(){
            $(this).attr('FM-value', $(this).val().trim())
        })

        // get header mgmt form fields indexed by type to be instantiated for new formsets
//        var mgmt_fields = {}
//        $.each(FormManager.formset_header_templates, function(type, body){
//            mgmt_fields[type] = $(body).find('input')
//        });


        // clone the current form to work with (and avoid changing any entered values)
        var form_instance = $(this.form_selector).clone(true)

        // find all initialized top-level formsets in this form
        var formsets = form_instance.find('.FM_formset.FM_initialized').filter(function(){
            return ($(this).parent().closest('.FM_formset.FM_initialized').length == 0)
        })



        // potentially this will work, but may have to return a new element
        function replace_field_prefix(input_field, formset_prefix){

            // get the field name
            var field = $(input_field).attr('name').split('-').pop()

            // update the id/name fields with the provided prefix
            $(input_field).attr('id', "id_{0}-{1}".format(formset_prefix, field))
            $(input_field).attr('name', "{0}-{1}".format(formset_prefix, field))
        }



        function get_formset_prefix(formset){

            // if there's already a prefix for this formset, it existed, use it
            var prefix = formset.attr('FM-Prefix')
            var prefix_set = (typeof(prefix) != 'undefined' && prefix != false)
            if( prefix_set && prefix != "") return prefix;

            // reaching this point, this is a 'new' formset

            // get supplied header's base-prefix, and check for a parent formset
            var base_prefix = formset.children('.FM_formset_header').attr('FM-Base-Prefix')
            var parent_formset = formset.parent().closest('.FM_formset')

            // if there is a parent formset, need to generate a valid prefix
            if(parent_formset.length > 0){
                // if there is a parent formset, then this formset is part of a form
                // determine it's index amongst it's siblings

                var parent_form_collection = $(parent_formset).children('.FM_formset_header').children('.FM_formset_forms');
                var parent_form = formset.closest('.FM_form')

                // TODO: needs to change...
                var form_index = parent_form_collection.children('.FM_form').index(parent_form)

                // this is a clone so we can update formsets without affecting future runs
                // index is [num of existing forms] + [index of new]
                formset.attr('FM-Prefix', "{0}-{1}-{2}".format(get_formset_prefix(parent_formset), form_index, base_prefix))
                return formset.attr('FM-Prefix')

                //return "{0}-{1}-{2}".format(get_formset_prefix(parent_formset), form_index, base_prefix)
            } else {

                // this is a clone so we can update formsets without affecting future runs
                // update the formset's supplied prefix for future passes and return it
                formset.attr('FM-Prefix', base_prefix)
                return formset.attr('FM-Prefix')

                //return base_prefix
            }

        }


        // TODO: revise this to handle the actual attribute fields instead of full string replace
        function process_prefixes(level, formset){

            console.log('processing: ' + formset.attr('FM-type') + "-" + level)

            var formset_type = formset.attr('FM-Type')

            // get this formset's header
            var header = formset.children('.FM_formset_header')


            // get the mgmt_form and forms_container
            var mgmt_form = header.children('.FM_mgmt_form')
            var forms_container = header.children('.FM_formset_forms')
            var forms_count = forms_container.children('.FM_form').length

            // get this formset's prefix
            var formset_prefix = get_formset_prefix(formset);

            // TODO: issue: this will not have inital values for mgmt fields
            // update mgmt form for this formset

            if(mgmt_form.html().trim() == ""){

                // if this formset's mgmt form is blank, it's new, populate it from the header-template
                var cloned_children = FormManager.formset_header_templates[formset_type].children('.FM_mgmt_form').clone().children()
                mgmt_form.append(cloned_children)
                $.each(mgmt_form.children(), function(){
                    replace_field_prefix($(this),formset_prefix);
                })

            }


            // otherwise this formset is already instantiated, just update 'TOTAL-FORMS'
            debugger;
            mgmt_form.find('input[name$="-TOTAL_FORMS"]').attr('FM-value',forms_count)

            // update input field name/ids for form fields


//            // replace this header's mgmt form prefixes
//            mgmt_form.html(mgmt_form.html().replace(/([\w-]*?)__prefix__/g, "$1" + level))
//
//            // update the total number of forms in container
//            // mgmt_form.find('input[name$="-TOTAL_FORMS"]').val(forms_count)
//            mgmt_form.find('input[name$="-TOTAL_FORMS"]').attr('FM-value',forms_count)
//            // mgmt_form.find('input[name$="-INITIAL_FORMS"]').attr('FM-value',forms_count)
//            // mgmt_form.find('input[name$="-MAX_NUM_FORMS"]').attr('FM-value',forms_count)

            // update mgmt form with prefix


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


}


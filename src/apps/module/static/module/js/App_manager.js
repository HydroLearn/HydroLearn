// define a custom view object for use by the Viewport manager
function APP_VIEW(ViewName, target_container_selector){
    View.call(this, ViewName, target_container_selector)

}
APP_VIEW.prototype = Object.create(View.prototype)

    APP_VIEW.prototype.on_show = function () {
        resize_app_wrapper()
    }

    APP_VIEW.prototype.on_hide = function () {

    }

    APP_VIEW.prototype.post_display = function () {

        setTimeout(resize_app_wrapper, 500)

        var edit_mode = $(this.target).find('.app_ref_editor_wrapper').hasClass('edit_mode')
        // if there is an edit button
        if(edit_mode){
            // by default hide the edit form
            $(this.target).find('.app_ref_form').hide();

            // add toggle view click event to edit button
            $(this.target).find('.app_ref_edit_btn').click(function(evt){

                var wrapper = $(this).closest('.app_ref_editor_wrapper')
                var in_preview = wrapper.find('.app_preview').is(':visible')

                if(in_preview){
                    wrapper.find('.app_preview').fadeOut(function(){
                        wrapper.find('.app_ref_form').fadeIn();
                    })
                }else{
                    wrapper.find('.app_ref_form').fadeOut(function(){
                        wrapper.find('.app_preview').fadeIn();
                        resize_app_wrapper()
                    })
                }
            });
        }

        // initialize the form controls
        var form_wrapper = $(this.target).find('.app_form')

        form_wrapper.find('.Submit_button').unbind('click');
        form_wrapper.find('.Submit_button').click(function(evt){
            evt.preventDefault();

            var form = $(this).closest('form')
            var form_action = form.attr('action')
            var form_method = form.attr('method')
            var form_data = form.serialize()

            form.find('.success_banner').hide()
            form.find('.error_banner').hide()


            $.ajax({
                    url: form_action,
                    type: form_method,
                    method: form_method,
                    data: form_data,

                    success: function(response){

                        if(response.success){
                            form.find('.success_banner').html(response.message);
                            form.find('.success_banner').fadeIn()

                            setTimeout(function(){window.location = window.location.href}, 1000);


                        }else{

                            error_banner =form.find('.error_banner');
                            error_banner.html(response.message);

                            error_banner.append($('<ul>'))

                            errors = JSON.parse(response.data.errors)
                            $.each(errors, function(key,errors){
                                var error_string = $('<li>');
                                error_list = $.map(errors, function(x){return x.message})
                                error_string.html("{0}: {1}".format(key, error_list.join(', ')))
                                error_banner.find('ul').append(error_string)
                            })

                            form.find('.error_banner').fadeIn()

                        }



                    },

                    error: function(response){
                        form.find('.errors').html("There was an error processing your request, Please try again later");
                    },
                })

        })

        form_wrapper.find('.Cancel_button').unbind('click');
        form_wrapper.find('.Cancel_button').click(function(evt){
            evt.preventDefault();
            $(this).closest('.app_ref_editor_wrapper').find('.app_ref_edit_btn ').click();

        })

        form_wrapper.find('.Delete_button').unbind('click');
        form_wrapper.find('.Delete_button').click(function(evt){
            evt.preventDefault();

            // hide the controls while loading
            $('#form-confirmation-confirm').hide()
            $('#form-confirmation-cancel').hide()

            // load the delete form for the current loaded section
            $('#form-confirmation-content').html("Loading Form...")

            // generate the delete url, and get the associated form
            var delete_url = '/editor/app/delete/{0}/{1}'.format(form_wrapper.attr('data-parent-lesson'), form_wrapper.attr('data-id'))

            $('#form-confirmation-content').load(delete_url, function(){

                // after loading show the controls
                $('#form-confirmation-confirm').show()
                $('#form-confirmation-cancel').show()

                // map the confirm button's click action to submit form
                $('#form-confirmation-confirm').unbind('click');
                $('#form-confirmation-confirm').click(function(){

                    // serialize the loaded form
                    var form = $('#form-confirmation-content').find('form');
                    var form_method = $(form).attr('method');
                    var form_action =  $(form).attr('action');
                    var form_data =  $(form).serialize();


                    $('#form-confirmation-confirm').hide()
                    $('#form-confirmation-cancel').hide()

                    $('#form-confirmation-content').html('Processing request...')

                    $.ajax({
                        url: form_action,
                        type: form_method,
                        method: form_method,
                        data: form_data,

                        success: function(response){

                            $('#form-confirmation-content').html(response);
                            setTimeout(function(){window.location = window.location.href}, 1000);

                        },

                        error: function(response){

                            $('#form-confirmation-content').html("There was an error processing your request, Please try again later");

                        },
                    })



                })


            })


            $('#form-confirmation-dialog').dialog("open")
        })

    }



function resize_app_wrapper(){

    if($(".app_viewer_wrapper").length){
        var w_height = window.innerHeight
        var content_top = $(".app_viewer_wrapper").offset().top
        var footer_height = $('#footer').outerHeight()
        var calc_height = w_height - content_top - footer_height;

        $('.app_viewer_wrapper').height(calc_height)
    }

}
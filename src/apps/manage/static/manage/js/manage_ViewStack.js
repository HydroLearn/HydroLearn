var Manage_View_Stack = {
    target: "#my_modules_wrapper",
    crumbtrail_target: "#crumb_trail",
    content_target: "#Viewstack_content",

    stack: [],

    init: function(){

    },

    refresh_top_view: function(posted_data){

        var top_id = this.top_id()
        var query_address = $('#'+top_id).attr('data-query-address')

        // query for it's content and populate the div
        $.ajax({
            url: query_address,
            type: (!!posted_data)? "post": "get",
            data: (!!posted_data)? posted_data: {},

            success: function(data){
                $('#' + top_id).html(data);
            },

            error: function(data){
                $('#' + top_id).html(data);
            },
        })


    },

    push_view: function(view_id, view_name, content_query_address){

        // create new div for view_stack_child and add it to the target container
        var new_view = $('<div>', {'class': 'view_stack_child', id: view_id, 'value': view_name, 'data-query-address': content_query_address});

        $(new_view).append('Loading...');

        //var stack_top_child = $(this.stack).last()
        $('#' + this.top_id()).hide();

        $(this.content_target).append(new_view);
        this.stack.push(view_id)


        // query for it's content and populate the div
        $.ajax({
            url: content_query_address,
        }).done(function(data){
            $('#' + view_id).html(data);
        }).fail(function(){
            $('#' +view_id).html('There was an error processing your request.. '+
                                    'Please try again later');
        });


        // update the crumbtrail
        this.update_crumb();

        // hide all child divs


    },

    pop_view: function(pop_to_view_selector){

        // if pop_to_view_selector is passed
        if(!!pop_to_view_selector){

            // if it's in the stack pop all views until it's the top
            if($.inArray(pop_to_view_selector, this.stack) != -1){
                while(this.top_id() != pop_to_view_selector){
                    this.pop_view();
                }
            }



        }else{ // if not passed

            // get the current top
            var curr_top_view_id = this.stack.pop();

            // remove it from the page
            $('.view_stack_child[id="' + curr_top_view_id + '"]').remove();



        }

        // otherwise (if selector is in list) remove all view_stack_child until the specified view


        // show the new top
        this.refresh_top_view()
        this.show_top()
        this.update_crumb()

    },

    update_top_view: function(updated_content_query_address){
        $('#' + this.top_id()).html('Loading...');
        
        $.ajax({
            url: updated_content_query_address,

        }).done(function(data){
            $('#' + this.top_id()).html(data);
        }).fail(function(){
            $('#' + this.top_id()).html('There was an error processing your request.. '+
                                    'Please try again later');
        });

    },

    top_id: function() {
        return (this.stack.length > 0) ? this.stack[this.stack.length-1]: "";

    },

    show_top: function(){
        var top_id = this.top_id();
        $('.view_stack_child[id="' + top_id + '"]').show();
    },

    update_crumb: function(){

        var new_crumb_list = []
        var current_view_id = this.top_id();


        // for each element of the stack create a link to pop_view back to that view
        $.each(this.stack, function(index,value){
            var curr_view = $('.view_stack_child[id="' + value + '"]')


            var view_id = $(curr_view).attr('id')
            var view_value = curr_view.attr('value')

            var crumb_entry = $('<a>', {'class':'crumb_entry'})
            crumb_entry.attr('val', view_id)
            crumb_entry.html(view_value)

            if(view_id != Manage_View_Stack.top_id()){
                crumb_entry.click(function(){
                    Manage_View_Stack.pop_view($(this).attr('val'));
                });
            }else{
                crumb_entry.addClass('current_view')
            }

            new_crumb_list.push(crumb_entry)
        });

        // clear out the old crumbtrail
        $(this.crumbtrail_target).html("")

        // if the only view present in the crumbtrail is the home view, dont recreate it.
        if(this.stack.length == 1) return


        // populate with the new crumbtrail items
        $.each(new_crumb_list, function(index,value){
            if(index != 0 )
                $(Manage_View_Stack.crumbtrail_target).append(' / ')

           $(Manage_View_Stack.crumbtrail_target).append(value)
        });
    },



}




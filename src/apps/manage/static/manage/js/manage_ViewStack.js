/*
 *  Define an object to maintain a viewstack within a provided target container
 *      expected to push partial views to the stack
 *      and maintain a crumbtrail for navigation
 */

function View_Stack(target){

    if(typeof(target) == "undefined") throw new Error('VIEW_STACK: cannot initialize viewstack without valid target container')
    if($(target).length != 1)  throw new Error('VIEW_STACK: cannot initialize viewstack without valid target container')

    this._target = target;
    this.stack = [];
    this._init()
}


    View_Stack.prototype._init = function(){


        $(this._target).addClass("VStack_container");

        // create crumbtrail container and append to target
        var crumb_trail = $(document.createElement('div'));
        crumb_trail.addClass('VStack_crumb_trail');
        crumb_trail.attr('data-view-parent', this._target);
        $(this._target).append(crumb_trail)



        // create content container and append to target
        var content = $(document.createElement('div'));
        content.addClass('VStack_content');
        content.attr('data-view-parent', this._target);
        $(this._target).append(content)

        this._crumbtrail_target = "{0} .{1}".format(this._target, 'VStack_crumb_trail');
        this._content_target = "{0} .{1}".format(this._target, 'VStack_content');

    }

    View_Stack.prototype.refresh_top_view = function(posted_data){

        var top_id = this.top_view_selector()
        var query_address = $(top_id).attr('data-query-address')

        // query for it's content and populate the div
        $.ajax({
            url: query_address,
            type: (!!posted_data)? "post": "get",
            data: (!!posted_data)? posted_data: {},

            success: function(data){
                $(top_id).html(data);
            },

            error: function(data){
                $(top_id).html(data);
            },
        })


    };

    View_Stack.prototype.push_view = function(view_id, view_name, content_query_address){

        // create new div for view_stack_child and add it to the target container
        var new_view = $('<div>', {'class': 'VStack_child', 'data-view-id': view_id, 'data-view-display-name': view_name, 'data-query-address': content_query_address});

        $(new_view).append('Loading...');

        //var stack_top_child = $(this.stack).last()
        $(this.top_view_selector()).hide();

        $(this._content_target).append(new_view);
        this.stack.push(view_id)

        var view_selector = this.view_selector(view_id);

        // query for it's content and populate the div
        $.ajax({
            url: content_query_address,

        }).done(function(data){
            $(view_selector).fadeOut(function(){
                $(view_selector).html(data);
                $(view_selector).fadeIn();
            });



        }).fail(function(){
            $(view_selector).fadeOut(function(){
                $(view_selector).html('There was an error processing your request.. '+
                                    'Please try again later');
                $(view_selector).fadeIn();
            });

        });


        // update the crumbtrail
        this.update_crumb();

        // hide all child divs


    };

    View_Stack.prototype.pop_view = function(pop_to_view_selector){

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
            $(this.view_selector(curr_top_view_id)).remove();

        }

        // otherwise (if selector is in list) remove all VStack_child until the specified view


        // show the new top
        this.refresh_top_view()
        this.show_top()
        this.update_crumb()

    };

    View_Stack.prototype.update_top_view = function(updated_content_query_address){
        $(this.top_view_selector()).html('Loading...');

        $.ajax({
            url: updated_content_query_address,

        }).done(function(data){
            $(this.top_view_selector()).html(data);
        }).fail(function(){
            $(this.top_view_selector()).html('There was an error processing your request.. '+
                                    'Please try again later');
        });

    };

    View_Stack.prototype.view_selector = function(view_id){
        // return a selector for child view indexed by provided view_id
        return "{0} .VStack_child[data-view-id='{1}']".format(this._target,view_id);

    }

    View_Stack.prototype.top_id = function() {
        // return the selector for the current 'top view'
        return (this.stack.length > 0) ?
                    this.stack[this.stack.length-1]
                    : "";
    };

    View_Stack.prototype.top_view_selector = function() {
        // return the selector for the current 'top view'
        return "{0} .VStack_child[data-view-id='{1}']".format(this._target,
                (this.stack.length > 0) ?
                    this.stack[this.stack.length-1]
                    : ""
            );
    };

    View_Stack.prototype.show_top = function(){
        var top_id = this.top_view_selector();
        //$(top_id).show();
        $(top_id).fadeIn();
    };

    View_Stack.prototype.update_crumb = function(){

        var new_crumb_list = []

        // for each element of the stack create a link to pop_view back to that view
        $.each(this.stack, function(index,view_key){
            //var curr_view = $('.VStack_child[id="' + value + '"]')
            var curr_view = $(this.view_selector(view_key))


            var view_id = $(curr_view).attr('data-view-id')
            var view_value = curr_view.attr('data-view-display-name')

            var crumb_entry = $('<a>', {'class':'crumb_entry'})
            crumb_entry.attr('val', view_id)
            crumb_entry.html(view_value)

            if(view_id != this.top_id()){
                crumb_entry.click(function(event){
                    this.pop_view($(event.target).attr('val'));
                }.bind(this));
            }else{
                crumb_entry.addClass('current_view')
            }

            new_crumb_list.push(crumb_entry)

        }.bind(this));

        // clear out the old crumbtrail
        $(this._crumbtrail_target).html("")

        // if the only view present in the crumbtrail is the home view, dont recreate it.
        if(this.stack.length == 1) return


        // populate with the new crumbtrail items
        $.each(new_crumb_list, function(index, view_display_name){
            if(index != 0 )
                $(this._crumbtrail_target).append(' / ')

           $(this._crumbtrail_target).append(view_display_name)

        }.bind(this));
    };
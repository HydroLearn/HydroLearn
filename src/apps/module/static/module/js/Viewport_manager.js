// define a view object for use by the Viewport Manager
function View(ViewName, target_container_selector){
    this.initialized = false;
    this.name = ViewName;
    this.target = target_container_selector;
    //this.tab = target_tab_selector;
}

// Expected overwrites for view methods to handle loading data/view actions
View.prototype.get_content_query_data = function(){}
View.prototype.pre_display = function(){}
View.prototype.post_display = function(){}
View.prototype.on_show = function(){}
View.prototype.on_hide = function(){}



// object to control the swapping of viewports
// sample View Initialization/Registration:
//      VIEWPORT_MGR.init('#main-content');
//      VIEWPORT_MGR.Register_View('Lessons', '#lesson-content');
//      VIEWPORT_MGR.Register_View('Map', '#map-content');

function VIEWPORT_MANAGER(target_container_selector) {

    if($(target_container_selector).length == 0)
        throw new Error("VIEWPORT_MANAGER's Specified target container, '" + target_container_selector +"', could not be found.")

    this._target = target_container_selector;      //the target container for the viewport
    this._current_view = "";  // the name/registration-index of the current view

    /* a collection of view objects containing mappings View Names to:
        target_container:       selector for the parent container of the view

        get_content_query_data: method to get the AJAX query data used to get the content for this view
                    - method should return an object of the following structure:
                        {
                            url: '[controller method url]'
                            data: '[parameter data to pass to the controller]'
                        }

        before_display method:  method to run loading content (handles any necessary actions before hiding view such as closing dialogs)
        before_hide method:     method to run before hiding content

    */
    this._Registered_Views = {}



}

VIEWPORT_MANAGER.prototype.Register_View = function (newView, target_tab_selector) {

        // todo: this should be accepting a 'view' object as defined by above prototype
        if(!(newView instanceof View))
            throw new Error('VIEWPORT_MANAGER: Attempted To register an invalid view, please generate a new "View" object.')

        this._Registered_Views[newView.name] = newView;
    }

VIEWPORT_MANAGER.prototype.Load_View = function (ViewName, content_load_args) {

        // if the view has been registered
        if (Object.keys(this._Registered_Views).indexOf(ViewName) > -1) {

            // if there is a currently displayed view run it's on_hide method and hide its target container
            if (!!this._current_view && ViewName != this._current_view) {
                if (!!this.current_view().on_hide) {
                    this.current_view().on_hide();
                }

                $(this.current_view().target).hide();

                if (!!this.current_view().tab) {
                    $(this.current_view().tab).removeClass('active')
                }
            }

            // set the new current view
            this._current_view = ViewName;

            // run the content load method and replace target viewport content with it's resulting html
            if (!!this.current_view().get_content_query_data) {

                var query_data_obj = this.current_view().get_content_query_data.apply(this._Registered_Views[this._current_view], content_load_args);

                if(!!query_data_obj){
                    SPINNER_MGR.Register_Query(
                        $.ajax({
                            url: query_data_obj['url'],
                            data: query_data_obj['data'],
                            type: "get",
                            dataType: "html",
                            error: function(xhr, textStatus, errorThrown) {
                                $(this.current_view().target).html("<div class='lesson'><h2>We're sorry!</h2><hr class='headerSpacer'><p>We couldn't find what you were looking for! Please, double-check the URL.<p>");

                            },
                        }),
                        this.content_loaded_event.bind(this),
                        [content_load_args],
                        this.current_view().target //'#main-content'
                    );

                }else{
                    // do any specified pre_display method for this view
                    if (!!this.current_view().pre_display) {
                       this.current_view().pre_display.apply(this.current_view(), content_load_args);
                    }

                    // show the new view's target container
                    $(this.current_view().target).show();

                    if (!!this.current_view().post_display) {
                        this.current_view().post_display.apply(this.current_view(), content_load_args);
                    }
                }



            }

            if (!!this.current_view().tab) {
                $(this.current_view().tab).addClass('active')
            }
            this.get_view(ViewName).initialized = true;
        }else{
            throw new Error("VIEWPORT attempted to load non registered view, {0}.", ViewName)
        }
    }

VIEWPORT_MANAGER.prototype.Switch_View = function(ViewName, optional_params) {

        // if the requested view exists in the registered collection
        if (this.is_registered_view(ViewName)) {

            // if switching to an un-initialized view, load the view instead of just swapping
            if (!this.get_view(ViewName).initialized) {
                this.Load_View(ViewName, optional_params);
            }

            // if the current view is not the specifed one

            if (!!this._current_view && ViewName != this._current_view) {

                if (!!this.current_view().on_hide) {
                    this.current_view().on_hide();
                }

                // hide the current view's target container
                $(this.current_view().target).hide();

                // if there's a tab associated with this view, set it to inactive
                if (!!this.current_view().tab) {
                    $(this.current_view().tab).removeClass('active')
                }

                // display the requested view's target contaner and set the current view to it
                $(this.get_view(ViewName).target).show();

                this._current_view = ViewName;

                // run any on show events
                if (!!this.get_view(ViewName).on_show) {
                    this.get_view(ViewName).on_show.apply(this.get_view(ViewName),optional_params);
                }

                // if there's a tab associated with this view, set it to active
                if (!!this.get_view(ViewName).tab) {
                    $(this.get_view(ViewName).tab).addClass('active')
                }


            }

        }

    }

VIEWPORT_MANAGER.prototype.current_view = function(){
        return this._Registered_Views[this._current_view];

    }

VIEWPORT_MANAGER.prototype.get_view = function(view_name){
        return this._Registered_Views[view_name];

    }

VIEWPORT_MANAGER.prototype.is_registered_view = function(view_name){
        return Object.keys(this._Registered_Views).indexOf(view_name) > -1

    }

VIEWPORT_MANAGER.prototype.content_loaded_event = function (returned_content, content_load_args) {

        // do any specified pre_display method for this view
        if (!!this.current_view().pre_display) {
            this.current_view().pre_display.apply(this.current_view(), content_load_args);
        }


        // display the returned content
        $(this.current_view().target).html(returned_content);


        // show the new view's target container
        $(this.current_view().target).show();

        //debugger;
        if (!!this.current_view().post_display) {
            this.current_view().post_display.apply(this.current_view(), content_load_args);
        }
        this.current_view()
    }

VIEWPORT_MANAGER.prototype.Scroll_To_Top = function (optional_container_selector) {
        if (!!optional_container_selector) {
            $(optional_container_selector).scrollTop(0);
        } else {
            $('html, body').scrollTop(0);
        }

    }
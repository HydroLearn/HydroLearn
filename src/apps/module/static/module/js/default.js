// Recreate 'String.Format' functionality in javascript.
String.prototype.format = function () {
    var args = arguments;
    var str = this;
    return str.replace(String.prototype.format.regex, function (item) {

        var intVal = parseInt(item.substring(1, item.length - 1));
        var replace;
        if (intVal >= 0) {
            replace = args[intVal];
        } else if (intVal === -1) {
            replace = "{";
        } else if (intVal === -2) {
            replace = "}";
        } else {
            replace = "";
        }
        return replace;
    });
};
String.prototype.format.regex = new RegExp("{-?[0-9]+}", "g");


//add a max method to array
Array.prototype.max = function () {
    return Math.max.apply(null, this);
};

Array.prototype.min = function () {
    return Math.min.apply(null, this);
};



/* Global variables
*/

// Automated method to resize various page elements based upon the current viewport sizing
function ResizeEventHandler() {
    
    
    //var window_height = $(window).height();
    //var window_width = $(window).width();
    
    //var sidebar_margin = $("#sidebar_container").outerWidth() + 10;
    //var header_height = $('#main-header').outerHeight();
    
    //var toolbar_visible = ($('.cms-toolbar-trigger-expanded').length != 0);
    //var toolbar_height = (toolbar_visible)? $('.cms-toolbar').height(): 0;
    
    // resize the body
    //$('#main-body').height(window_height - header_height - toolbar_height);
    
    //$("#sidebar_container").height(window_height - header_height - toolbar_height);
    //$(".TOC_listing").height($("#sidebar_container").height() - $(".TOC_Header_container").height() - 25);
    
//    $("#main-content").height(window_height - header_height - toolbar_height);
    
    //$('#map-content #content').height(window_height - $('#header-img').height());
    //
    //$("#main-content").css("margin-left", sidebar_margin);
    
    //$('body,html').height(window_height - toolbar_height);
    //
    //// size map viewport based upon if the the TOC is collapsed or not
    //if ($('#sidebar_TOC').hasClass("collapsed")) {
    //    $('#map-content #content').width(window_width - $('#sidebar_TOC').width() - 10);
    //    $('#map-content #content').css('left', $('#sidebar_TOC').outerWidth()-18);
    //} else {
    //    $('#map-content #content').width($(window).width() - $('#sidebar_TOC').width());
    //    $('#map-content #content').css('left', $('#sidebar_TOC').outerWidth()-30);
    //}
    //
    //
    //
    //MAP_MGR.Resize();
    //
}

// override the window resize event to call the above defined Resize event handler.
$(window).resize(function () {
    ResizeEventHandler();
});

// document ready override to run various tasks that are expected to be completed once the landing page has been loaded
$(document).ready(function() {
    ResizeEventHandler();
    
    $('.cms-toolbar-trigger').click(ResizeEventHandler)
    $(".collapsible_container .icon").click(collapse_event);

        
    //// initialize all JUI accordians (used in the table of contents)
    //$(".JUIaccordion").accordion({
    //    collapsible: true,
    //    active: false,
    //    heightStyle: 'content',
    //});

    //// initialize all sub accordions (also used in the table of contents)
    //$(".subAccordion").accordion({
    //    collapsible: true,
    //    active: false,
    //    heightStyle: 'content',
    //});


    // initialize the dialog box used when confirming navigating away from a page (used for quiz sections)
    $("#lesson-nav-warning-dialog").dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        resizable: false,
        width: '450px',
        open: function() {
            place_dialog_center($(this));
        }
    
    });
    //
    //// keep warning dialog centered on screen when scrolling
    //$(window).scroll(function() {
    //    if ($("#lesson-nav-warning-dialog").dialog("isOpen") === true) {
    //        place_dialog_center($("#lesson-nav-warning-dialog"));
    //    }
    //});

    // highlight the active section in the table of contents
    //HighlightActiveSection_TOC(true);


});

// method to keep a given dialog box centered on screen based upon viewport size
function place_dialog_center(dialog_obj) {
    var window_height = $(window).height();
    var window_width = $(window).width();
    var scroll_top = $(window).scrollTop();
    var scroll_left = $(window).scrollLeft();

    $(dialog_obj).parent('.ui-dialog').css('top', window_height / 2 - $(dialog_obj).height() + scroll_top);
    $(dialog_obj).parent('.ui-dialog').css('left', window_width / 2 - $(dialog_obj).width() / 2 + scroll_left);
}

/* general functions
*/
function Guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
}

function getCookie(c_name) {
    var c_value = " " + document.cookie;
    var c_start = c_value.indexOf(" " + c_name + "=");
    if (c_start == -1) {
        c_value = null;
    }
    else {
        c_start = c_value.indexOf("=", c_start) + 1;
        var c_end = c_value.indexOf(";", c_start);
        if (c_end == -1) {
            c_end = c_value.length;
        }
        c_value = unescape(c_value.substring(c_start, c_end));
    }
    return c_value;
}

function collapse_event() {
    
    var collapse_container = $(arguments[0].target).closest(".collapsible_container");
    var icon = $(collapse_container).find(".icon");
    var content_container = $(collapse_container).find('.content_container');
    var contents = $(content_container).find('.content');

    //var box = content_container.find(".content");
    if (contents.is(':visible')) {
        $(contents).fadeOut(100, function () {
            $(content_container).addClass('collapsed');
        });

        setTimeout(function () {
            $(collapse_container).addClass('collapsed');
            $(icon).removeClass('selectedTab');
        }, 200);

    } else {
        $(icon).addClass('selectedTab');

        $(collapse_container).removeClass('collapsed');
        $(content_container).removeClass('collapsed').ready(function () {
            $(contents).delay(300).fadeIn(200);
        });



    }

    setTimeout(ResizeEventHandler, 500);
}

// #region Accordion Interaction methods

function recursivly_expand_subAccords(subAccord) {

    var parentAccordion = subAccord.parent().closest('.subAccordion');

    subAccord.accordion({ active: 0 });

    // if there is a parent subaccordion recursivly call with parent
    if (parentAccordion.length > 0) {
        recursivly_expand_subAccords(parentAccordion);
    }
}

//function HighlightActiveSection_TOC() {
//    
//    $(".TOC_Title").removeClass('current_selected_section');
//
//    var section = URL_UTILS.getURLParameter('sectionID');
//
//    if (!!section) {
//        
//        var TOC_Item = $(".TOC_Title[value='" + section + "']");
//        var parent_accordion = TOC_Item.closest('.JUIaccordion');
//        TOC_Item.addClass('current_selected_section');
//
//        // expand any parent accordians to display current section on first load
//        parent_accordion.accordion({ active: parent_accordion.children('div').index(TOC_Item.closest('div.accord-content')) });
//        recursivly_expand_subAccords(TOC_Item.closest('.subAccordion'));
//            
//        
//    }
//}

// #endregion


// #region VIEWPORT MANAGER

// object to control the swapping of viewports 
// sample View Initialization/Registration:
//      VIEWPORT_MGR.init('#main-content');
//      VIEWPORT_MGR.Register_View('Lessons', '#lesson-content', LESSON_MGR.get_Content, LESSON_MGR.pre_display, LESSON_MGR.post_display, LESSON_MGR.on_Hide);
//      VIEWPORT_MGR.Register_View('Map', '#map-content', MAP_MGR.get_Content, MAP_MGR.pre_display, MAP_MGR.post_display, MAP_MGR.on_Hide);
var VIEWPORT_MGR = {

    _target: null,      //the target container for the viewport
    _current_view: "",  // the name/registration-index of the current view

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
    Registered_Views: {},


    init: function (target_container_selector) {
        this._target = target_container_selector;
    },

    Register_View: function (ViewName, target_container_selector, target_tab_selector ,get_content_query_data, pre_display_fn, post_display_fn, on_show_fn, on_hide_fn) {
        var newView = {
            //name: ViewName,
            initialized: false,
            target: target_container_selector,
            tab: target_tab_selector,

            get_content_query_data: get_content_query_data,
            pre_display: pre_display_fn,
            post_display: post_display_fn,

            on_show: on_show_fn,
            on_hide: on_hide_fn,
        };

        this.Registered_Views[ViewName] = newView;
    },

    // swap to a specified registered view. 
    // if it hasn't been initialized yet, initialize it
    Switch_View: function(ViewName, optional_params) {

        // if the requested view exists in the registered collection
        if (Object.keys(this.Registered_Views).indexOf(ViewName) > -1) {
            
            // if switching to an un-initialized view, load the view instead of just swapping
            if (!this.Registered_Views[ViewName].initialized) {
                this.Load_View(ViewName, optional_params);
            }

            // if the current view is not the specifed one
            
            if (!!this._current_view && ViewName != this._current_view) {

                if (!!this.Registered_Views[this._current_view].on_hide) {
                    this.Registered_Views[this._current_view].on_hide();
                }

                // hide the current view's target container
                $(this.Registered_Views[this._current_view].target).hide();


                // display the requested view's target contaner and set the current view to it
                $(this.Registered_Views[ViewName].target).show();

                this._current_view = ViewName;

                // run any on show events
                if (!!this.Registered_Views[ViewName].on_show) {
                    this.Registered_Views[ViewName].on_show.apply(null,optional_params);
                }

                
            }

        }

    },

    // hide the current view and and display the requested view if it exists, 
    //      Performs an AJAX query with values provided by the registered viewport object
    //
    Load_View: function (ViewName, content_load_args) {

        // if the view has been registered
        if (Object.keys(this.Registered_Views).indexOf(ViewName) > -1) {

            // if there is a currently displayed view run it's on_hide method and hide its target container
            if (!!this._current_view && ViewName != this._current_view) {
                if (!!this.Registered_Views[this._current_view].on_hide) {
                    this.Registered_Views[this._current_view].on_hide();
                }

                $(this.Registered_Views[this._current_view].target).hide();
            }

            // set the new current view
            this._current_view = ViewName;

            // run the content load method and replace target viewport content with it's resulting html
            if (!!this.Registered_Views[this._current_view].get_content_query_data) {

                var query_data_obj = this.Registered_Views[this._current_view].get_content_query_data.apply(null, content_load_args);
                
                if(!!query_data_obj){
                    SPINNER_MGR.Register_Query(
                        $.ajax({
                            url: query_data_obj['url'],
                            data: query_data_obj['data'],
                            type: "get",
                            dataType: "html",
                            error: function(xhr, textStatus, errorThrown) {
                                $(VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].target).html("<div class='lesson'><h2>We're sorry!</h2><hr class='headerSpacer'><p>We couldn't find what you were looking for! Please, double-check the URL.<p>");

                            },
                        }),
                        function (returned_content, content_load_args) {

                            // do any specified pre_display method for this view
                            if (!!VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].pre_display) {
                                VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].pre_display.apply(null, content_load_args);
                            }


                            // display the returned content
                            $(VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].target).html(returned_content);


                            // show the new view's target container
                            $(VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].target).show();

                            //debugger;
                            if (!!VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].post_display) {
                                VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].post_display.apply(null, content_load_args);
                            }
                            VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view]
                        }, [content_load_args],
                            VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].target //'#main-content'
                    );
                
                }else{
                    // do any specified pre_display method for this view
                    if (!!VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].pre_display) {
                        VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].pre_display.apply(null, content_load_args);
                    }
                    
                    // show the new view's target container
                    $(VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].target).show();

                    if (!!VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].post_display) {
                        VIEWPORT_MGR.Registered_Views[VIEWPORT_MGR._current_view].post_display.apply(null, content_load_args);
                    }
                }
                
                
                
            }
            this.Registered_Views[ViewName].initialized = true;
        }
    },

    // method to scroll to the top of a specified container, or the html/body if no container is specified
    Scroll_To_Top: function (optional_container_selector) {
        if (!!optional_container_selector) {
            $(optional_container_selector).scrollTop(0);
        } else {
            $('html, body').scrollTop(0);
        }

    },

    Current_View: function() {
        return this._current_view;
    },

};

// #endregion



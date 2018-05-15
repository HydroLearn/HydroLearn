/*
    SPINNER_MGR

    Singleton object designed to simplify use and display of the spinner.js (spin-1.2.8.js)

    -   Once Initialized Spinner is bound to trigger upon Ajax calls after a specified delay (default is 250 ms)
    -   The spinner can also be manually triggered/stopped if client side application 
        requires restriction of input during operation. this can be done by placing code between spin/stop calls to the Spinner manager


*/

if (!!Spinner) { // requires a definition for Spinner ( enforces dependancy on spinner.js )

    // object to handle the loading of data that has dependencies on other loaded data
    //      generates queues of 'query->promises' to automatically trigger the loading of the 
    //      next queued query

    /* ajax promises:    
    .done(), // complete once query is done
    .fail(), 
    .always(), 
    .then()  // returns new promise 
    
    */
    var SPINNER_MGR = {

        _spinner_options: {
            lines: 9 // The number of lines to draw
            , length: 34 // The length of each line
            , width: 14 // The line thickness
            , radius: 40 // The radius of the inner circle
            , scale: 1 // Scales overall size of the spinner
            , corners: 0.6 // Corner roundness (0..1)
            , color: '#fff' // #rgb or #rrggbb or array of colors
            , opacity: 0.25 // Opacity of the lines
            , rotate: 0 // The rotation offset
            , direction: 1 // 1: clockwise, -1: counterclockwise
            , speed: 1 // Rounds per second
            , trail: 30 // Afterglow percentage
            , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
            , zIndex: 2e9 // The z-index (defaults to 2000000000)
            , className: 'spinner' // The CSS class to assign to the spinner
            , top: '50%' // Top position relative to parent
            , left: '50%' // Left position relative to parent
            , position: 'absolute' // Element positioning
        },

        // collection of spinners indexed by container_selectors (parent containers to cover with spinner)
        _spinners: {},

        // collection mapping query-id's to their affected container
        _currently_running: {},


        /* method to register a new query with the loading queue
            parameters:
                ajax_call: the query to run
                callback_method: method to run upon successful return from query
                callback_args: an array of arguments to apply to the callback_method
                container_selector: container load a spinner to during the query execution        
        */
        Register_Query: function (ajax_call, callback_method, callback_args, container_selector) {
            // set default values for callback_method and container
            if (!!!callback_method) callback_method = null;
            if (!!!callback_args) callback_args = [];
            if (!!!container_selector) container_selector = 'body';

            // generate a new query_id
            var query_id = SPINNER_MGR.Generate_Unique_Id();
            //var query_spinner = SPINNER_MGR.Generate_new_Spinner(container_selector);

            // add the load spinner to either the specified container, or body if none provided

            
            var spinner_container = $(container_selector).children('.Load_Spinner_Container');

            
            // if there isn't already a spinner container add it to the selected container
            if ($(spinner_container).length == 0) {

                //console.log('ADDING: container for "{0}"'.format(container_selector));

                // create a new spinner container and append it the the selected container.
                SPINNER_MGR.Generate_Spinner_Container(container_selector);


            }
            
            SPINNER_MGR._currently_running[query_id] = container_selector;
            
            SPINNER_MGR.Resize_spinners();

            ajax_call.fail(function (return_obj) {

                SPINNER_MGR.Remove_Spinner(query_id);

            }).done(function (return_obj) {
                
                if (!!callback_method) callback_method.apply(null, [return_obj].concat(callback_args));

                SPINNER_MGR.Remove_Spinner(query_id);
                
            });

            // return the query id so the requesting method can keep track of it's progress
            return query_id;


        },


        Register_Manual_Spinner: function (container_selector) {

            if (!!!container_selector) container_selector = 'body';

            // generate new query id to keep track of spinner
            var query_id = SPINNER_MGR.Generate_Unique_Id();

            SPINNER_MGR.Generate_Spinner_Container(container_selector);
            SPINNER_MGR._currently_running[query_id] = container_selector;

            SPINNER_MGR.Resize_spinners();

            return query_id;
        },

        Generate_Unique_Id: function () {
            var query_id = Guid();

            // ensure this is a unique query_id, if it is a collision, regenerate it
            while (!!SPINNER_MGR._currently_running[query_id]) {
                query_id = Guid();
            }

            return query_id;
        },

        Generate_Spinner_Container: function (container_selector) {
            var spinner_container = $(document.createElement('div'));
            //spinner_container.attr('id', '{0}_spinner'.format(query_id));
            spinner_container.addClass('Load_Spinner_Container');
            spinner_container.show();
            
            // add the spinner container to the requested container
            $(container_selector).append(spinner_container);


            spinner_container.append(SPINNER_MGR.Generate_new_Spinner(container_selector));

            return spinner_container;

        },

        Generate_new_Spinner: function (container_selector) {

            // index the new spinner under the query id
            SPINNER_MGR._spinners[container_selector] = new Spinner(SPINNER_MGR._spinner_options).spin($(container_selector).children('.Load_Spinner_Container')[0]);

            return SPINNER_MGR._spinners[container_selector];


        },

        Remove_Spinner: function (query_id) {

            
            // remove the query id from the currently running collection and remove the spinner container if
            // the selector is now free (not being used by any other queries) remove it as well.
            if (!!SPINNER_MGR._currently_running[query_id]) {

                var container = SPINNER_MGR._currently_running[query_id];

                // remove this query_id from currently_running processes
                delete SPINNER_MGR._currently_running[query_id];

                // if there's no other currently running process for this container remove the container
                if (SPINNER_MGR.is_Container_Free(container)) {
                    
                    // delete the spinner object from local collection
                    delete SPINNER_MGR._spinners[container];

                    // remove the spinner's container
                    $(container).children('.Load_Spinner_Container').remove();
                    
                    //console.log('Removing: container for "{0}"'.format(container));

                }


            }






        },

        Resize_spinners: function () {

            // for each of the recored parent containers, resize child load_spinner_container to it's parent's height
            $.each(SPINNER_MGR._spinners, function(container_selector, spinner) {

                var parent_container = $(container_selector);
                var spinner_container = parent_container.children('.Load_Spinner_Container');

                var p_width = parent_container.outerWidth();
                var p_height = parent_container.outerHeight();

                spinner_container.width(p_width);
                spinner_container.height(p_height);

            });

        },

        is_Container_Free: function (container_selector) {

            var found_selector = false;

            $.each(SPINNER_MGR._currently_running, function (index, value) {
                if (value == container_selector) {
                    found_selector = true;
                }

            });

            return !found_selector;
        },


    };


} else {
    console.log('Load Spinner Manager could not be loaded. Please verify you have a valid copy of JSSPINNER.');
}
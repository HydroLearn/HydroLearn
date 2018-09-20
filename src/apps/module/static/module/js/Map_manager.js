function MAP_CONFIG(config){

    // TODO: populate this to set expected fields for a map config,
    //          and throw warning if any non_allowed fields are set
    var allowed_fields = [];


    // check the passed configuration for required field validity
    var required_fields = [
            'center',
            'projection',
            'zoom',
            'min_zoom',
            'max_zoom',
            'base_layer',
            'geoserverURL',
        ];

    var _defaults = {
            "base_layer": "WorldImagery",
            "projection": ol.proj.get("EPSG:3857"),
            "center": ol.proj.fromLonLat([-95.1416015625, 38.01347623104195]),
            "zoom": 4,
            "min_zoom": 3,
            "max_zoom": 19,

         };

    (function(config){
        if(typeof(config) == 'undefined') throw new Error('Map configuration not defined')

        function config_valid(config_name){
            var key_exists = (config_name in config)
            var defined = typeof(config[config_name]) != "undefined"
            return  key_exists && defined;
        }

        $.each(required_fields, function(index, value){
            if(!config_valid(value)) {
                // if a required value is excluded, check for defaults
                // otherwise throw a configuration error
                if(value in _defaults){
                    config[value] = _defaults[value];
                } else throw new Error('Required Field, "' + value + '", not included in map configuration')
            }
        })
    })(config);

    this.center = config.center;
    this.projection = config.projection;
    this.zoom = config.zoom;
    this.min_zoom = config.min_zoom;
    this.max_zoom = config.max_zoom;
    this.base_layer = config.base_layer;
    this.geoserverURL = config.geoserverURL;

}

// define a custom view object for use by the Viewport manager
function MAP_VIEW(ViewName, target_container_selector, Map_Manager){
    View.call(this, ViewName, target_container_selector)

    if(!(Map_Manager instanceof MAP_MANAGER))
        throw new Error('MAP_VIEW: invalid MAP_MANAGER supplied, please inherit from MAP_MANAGER')

    this.manager = Map_Manager;

}

// inherit prototype methods
MAP_VIEW.prototype = Object.create(View.prototype)

// overwrite the view necessary view manipulation methods
//MAP_VIEW.prototype.get_content_query_data = function () { return null }
MAP_VIEW.prototype.on_show = function () {
            // if have any arguments (layer_ids) check the associated layers on the map
            //if (arguments.length > 0) {
                //uncheckAllLayers();
                //checkLayers.apply(null, arguments);
            //}

            if (this.manager._on_reopen_events.length > 0) {
                // run each of the reopen events
                $.each(this.manager._on_reopen_events, function (index, evt) { evt(); });

                // clear the reopen events
                this.manager._on_reopen_events = [];

            }

            setTimeout(this.manager.Resize.bind(this.manager), 500);
        }

MAP_VIEW.prototype.on_hide = function () {

            // get list of all open dialog's ids
            var curr_open_dialogs = $('.ui-dialog-content').filter(function () { return $(this).dialog('isOpen'); }).map(function () { return "#{0}".format($(this).attr('id')); });

            // register a reopen event for each of the open dialogs to trigger reopening them
            this.manager.Register_on_reopen_event(function() {
                $.each(curr_open_dialogs, function(index, id) {
                    $(id).dialog("open");
                });

            });

            $('.ui-dialog-content').dialog('close');

        }

MAP_VIEW.prototype.post_display = function () {

            var map_manager = this.manager;

            // bind the click events for the basemap/Layer tabs  to show/hide containers when clicking the tab
            $(".collapsible_container .icon").click(collapse_event);

            // enable selection of different base maps from tile selection in the basemap container
            $('.baseMap_tile').click(function() {
                var selected_tile = $(this);

                // remove previous selected tile class
                $('.selected_basemap_tile').removeClass('selected_basemap_tile');

                // add selected to selected tile
                selected_tile.addClass('selected_basemap_tile');


                // update the selected basemap in the Map manager
                map_manager.change_base_layer(selected_tile.attr('val'));

            });

            if (arguments.length > 0) {
                //uncheckAllLayers();
                //checkLayers.apply(null, arguments);
            }

            // give OpenLayers a chance to initalize itself and then run the Resize event handler
            setTimeout(this.manager.Resize.bind(this.manager), 500);
        }

MAP_VIEW.prototype.pre_display = function () {

            // Pause any open videos if the youtube player is open
            // if (!!youtube_player) {
            //     pauseVideo();
            // }


        }



// manager for the map including several common methods for manipulating the map
//  TODO: add in methods of defining target containers for mappanel/basemap/layers/legpanel/dialogs/popups

var MAP_MANAGER = function(target_container_id, config_options) {

    "use strict";

    /* ---------------------------------
        Properties
    ---------------------------------*/
    this._is_Initialized =  false;


    // verify that the passed target container id exists
    if($(target_container_id).length == 0)
        throw new Error("MAP_MANAGER's Specified target container, '" + target_container_id +"', could not be found.")


    this._target = target_container_id;

    //var _WMS_URL =  "";
    this._Map =  null;  // ol3 map object

    this._default_controls =  [];  // map controls
    this._external_controls =  [];
    this._interactions =  [];  // map interactions

    this._Module_Layers =  [];  // layers collection consisting of layers Gd from layersData of preloaded 'layers.js' script
    this._Layer_Legends =  {};
    //var _Legend_container_selector =  '#legpanel';


    this._popup_container =  null;
    this._popup_content =  null;
    this._popup_closer =  null;

    this._overlay  =   null;
    this._help_popup =  null;

    this._on_reopen_events =  [];


    // in the event that the map manager utilizes child plugins
    // add their initialization methods to an array to execute after this object's initialization
    this._child_plugin_initializations = [];


    /* ---------------------------------
        Options/Default config definition
        ---------------------------------*/


        // create the initial empty options object with containers for
        //  default/user-defined settings
        this.options = {
            _user_defined: {},
            _defaults : {
                // the base layer collection of the map
                //  0 - WorldImagry
                //  1 - Topo
                //  2 - Street
                //  3 - ShadedRelief
                //
                base_layers :  [
                        new ol.layer.Tile({
                            name: 'WorldImagery',
                            //visible: true,
                            visible: true,
                            source: new ol.source.XYZ({
                                url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

                                //wrapX: false,
                                //wrapY: false,
                            })
                        }),

                        new ol.layer.Tile({
                            name: 'Topo',
                            //visible: false,
                            visible: false,
                            source: new ol.source.XYZ({
                                url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                                //wrapX: false,
                                //wrapY: false,
                            })
                        }),
                        new ol.layer.Tile({
                            name: 'Street',
                            //visible: false,
                            visible: false,
                            source: new ol.source.XYZ({
                                url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                                //wrapX: false,
                                //wrapY: false,
                            }),
                        }),
                    ],
                base_layer : 'WorldImagery',
                center :  ol.proj.fromLonLat([-95.1416015625, 38.01347623104195]),
                zoom :  4,
                min_zoom :  3,
                max_zoom :  19,
                projection :  ol.proj.get("EPSG:3857"),

                // wms link
                wms_url:  "",

                // container id's
                controls_container_id: "#mapPanel",
                layers_container_id: "#layers",
                basemap_container_id: "#basemap",
                legend_container_id: "#legpanel",

                debug_output: false,

            },
        }

        // define additional properties for options to get default values
        // if none are provided in instantiation
        Object.defineProperties(this.options, {
            base_layers:            {get: function(){ return (typeof (this._user_defined.base_layers) != "undefined")? this._user_defined.base_layers: this._defaults.base_layers; }},
            base_layer:             {get: function(){ return (typeof (this._user_defined.base_layer) != "undefined")? this._user_defined.base_layer: this._defaults.base_layer; }},
            center:                 {get: function(){ return (typeof (this._user_defined.center) != "undefined")? this._user_defined.center: this._defaults.center; }},
            zoom:                   {get: function(){ return (typeof (this._user_defined.zoom) != "undefined")? this._user_defined.zoom: this._defaults.zoom; }},
            min_zoom:               {get: function(){ return (typeof (this._user_defined.min_zoom) != "undefined")? this._user_defined.min_zoom: this._defaults.min_zoom; }},
            max_zoom:               {get: function(){ return (typeof (this._user_defined.max_zoom) != "undefined")? this._user_defined.max_zoom: this._defaults.max_zoom; }},
            projection:             {get: function(){ return (typeof (this._user_defined.projection) != "undefined")? this._user_defined.projection: this._defaults.projection; }},

            // WMS
            wms_url:                {get: function(){ return (typeof (this._user_defined.wms_url) != "undefined")? this._user_defined.wms_url: this._defaults.wms_url; }},

            // linked containers
            controls_container_id:  {get: function(){ return (typeof (this._user_defined.controls_container_id) != "undefined")? this._user_defined.controls_container_id: this._defaults.controls_container_id; }},
            layers_container_id:    {get: function(){ return (typeof (this._user_defined.layers_container_id) != "undefined")? this._user_defined.layers_container_id: this._defaults.layers_container_id; }},
            basemap_container_id:   {get: function(){ return (typeof (this._user_defined.basemap_container_id) != "undefined")? this._user_defined.basemap_container_id: this._defaults.basemap_container_id; }},
            legend_container_id:    {get: function(){ return (typeof (this._user_defined.legend_container_id) != "undefined")? this._user_defined.legend_container_id: this._defaults.legend_container_id; }},
            debug_output:           {get: function(){ return (typeof (this._user_defined.debug_output) != "undefined")? this._user_defined.debug_output: this._defaults.debug_output; }},

        })




    /* ---------------------------------
        Internal Methods, denoted with leading '_'
    ---------------------------------*/

        /* xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
            NOT REFERENCED ANYWHERE (potentially unused)
        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx */

        // internal MAP_MGR utility method to
        //      add all default controls to the map
//        this._Add_default_controls = function() {
//            _default_controls.forEach(function(element) {
//                _Map.addControl(element);
//            });
//        }

        // internal MAP_MGR utility method to
        //      Add all default interactions to the map
//        this._Add_Interactions = function () {
//            this._interactions.forEach(function(element) {
//                this._Map.addInteraction(element);
//            });
//        }


//        //  get current viewport information, used for setting up the default view for layers
//        this.Get_Viewport_Dump = function () {
//
//            var viewDump = {};
//
//            viewDump["zoom"] = this.Get_Current_Zoom();
//            viewDump["center"] = this.Get_Current_Center();
//            viewDump["extent"] = this.Get_Map_Extent();
//
//            return viewDump;
//        }


    /*-----------------------------------------------
            ONLOAD FUNCTION
            the following function block is executed
            at instantiation of any new 'MAP_MANAGER' object
     ----------------------------------------------*/

    // set up user defined options
    if(!!config_options && typeof(config_options) == "object"){
        this.options._user_defined = config_options

    }

    // listen for events fired against target container

    $(this._target).on('_add_map_layer', this._add_OL_layer.bind(this))
    $(this._target).on('_remove_map_layer', this._remove_OL_layer.bind(this))

    $(this._target).on('_show_map_layer', this._show_OL_layer.bind(this))
    $(this._target).on('_hide_map_layer', this._hide_OL_layer.bind(this))
    $(this._target).on('_update_map_layer_z', this._update_layer_z.bind(this))



    // highlight and select starting base layer as defined in options
    //$('.baseMap_tile[val="' + options.base_layer + '"]').addClass('selected_basemap_tile');
    this.change_base_layer(this.options.base_layer)

    // create the default controls and add to collection
    this._default_controls.push(this.Create_Control('Help', '?', this.open_help_popover_event.bind(this)));

    // add zoom in/out buttons
    this._default_controls.push(new ol.control.Zoom({ title: "Zoom In", target: document.querySelector(this.options.controls_container_id) }));

    // add reset view to relocate camera to it's default position as defined by map center/zoom defined in layers.js
    this._default_controls.push(this.Create_Control("Reset Map Position", '&#8634;', this.Reset_Position.bind(this)));


    // TODO: find a way to do this ( export map as image for printing )
    // add export button to download a PNG of the current map state
    //_default_controls.push(Create_Control("Export View as Image", '<img src="/Content/images/Map_Icons/Image_Icon_White.png" />', export_map_event));


    this._popup_container = document.getElementById('popup');
    this._popup_content = document.getElementById('popup-content');
    this._popup_closer = document.getElementById('popup-closer');

    // setup help popover
    this._help_popup = $("#Map_Help_popover");

    this._help_popup.popover({
        html: true,
        container: this.options.controls_container_id,
        content: function () {
            return $("#Map_Help_content").html() + $("#Additional_Map_Help").html();
        }
    });

    this._help_popup.attr("title", this._help_popup.find(".map_popover_title").html());
    this._help_popup.attr('data-content', this._help_popup.find(".map_popover_content").html());
    this._help_popup.attr('data-template',
        "<div class='map_popover_obj' role='tooltip'>" +
            "<div class='popover-title'></div>" +
            "<div class='popover-content'></div>" +
            "<div class='map_popover_arrow'></div>" +
        "</div>");

    this._overlay = new ol.Overlay( /** @type {olx.OverlayOptions} */({
        element: this._popup_container,
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    }));

    // create map object and store it's reference in _Map
    this._Map = new ol.Map({
        target: 'map',
        controls: this._default_controls,
        layers: this.options.base_layers,
        loadTilesWhileInteracting: true,
        view: new ol.View({
            center: this.options.center,
            zoom: this.options.zoom,
            projection: this.options.projection,

            // restrict the user from zooming to far or to close to features (some boundaries are a good thing...)
            minZoom: this.options.min_zoom,
            maxZoom: this.options.max_zoom,
        })
    });

    this._Map.addOverlay(this._overlay);

    this._popup_closer.onclick = function () {

        this._overlay.setPosition(undefined);
        //_popup_closer.blur();
        return false;
    };

    // set up the image export functionality



    // by default hide the legend container
    $(this.options.legend_container_id).hide();



    //LAYER_MGR.init($(options.layers_container_id + " div.content div.layers_content_wrapper"), layersData);

    // TODO: this needs to happen differently (selection manager)
    //SELECTION_MANAGER.init(this.options.wms_url);

    this.init_child_plugins();
    this._is_Initialized = true;

}

/* -----------------------------------------
    define prototype methods for Map manager
-----------------------------------------*/

    /* -----------------------------------------
        Expected Methods used by other components
    -----------------------------------------*/

        MAP_MANAGER.prototype.Resize = function () {

                    if (this._is_Initialized) {
                        if($(this._target).is(':visible')){
                            // wait a little while before updating the size to allow
                            // for some animations to finish

                            setTimeout(function(){
                                //debugger;
                                if(this.options.debug_output){
                                    console.log('resizing map...')
                                }

                                var window_height = $(window).height()
                                var map_top = $(this._target).offset().top
                                var footer_height = $('#footer').height()
                                var new_height = window_height - map_top - footer_height

                                $(this._target).height(new_height)
                                $('#' + this._Map.getTarget()).height(new_height)

                                this._Map.updateSize();

                            }.bind(this), 250);
                        }

                    }

                    if (typeof SPINNER_MGR != "undefined") {
                        SPINNER_MGR.Resize_spinners();
                    }
                }

        MAP_MANAGER.prototype.Reset_Position = function () { return this._Reset_Position() }

    /* ---------------------------------
        Public Methods
    ---------------------------------*/

        MAP_MANAGER.prototype.register_child_plugin = function (plugin_init_fn) {
            if (!!plugin_init_fn) {
                this._child_plugin_initializations.push(plugin_init_fn);
            }
        }

        MAP_MANAGER.prototype.init_child_plugins = function () {
            for (var i = 0; i < this._child_plugin_initializations.length; i++) {
                this._child_plugin_initializations[i]();
            }
        }


        // method to create a new control button to the map
        //      control_title:  title to be displayed upon hovering over contol
        //      icon_html:      the raw html of what is to be displayed on the control button (can be a 16x16 image or an encoded html character)
        //      clickevent:     The click event for the button which maps the functionality of the control
        MAP_MANAGER.prototype.Create_Control = function (control_title, icon_html, clickevent) {

            var new_control_options = {
                title: control_title,
                display_html: icon_html,
                clickevent: clickevent,
                target: document.querySelector(this.options.controls_container_id),
            };

            // add 'Open Filter dialog' control
            var new_control = function (opt_options) {

                var options = opt_options || {};

                var button = document.createElement('button');
                button.innerHTML = options.display_html;
                button.title = options.title;

                button.addEventListener('click', options.clickevent, false);
                button.addEventListener('touchstart', options.clickevent, false);

                var element = document.createElement('div');
                element.className = 'ol-unselectable ol-control';
                element.appendChild(button);

                ol.control.Control.call(this, {
                    element: element,
                    target: options.target,
                });

            };

            ol.inherits(new_control, ol.control.Control);

            var initialized_control = new new_control(new_control_options);

            return initialized_control;
        }

        MAP_MANAGER.prototype.Add_Control = function (control) {

            if (!!control) {
                this._external_controls.push(control);
                this._Map.addControl(control);
            }
        }

    /* ---------------------------------
        Map Functionality Methods
    ---------------------------------*/
        MAP_MANAGER.prototype._Reset_Position = function () {
            this._Map.getView().setCenter(this.options.center);
            this._Map.getView().setZoom(this.options.zoom);
        }

        // get the current view's extent
        MAP_MANAGER.prototype.Get_Map_Extent = function () {

            //return _Map.getView().calculateExtent(_Map.getSize());

            var extent = this._Map.getView().calculateExtent(this._Map.getSize());
            return ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

        }

        MAP_MANAGER.prototype.Get_Current_Zoom = function () {
            return this._Map.getView().getZoom();

        }

        MAP_MANAGER.prototype.Get_Current_Center = function () {
            var center = this._Map.getView().getCenter();
            return ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
        }



        // convert point to lon/lat OL3
        MAP_MANAGER.prototype.Convert_point_to_LonLat = function (point) {
            ol.proj.transform(point, 'EPSG:3857', 'EPSG:4326');

        }

        MAP_MANAGER.prototype.change_base_layer = function (lyr_name) {
            var manager_options = this.options;
            this.options.base_layers.forEach(function (element, index) {
                (element.get('name') == lyr_name) ?
                    manager_options.base_layers[index].setVisible(true) :
                    manager_options.base_layers[index].setVisible(false);
            });

            // highlight the representative tile in basemap selection container
            $('.baseMap_tile[val="' + lyr_name + '"]').addClass('selected_basemap_tile');
        }


    /* ---------------------------------
        Module Layers Methods
    ---------------------------------*/

        // remove a constructed layer
        // this method assumes that the layer you're removing exists
        MAP_MANAGER.prototype._removeLayer = function (Layer) {
            //_Module_Layers.push(Layer);
            this._Module_Layers = this._Module_Layers.filter(function (el) {
                return el !== Layer;
            });
            this._Map.removeLayer(Layer);

            // remove legend graphic if exists
            var layer_name = Layer.get('name');
            if (!!this._Layer_Legends[layer_name]) {
                // remove legend from legend container if it exists
                $(options.legend_container_id).find('#' + layer_name + '_legend').remove();

                if ($(options.legend_container_id).find('.layer_legend:visible').length == 0) {
                    $(options.legend_container_id).hide();
                }

                // delete legend reference
                delete this._Layer_Legends[layer_name];
            }
        }

        // internal MAP_MGR utility method to
        //  add layers loaded from layers.js to the map
        MAP_MANAGER.prototype._add_Module_Layers = function () {
            this._Module_Layers.forEach(function (element, index) {
                this._Map.addLayer(element);
            });
        }

        // get a layer reference by its name, null otherwise
        MAP_MANAGER.prototype.get_layer = function (lyr_name) {
            //debugger;
            var found_lyr = null;
            //Map_Layers.forEach(function (element, index) {
            this._Module_Layers.forEach(function (element, index) {
                //debugger;
                if ((element.get('name') == lyr_name)) {
                    found_lyr = this._Module_Layers[index];
                }

            }.bind(this));
            return found_lyr;
        }

        // add a constructed ol layer to the map
        MAP_MANAGER.prototype.add_layer = function (ol_layer, legend) {
            //debugger;
            // optional legend
            if (!!!legend) legend = null;
            else legend = $(legend);

            this._Module_Layers.push(ol_layer);
            this._Map.addLayer(ol_layer);

            // add legend graphic from server
            if (!!legend) {
                var layer_name = ol_layer.get('name');

                legend.addClass('layer_legend');
                legend.attr('id', layer_name + '_legend');

                this._Layer_Legends[layer_name] = legend;

                $(options.legend_container_id).find('.content').append(legend);
                $(options.legend_container_id).show();


            }


        }

        // remove a layer from the map by its name
        MAP_MANAGER.prototype.remove_layer = function (name) {
            var layer = this.get_layer(name);

            if (!!layer) {
                this._removeLayer(layer);
            }
        }

        // hide map layer specified by its name
        MAP_MANAGER.prototype.hide_layer = function (lyr_name) {
            var layer = this.get_layer(lyr_name);
            if (!!layer) {
                layer.setVisible(false);

                // hide the legend of this layer if it exists

                if (!!this._Layer_Legends[lyr_name]) {
                    // remove legend from legend container if it exists
                    $(options.legend_container_id).find('#' + lyr_name + '_legend').hide();

                    if ($(options.legend_container_id).find('.layer_legend:visible').length == 0) {
                        $(options.legend_container_id).hide();
                    }
                }
            }

        }

        // show map layer specified by its name
        MAP_MANAGER.prototype.show_layer = function (lyr_name) {

            var layer = this.get_layer(lyr_name);

            if(!!layer){
                layer.setVisible(true);

                // show the legend of this layer if it exists
                if (!!this._Layer_Legends[lyr_name]) {
                    // remove legend from legend container if it exists
                    $(options.legend_container_id).show();
                    $(options.legend_container_id).find('#' + lyr_name + '_legend').show();
                }
            }else{
                //console.log("Map_Manager cannot find layer, {0}, show_layer failed".format(lyr_name))
                throw new Error("Map_Manager cannot find layer, {0}, show_layer failed".format(lyr_name))
            }

        }

    /* ---------------------------------
        Event Handlers
    ---------------------------------*/
        MAP_MANAGER.prototype.open_help_popover_event = function () {

            //_help_popup.fadeToggle();


            this._help_popup.popover("toggle");

            //var popover_obj = $("#" + $(_help_popup).attr('aria-describedby'));

            //// position the popover to right of marker
            //popover_obj.css("top", -(popover_obj.height() / 2) - 10);
            //popover_obj.css("left", 45);
            //popover_obj.find(".map_popover_arrow").css("margin-top", -(popover_obj.height() / 2) + 15);

        }

        MAP_MANAGER.prototype.reset_view_event = function () {
            //this_.getMap().getView().setRotation(0);
            this.Reset_Position();
        }

        MAP_MANAGER.prototype.export_map_event = function () {


            var download_link = $(document.createElement('a'));
            download_link.attr('target', '_blank');
            download_link.attr('download', 'Hydroviz_Capture.png');

            this._Map.once('postcompose', function (event) {
                debugger;
                var canvas = event.context.canvas;
                download_link.attr('href', canvas.toDataURL('image/png'));


                canvas.toBlob(function (blob) {
                    saveAs(blob, 'Hydroviz_Capture.png');
                });


                //var png_address = canvas.toDataURL('image/png');

                //window.open(png_address, "_blank");

                //hFrame.location = png_address;


            });

            this._Map.renderSync();

        }

        // expects an anonomous method to be run next time the map is opened
        // (typically used for opening dialogs that loaded after user navigated away from the map)
        MAP_MANAGER.prototype.Register_on_reopen_event = function (method_to_run) {
            this._on_reopen_events.push(method_to_run);

        }

        MAP_MANAGER.prototype._add_OL_layer = function (event, layer){

            // check for valid call to event
            if(!(this instanceof MAP_MANAGER)) throw new Error("MAP_MANAGER: _add_OL_layer was called without binding 'this' to MAP_MANAGER instance (add '.bind(...)' to the event method definition)")


            // check that the layer being added is an open layers type
            if(! layer instanceof ol.layer.Base){
                throw new Error('Layer Passed to Map Manager add event was not valid. Must be an OpenLayers Layer Object.')
            }

            // if a layer with this name already exists, throw a duplication error
            if(this.get_layer(layer.get('name'))){
                throw new Error("MAP_MANAGER: layer with name, '{0}', already exists. please specify a new name.".format(layer.get('name')));
            }

            // perform layer add
            this.add_layer(layer)

            if(this.options.debug_output){
                console.log("added layer, '{0}', to map.".format(layer.get('name')))
            }



        }

        MAP_MANAGER.prototype._remove_OL_layer = function (event, layer_name){

                // check for valid call to event
                if(!(this instanceof MAP_MANAGER)) throw new Error("MAP_MANAGER: _remove_OL_layer was called without binding 'this' to MAP_MANAGER instance (add '.bind(...)' to the event method definition)")


                // if a layer with this name already exists, throw a duplication error
                if(!!!this.get_layer(layer_name)){
                    throw new Error("MAP_MANAGER: layer with name, '{0}', could not be found. Show event failed.".format(layer_name))
                }

                // perform layer add
                this.remove_layer(layer_name)

                if(this.options.debug_output){
                    console.log("added layer, '{0}', to map.".format(layer_name))
                }

            }

        MAP_MANAGER.prototype._show_OL_layer = function (event, layer_name){

                // check for valid call to event
                if(!(this instanceof MAP_MANAGER)) throw new Error("MAP_MANAGER: _show_OL_layer was called without binding 'this' to MAP_MANAGER instance (add '.bind(...)' to the event method definition)")

                // if a layer with this name isn't on the map, throw an error
                if(!!!this.get_layer(layer_name)){
                    throw new Error("MAP_MANAGER: layer with name, '{0}', could not be found. Show event failed.".format(layer_name))
                }

                // perform layer add
                this.show_layer(layer_name)

                if(this.options.debug_output){
                    console.log("Showed layer, '{0}', on map.".format(layer_name))
                }
            }

        MAP_MANAGER.prototype._hide_OL_layer = function (event, layer_name){

                // check for valid call to event
                if(!(this instanceof MAP_MANAGER)) throw new Error("MAP_MANAGER: _hide_OL_layer was called without binding 'this' to MAP_MANAGER instance (add '.bind(...)' to the event method definition)")


                 // if a layer with this name isn't on the map, throw an error
                if(!!!this.get_layer(layer_name)){
                    throw new Error("MAP_MANAGER: layer with name, '{0}', could not be found. Hide event failed.".format(layer_name))
                }

                // perform layer add
                this.hide_layer(layer_name)

                if(this.options.debug_output){
                    console.log("Hid layer, '{0}', on map.".format(layer_name))
                }

            }

        MAP_MANAGER.prototype._update_layer_z = function(event, layer_name, new_Z_index){

            // check for valid call to event
            if(!(this instanceof MAP_MANAGER)) throw new Error("MAP_MANAGER: _update_layer_z was called without binding 'this' to MAP_MANAGER instance (add '.bind(...)' to the event method definition)")


             // if a layer with this name isn't on the map, throw an error
            if(!!!this.get_layer(layer_name)){
                throw new Error("MAP_MANAGER: layer with name, '{0}', could not be found. Set Z-index event failed.".format(layer_name))
            }

            // perform layer add
            //this.hide_layer(layer_name)

            this.get_layer(layer_name).setZIndex(new_Z_index);

            if(this.options.debug_output){
                console.log("Updated z-index for layer, '{0}', on map.".format(layer_name))
            }


        }

        /* ---------------------------------
            Popup Handlers
        ---------------------------------*/

        MAP_MANAGER.prototype.Display_popup = function (content, coord) {
            $("#popup-content").html(content);
            $("#popup-content").scrollTop(0);
            $('#popup').show();
            this._overlay.setPosition(coord);
        }

        MAP_MANAGER.prototype.Hide_popup = function () {
        $('#popup').hide();

    }
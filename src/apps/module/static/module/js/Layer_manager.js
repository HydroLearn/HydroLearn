/*
    Define a layer object that provides some default values
    that are expected to be utilized by the layer manager

    it is expected that for each new type of layer resource
    a new object is to be generated extended from this prototype
    each must:
        -   provide a mapping to the expected values of a layer config
        -   pass the above defined mapping to 'Layer.call(this, MAPPED_CONFIG)'
        -   include any prototype methods via 'New_Layer_Type.prototype = Object.create(Layer.prototype)'
            after new resource definition


    sample inheritance:
    ----------------------------------------------
    // define new resource of 'New_Layer_Type'
    function New_Layer_Type(param1,param2,...){
        var config = { ... map required properties here ... }

        Layer.call(this, layer_id, config)
    }
    // copy prototype definitions
    New_Layer_Type.prototype = Object.create(Layer.prototype)

    // add additional methods if needed for use in other components
    New_Layer_Type.prototype.getStyle = function(){
        return "custom getStyle"
    }
    ----------------------------------------------
*/
// information to persist and be available between layers
window.Layer_OBJ_META = {};
Object.defineProperties(window.Layer_OBJ_META, {
        count: {value: 0,writable: true,},
        unique_id: {
            get: function(){
                var new_id = "layer_" + (this.count).toString();
                this.count = this.count+ 1;
                return new_id;
            },
        }
    })

function Layer(config){

    // check the config for required values
    (function(config){
        // Required configurations for a Layer
        // required_fields are subject to change as different types of resources
        // are supported
        var required_fields = [
                //'id',
                'resource_id',
                'display_name',
                'resource_type',
                'geometry_type',
                'extents',
                'style',
                'wms_url',
                'visible',
                'attributes',
            ];

        var _defaults = {
                "visible": true,
                "display_name": config.id,
                'style': "Default",
                'attributes': null,
             };

        function config_valid(config_name){
            var key_exists = (config_name in config)
            var defined = typeof(config[config_name]) != "undefined"
            return  key_exists && defined;
        }

        if(typeof(config) == 'undefined') throw new Error('layer configuration not defined')

        $.each(required_fields, function(index, value){
            // check for valid config values,
            // if not provided check/set default values
            // if no defaults, throw configuration error
            if(!config_valid(value)){

                if(value in _defaults){
                    config[value] = _defaults[value];
                } else throw new Error(' Required Field, "' + value + '", not included in Layer configuration')

            }

        });

    })(config);

    // metadata for the layer object, used for specifying settings
    //      such as, filterable/classifiable/selectable features/etc.



    //this.id =  config.id;
    this.id = window.Layer_OBJ_META.unique_id;
    this.resource_id = config.resource_id;
    this.display_name = config.display_name;
    this.resource_type = config.resource_type;
    this.geometry_type = config.geometry_type;
    this.extents = config.extents;
    this.style = config.style;
    this.visible = config.visible;
    this.wms_url = config.wms_url;

    this.attributes = config.attributes;

    /* seems to be the following types of resources:
        - TimeSeriesResource    (vector layer)
        - GenericResource       (vector layer)
        - KML                   (vector layer) (potentially unused)
            - requires query response to get 'public_fname'
            -  query to (url: '/apps/hydroshare-gis/add-generic-res-file')
            - seems like this is for 'Added files'
        - Tiled (seems as if    (tiled layer)

    */

    this.meta = {
        _user_defined: {},
        _defaults: {
            filterable: false,
            selectable: false,
            classifiable: false,
            html_id: this.id,
        },

    }

    // define additional properties for meta to get default values
    // if none are provided in instantiation
    Object.defineProperties(this.meta, {
        filterable: {
                get: function(){ return (!!this._user_defined.filterable)? this._user_defined.filterable: this._defaults.filterable; },
                set: function(newVal){ this._user_defined.filterable = newVal},
            },
        selectable: {
                get: function(){ return (!!this._user_defined.selectable)? this._user_defined.selectable: this._defaults.selectable; },
                set: function(newVal){ this._user_defined.selectable = newVal},
            },
        classifiable: {
                get: function(){ return (!!this._user_defined.classifiable)? this._user_defined.classifiable: this._defaults.classifiable; },
                set: function(newVal){ this._user_defined.classifiable = newVal},
            },
        html_id: {
                get: function(){ return (!!this._user_defined.html_id)? this._user_defined.html_id: this._defaults.html_id; },
                set: function(newVal){ this._user_defined.html_id = newVal},
            },
    })

}

// Prototyped layer method for generating an OpenLayers
// Tile layer for a generated layer.
Layer.prototype.get_OL_layer = function(){
    return new ol.layer.Tile({
        //name: this.display_name,
        name: this.id,
        extent: this.extents,
        source: new ol.source.TileWMS({
            url: this.wms_url,
            params: {
                'LAYERS': this.id,
                'TILED': true,
                // requires implementation of SLD_TEMPLATES
                //'SLD_BODY': layer_data.layer[].cssStyle()
            },
            serverType: "geoserver",
            crossOrigin: "Anonomous",
        }),
        visible: this.visible,
    })
}

// the layer manager is expected to accept upon initialization:
//  - target:       the target container (object containing layer_mgr ui
//                  and where events are passed for Layer_manager
//
//  - layerData:    the layer data object (collection of 'Layer' objects)
//
//  - map_container:    the container housing the map. (i.e. in our case the Map_Mgr's target container)
//                      (this will be where we feed map events to)
//

// TODO: need to remove direct references to: (should be possible with events/listeners)
//      GEOSERVER_DATA_MGR
//      SELECTION_MANAGER
//      SPINNER_MGR
//      INTERACTIVE_DIALOG_MGR

var LAYER_MANAGER = function(target, map_event_target, layerData){

    "use strict";

    /* -----------------------------------------
        LAYER_MANAGER Properties
    -----------------------------------------*/
        // verify that the passed target container id exists
        if($(target).length == 0)
            throw new Error("LAYER_MANAGER's Specified target container, '" + target +"', could not be found.")

        if($(map_event_target).length == 0)
            throw new Error("LAYER_MANAGER's Specified map container, '" + map_event_target +"', could not be found.")


        this._target = target;

        // selector to send layer events to (expected to accept add/remove/show/hide/update-z-index events)
        this._map_container = map_event_target;

        //var _target = null; // jquery reference to the target container of the layer manager

        this._default_layerdata = {};       // the layerdata indexed by layer_id
        this._default_enabled_layers = [];  // collection of id's for layers to be set to visuble
        this._default_layer_order = [];     // list of layer id's in the order they are to be displayed on the map

        // object mapping layer group id's to their child layer id's (also used for storing default ordering of child layers in group)
        //      mapped as {'group_id': ['child_layer_id1', ...]}
        this._layer_groups = {};
        this._additional_layer_groups = {};

        // object mapping layer id to it's selectable fields to be referenced by the SELECTION_MGR
        this._Layer_Properties_Meta = {};


        // mapping of layers linked to other EXTERNALLY GENERATED layers (for instance NEXUS's cutpoint layer)
        //  Object should be mapped the following way
        /*
            {
                'Parent_Layer_id':
                        {
                            'externally_linked_layer_id_1': [relative z-index (number > 1)],
                            'externally_linked_layer_id_2': [relative z-index (number > 1)],
                        },

            }

        */
        this._linked_layers_meta = {};

        // the default starting z index of layers in the layer manager
        this._start_z_index = 100;


    /* -----------------------------------------
        Preform initialization on declaration of a new instance
    -----------------------------------------*/


        // fire add event for each of the layers
        $.each(layerData, function(layer_id, layer_obj){
            $(this._map_container).trigger("_add_map_layer", [layer_obj])
        })

        // parse layer data into layer-listing html-element.
        var Layer_Listing_Object = this._Parse_Layer_Data_to_Object(layerData);

        // add listing object to it's target container
        $(this._target).html(Layer_Listing_Object);


        //  TODO: Watch for potential problems here
        //     may need to throw following block in another method for
        //      mapping DOM events/widgets

        // after loading the remainder of the page run the following


            // Initialize accordions and selectables
            $(".Layer_Group_accord").accordion({
                //header: "> div > h3",
                collapsible: true,
                heightStyle: 'content',

            });

            $(".Layer_Group_accord.start_collapsed").accordion("option", "active", false);


            // collapse any groups that have attribute 'collapse' == true

            // Initialize sortability of layer groups
            $("#Layer_Listing_wrapper").sortable({
                placeholder: "ui-state-highlight",
                start: function(e, ui){
                    ui.placeholder.height(ui.item.height());
                },
                handle: ".group_handle",
                helper : 'clone',
                update: this.Update_Layer_Draw_Order.bind(this),
            });

            $(".layer_sortable").sortable({
                revert: true,
                placeholder: "ui-state-highlight",
                start: function (e, ui) {
                    ui.placeholder.height(ui.item.height());
                },
                handle: ".layer_handle",
                helper : 'clone',
                update: this.Update_Layer_Draw_Order.bind(this),
            });


            //
            //$(".layer_sortable").disableSelection();

            // add click events to the enabler/info_selector/filter buttons

            $('.enabler').click(this._enabler_clicked_evt.bind(this));
            $('.info_selector').click(this._info_selector_clicked_evt.bind(this));
            $('.filtering_btn').click(this._filter_btn_clicked_evt.bind(this));


            // listen for events fired against target container
            $(this._target).on('_link_layer', this._layer_link_evt.bind(this))
            $(this._target).on('_unlink_layer', this._layer_unlink_evt.bind(this))

            $(this._target).on('_show_linked_layer', this._show_linked_evt.bind(this))
            $(this._target).on('_hide_linked_layer', this._hide_linked_evt.bind(this))

            $(this._target).on('_update_draw_order', this.Update_Layer_Draw_Order.bind(this))

            // generate map layers from loaded layerData
            this.Add_Map_layers();


            // set visiblity of layers to specified default
            this.Reset_Visible_Layers_To_Default();

            // set the z-index for all layers according to sort order
            this.Update_Layer_Draw_Order();

}


/* -----------------------------------------
    define prototype methods for Layer manager
-----------------------------------------*/
/* -----------------------------------------
    Externally Referenced
-----------------------------------------*/

/* ----- meta request methods -----*/
LAYER_MANAGER.prototype.get_Layer_Property_Meta = function(layerid, property, meta_field) {

    // if the layer id exists in layer property metadata return it's requested attribute
    if (!!this._Layer_Properties_Meta[layerid]) {

        // if a specific property was requested
        if (!!property) {

            // if a meta field was requested
            if (!!meta_field) {
                // if it exists return it
                // otherwise null
                if (!!this._Layer_Properties_Meta[layerid][property][meta_field]) {
                    return this._Layer_Properties_Meta[layerid][property][meta_field];
                }

                return null;

            }

            // if no meta field specified return all stored meta data for feature property
            return this._Layer_Properties_Meta[layerid][property];
        }


        return this._Layer_Properties_Meta[layerid];

    }
    return null;

}

LAYER_MANAGER.prototype.Get_layer_data = function (layer_id) {

    // get the layer data for a layer associated with passed layer_id

    var requested_layer_data = null;

    // check the default initialized layer data
    if (!!this._default_layerdata[layer_id]) {
        requested_layer_data = this._default_layerdata[layer_id];
    }

    // TODO: check any additional layer data


    return requested_layer_data;
}

LAYER_MANAGER.prototype.get_Layer_Meta = function(layerid, meta_field) {
                    // if the layer id exists in the collection return it's requested attribute
                    if (Object.keys(this._default_layerdata).indexOf(layerid) > -1) {
                        // if this layer has this attribute mapped return it
                        if (!!this._default_layerdata[layerid][meta_field]) {
                            return this._default_layerdata[layerid][meta_field];
                        }
                    }
                    return null;

                }


/* ----- linked layer methods -----*/

LAYER_MANAGER.prototype.Link_Layer = function (Parent_Layer_id, Child_Layer_id, Relative_z_index, legend) {

            // legend is optional so handle non-inclusion of parameter
            if (!!!legend) legend = null;

            // ensure parameters were specified
            if (!!Parent_Layer_id && !!Child_Layer_id && Relative_z_index && Relative_z_index > 0) {

                // if the parent isn't already linked to any child layers
                if (Object.keys(this._linked_layers_meta).indexOf(Parent_Layer_id) == -1) {

                    // initialize collection of linked layers for this parent
                    this._linked_layers_meta[Parent_Layer_id] = {};
                }

                // if the child is already present in the collection of children update it's z-index
                this._linked_layers_meta[Parent_Layer_id][Child_Layer_id] = {
                    'Relative_Z_index': Relative_z_index,
                    'visible': true,
                    'legend': legend,
                }


            }

        }

LAYER_MANAGER.prototype.Unlink_Layer = function (Parent_Layer_id, Child_Layer_id) {

            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) delete this._linked_layers_meta[Parent_Layer_id][Child_Layer_id];

                $(this._map_container).trigger('_remove_map_layer', [Child_Layer_id])

            }
        }

LAYER_MANAGER.prototype.hide_Linked_Layer = function (Parent_Layer_id, Child_Layer_id) {
            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {
                    this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['visible'] = false;

                    // if there's a legend remove it from the legend container and if it's empty hide it
                    if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['legend']) {

                    }

                    $(this._map_container).trigger('_hide_map_layer', [Child_Layer_id])
                }

            }
        }

LAYER_MANAGER.prototype.show_Linked_Layer = function (Parent_Layer_id, Child_Layer_id) {

            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {
                    this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['visible'] = true;

                    // if there's a legend show the legend container and append it to it
                    if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['legend']) {

                    }

                    $(this._map_container).trigger('_show_map_layer', [Child_Layer_id])
                }

            }
        }


/* ----- triggered methods -----*/
LAYER_MANAGER.prototype.Update_Layer_Draw_Order = function() {

                // grab the listing of layer entries (in reverse so 'Higher' items in the listing will be over lower items)
                var layer_entries = $('.layer_entry').get().reverse();


                var drawn = 0; // keep a count of drawn for linked layers

                $.each(layer_entries, function (index, layer_entry) {

                    var layer_id = $(layer_entry).attr('id');
                    var z_index = this._start_z_index + drawn;

                    $(this._map_container).trigger('_update_map_layer_z', [layer_id, z_index])

                    drawn++;

                    // check for any linked layers for the current layer
                    if (typeof (this._linked_layers_meta) != "undefined" && !!this._linked_layers_meta[layer_id]) {


                        // if so set the z-index for it's linked layers to the specified relative z-index
                        $.each(this._linked_layers_meta[layer_id], function (child_id, child_meta) {
                            if (child_meta['visible']) {

                                var new_z = z_index + child_meta['Relative_Z_index'];
                                $(this._map_container).trigger('_update_map_layer_z', [child_id, new_z])

                                drawn++;
                            }

                        }.bind(this));

                    }


                }.bind(this));


            }



/* -----------------------------------------
    END Externally Referenced
-----------------------------------------*/


    /* -----------------------------------------
        Parsing layer data
    -----------------------------------------*/
        LAYER_MANAGER.prototype._Parse_Layer_Data_to_Object = function(layerData) {

            // if there is no layer data passed return without generating anything
            if(typeof (layerData) == "undefined" || layerData == null)
                return

            var Parsed_Obj = $(document.createElement('div'));
            Parsed_Obj.attr('id', 'Layer_Listing_wrapper');



            // layerData is a list of objects
            //      objects have 'data' objects and optional child lists
            //
            for(var i = 0; i < layerData.length; i++)
            {
                // if has children create accordion object and generate sortable listing entry for each child layer
                var listing_obj = this.Generate_Layer_Sortable_Listing();

                // TODO: Grouping should be handled differently (probably just a meta field on layers, specifying group)
                if (layerData[i].type == 'Group') {

                    throw new Error('Group functionality of layers not implemented')

                    // TODO: make this work
                    var children = layerData[i].children;
                    var group_id = layerData[i].Group_data.id;
                    var group_title = layerData[i].Group_data.title;
                    var start_collapsed = layerData[i].Group_data.collapse;

                    var Accord_obj = this.Generate_Layer_Group_Accord(group_id, group_title);

                    if (!!start_collapsed) Accord_obj.addClass('start_collapsed');

                    this._layer_groups[group_id] = [];

                    for (var j = 0; j < children.length; j++) {

                        var layer_id = children[j].id;
                        var layer_title = children[j].title;
                        var info_selectable = (!!children[j].Selectable);
                        var filtering_enabled = (!!children[j].Filterable);
                        var layer_type = (!!children[j].geometry_type) ? children[j].geometry_type : "";
                        var default_enabled = (!!children[j].Default_Enabled)? children[j].Default_Enabled: false;

                        if (layer_type == "raster") {
                            filtering_enabled = false;
                            info_selectable = false;
                        }

                        // map the layer to it's geoserver layer reference in the Geoserver_data_mgr
                        GEOSERVER_DATA_MGR.map_Layer_ID_to_Server_Layer(layer_id, children[j].Layer_Reference);

                        // this cant happen here because calls conflict with each other if not timed properly
                        //GEOSERVER_DATA_MGR.Load_Layer_Attribute_Meta(layer_id);
                        //SPINNER_MGR.Register_Query(GEOSERVER_DATA_MGR.Load_Layer_Attribute_Meta(layer_id), null, null, '#map');

                        // if this layer is enabled by default store it's id in the default collection
                        if (default_enabled) this._default_enabled_layers.push(layer_id);


                        // if there are feature variable mappings store them for later use
                        if (!!children[j].Feature_Properties_Meta) {
                            this._Layer_Properties_Meta[layer_id] = children[j].Feature_Properties_Meta;
                        }


                        // keep track of it's parent
                        this._layer_groups[group_id].push(layer_id);

                        // store a record of it's layer data indexed by it's id
                        this._default_layerdata[layer_id] = children[j];

                        // keep track of the layer's load order for z-ordering
                        this._default_layer_order.push(layer_id);

                        var list_entry = this.Generate_Layer_Sortable_Entry(true, layer_id, layer_title, layer_type, filtering_enabled, info_selectable);
                        listing_obj.append(list_entry);

                        //GEOSERVER_DATA_MGR._Load_Layer_Values(layer_id);
                        if (layer_type != 'raster') {
                            SPINNER_MGR.Register_Query(
                                GEOSERVER_DATA_MGR._Load_Layer_Attribute_Meta(layer_id),
                                (filtering_enabled) ?
                                GEOSERVER_DATA_MGR._Load_Layer_Values :
                                null,
                                [layer_id],
                                '#map');
                        }

                    }
                    Accord_obj.find('.Layer_Listing').append(listing_obj);
                    Parsed_Obj.append(Accord_obj);

                } else {    // otherwise create layer listing


                    // map the layer to it's geoserver layer reference in the Geoserver_data_mgr
                    //GEOSERVER_DATA_MGR.map_Layer_ID_to_Server_Layer(layerData[i].id, layerData[i].id);

                    // TODO: add this back when structure is defined
                    //GEOSERVER_DATA_MGR.map_Layer_ID_to_Server_Layer(layerData[i].meta.html_id, layerData[i].id);

                    // if this layer is enabled by default store it's id in the default collection
                    if (layerData[i].visible) this._default_enabled_layers.push(layerData[i].meta.html_id);


                    // if there are feature variable mappings store them for later use
                    if (!!layerData[i].Feature_Properties_Meta) {
                        this._Layer_Properties_Meta[layerData[i].meta.html_id] = layerData[i].Feature_Properties_Meta;
                    }


                    // keep track of it's parent
                    //_layer_groups[group_id].push(layer_id);

                    // store a record of it's layer data indexed by it's id
                    this._default_layerdata[layerData[i].meta.html_id] = layerData[i];

                    // keep track of the layer's load order for z-ordering
                    this._default_layer_order.push(layerData[i].meta.html_id);

                    var list_entry = this.Generate_Layer_Sortable_Entry(layerData[i]);
                    listing_obj.append(list_entry);

                    // TODO: causes issues... fix over time
    //                    if (layerData[i].geometry_type != 'raster') {
    //                        // trigger the data load for this layer
    //                        SPINNER_MGR.Register_Query(GEOSERVER_DATA_MGR.Load_Layer_Attribute_Meta(layer_id),
    //                            (layerData[i].meta.filterable) ?
    //                            GEOSERVER_DATA_MGR._Load_Layer_Values
    //                            //: null, [layerData.id], '#map');
    //                            : null, [layerData[i].meta.html_id], '#map');
    //
    //                    }



                    Parsed_Obj.append(listing_obj);
                }


            }

            return Parsed_Obj;
        }


    /* -----------------------------------------
        layer interaction methods
    -----------------------------------------*/

        LAYER_MANAGER.prototype.check_layer = function () {
                var args = arguments;
                for (var i = 0; i < args.length; i++) {
                    var layer_id = args[i];
                    if (!!layer_id) {

                        if (!this.Layer_Enabled(layer_id)) {
                            $('#' + layer_id + "_enabler").click();
                        }

                    }

                }
            }

        LAYER_MANAGER.prototype.uncheck_layer = function () {
                var args = arguments;
                for (var i = 0; i < args.length; i++) {
                    var layer_id = args[i];
                    if (!!layer_id) {

                        if (this.Layer_Enabled(layer_id)) {
                            $('#' + layer_id + "_enabler").click();

                        }
                    }
                }
            }

        LAYER_MANAGER.prototype.uncheck_all_layers = function () {
                var mgr = this
                $.each(Object.keys(this._default_layerdata), function (i,layer_id) {
                    mgr.uncheck_layer(layer_id);
                });
            }







    /* -----------------------------------------
        Event Handling
    -----------------------------------------*/

        LAYER_MANAGER.prototype._enabler_clicked_evt = function(evt) {
            evt.stopPropagation();

            $(evt.target).toggleClass('enabled');

            //TODO: add conditions for if group or layer selected
            this._enabler_changed_evt(evt.target);
        }

        LAYER_MANAGER.prototype._enabler_changed_evt = function(obj) {

            // if this is a group enabler enabler, enable all child layers
            if (this._layer_groups.hasOwnProperty($(obj).attr('linked_layer'))) {

                if ($(obj).hasClass('enabled')) {
                    $.each(this._layer_groups[$(obj).attr('linked_layer')], function(i, layer_id) { this.check_layer(layer_id); });
                    $($(obj).attr('linked_layer')).addClass('enabled');
                } else {
                    $.each(this._layer_groups[$(obj).attr('linked_layer')], function (i, layer_id) { this.uncheck_layer(layer_id); });
                }

            } else {

                var layer_selector = $(obj).parent().find('.info_selector');
                var filtering_btn = $(obj).parent().find('.filtering_btn');

                // if enabling the layer
                if ($(obj).hasClass('enabled')) {
                    layer_selector.removeClass('disabled');
                    filtering_btn.removeClass('disabled');

                    $(this._map_container).trigger('_show_map_layer', [$(obj).attr('linked_layer')])

                    // show any linked child layers if they are set to visible
                    if (!!this._linked_layers_meta[$(obj).attr('linked_layer')]) {


                        $.each(this._linked_layers_meta[$(obj).attr('linked_layer')], function (child_id, child_layer_meta) {

                            if (child_layer_meta['visible']) {
                                $(this._map_container).trigger('_show_map_layer', [$(obj).attr('linked_layer')])
                            }


                        }.bind(this));

                    }


                } else { // if disabling the layer

                    // if the current layer being disabled is the selection layer, clear selection and remove active selection layer
                    //if (SELECTION_MANAGER._active_selection_layer_ID == $(obj).attr('linked_layer')) {
                    if (!!layer_selector && layer_selector.length > 0 && layer_selector.hasClass('enabled')) {

                        layer_selector.removeClass('enabled');
                        SELECTION_MANAGER.clear_selection();
                        SELECTION_MANAGER._toggle_info_selection(false);

                    }

                    // if the current layer being disabled is filterable disable the filtering button and close it's dialog
                    if (!!filtering_btn && filtering_btn.length > 0 && filtering_btn.hasClass('enabled')) {
                        filtering_btn.removeClass('enabled');

                        //close filtering dialog if it's open
                        INTERACTIVE_DIALOG_MGR.close_dialog($(obj).attr('linked_layer'));
                    }

                    layer_selector.addClass('disabled');
                    filtering_btn.addClass('disabled');

                    $(this._map_container).trigger('_hide_map_layer', [$(obj).attr('linked_layer')])

                    // show any linked child layers
                    if (!!this._linked_layers_meta[$(obj).attr('linked_layer')]) {

                        $.each(this._linked_layers_meta[$(obj).attr('linked_layer')], function (child_id, val) {
                            $(this._map_container).trigger('_show_map_layer', [child_id])
                        }.bind(this));
                    }
                }

                // check if there's a parent group for this layer and add 'partial' or 'enabled' class to parent enabler respectivly
                $.each(this._layer_groups, function (group_id, layers) {
                    // if the current layer being enabled is in this group

                    if (layers.indexOf($(obj).attr('linked_layer')) != -1) {
                        $('#' + group_id + '_enabler').removeClass('enabled');
                        $('#' + group_id + '_enabler').removeClass('partial');

                        var total_enabled = 0;
                        $.each(layers, function (i, layer_id) { if (this.Layer_Enabled(layer_id)) total_enabled++; });

                        if (total_enabled == layers.length) {
                            $('#' + group_id + '_enabler').addClass('enabled');

                        } else if (total_enabled > 0) {
                            $('#' + group_id + '_enabler').addClass('partial');
                        }
                    }
                });

            }
        }

        LAYER_MANAGER.prototype._info_selector_clicked_evt = function (evt) {
            evt.stopPropagation();

            if (!$(evt.target).hasClass('disabled')) {

                if (!$(evt.target).hasClass('enabled')) {

                    // remove enabled from any other '.info_selector'
                    $('.info_selector').removeClass('enabled');

                    // enable this layer
                    $(evt.target).toggleClass('enabled');

                    //TODO: add conditions for if group or layer selected
                    if (!!$(evt.target).attr('linked_layer')) {
                        SELECTION_MANAGER.set_active_selection_layer($(evt.target).attr('linked_layer'));
                        SELECTION_MANAGER._toggle_info_selection(true);
                    }
                } else {

                    $(evt.target).toggleClass('enabled');
                    SELECTION_MANAGER.clear_selection();
                    SELECTION_MANAGER._toggle_info_selection(false);
                }
            }

        }

        LAYER_MANAGER.prototype._filter_btn_clicked_evt = function (evt) {
            evt.stopPropagation();

            if (!$(evt.target).hasClass('disabled')) {

                if (!$(evt.target).hasClass('enabled')) {

                    // remove enabled from any other '.filtering_btn'
                    //$('.filtering_btn').removeClass('enabled');

                    // enable this layer
                    $(evt.target).toggleClass('enabled');

                    //TODO: add conditions for if group or layer selected
                    if (!!$(evt.target).attr('linked_layer')) {

                        INTERACTIVE_DIALOG_MGR.open_dialog($(evt.target).attr('linked_layer'));

                    }

                } else {

                    $(evt.target).toggleClass('enabled');

                    INTERACTIVE_DIALOG_MGR.close_dialog($(evt.target).attr('linked_layer'));
                }
            }

        }


        LAYER_MANAGER.prototype._layer_link_evt = function(evt, Parent_Layer_id, Child_Layer_id, Relative_z_index, legend){
                // check for valid call to event
                if(!(this instanceof LAYER_MANAGER)) throw new Error("LAYER_MANAGER: _layer_linked_evt was called without binding 'this' to LAYER_MANAGER instance (add '.bind(...)' to the event method definition)")

                console.log("LAYER_MANAGER: layer_link event fired");
            }

        LAYER_MANAGER.prototype._layer_unlink_evt = function(evt, Parent_Layer_id, Child_Layer_id){
                // check for valid call to event
                if(!(this instanceof LAYER_MANAGER)) throw new Error("LAYER_MANAGER: _layer_linked_evt was called without binding 'this' to LAYER_MANAGER instance (add '.bind(...)' to the event method definition)")

                console.log("LAYER_MANAGER: layer_unlink event fired");
            }

        LAYER_MANAGER.prototype._show_linked_evt = function(evt, Parent_Layer_id, Child_Layer_id){
                // check for valid call to event
                if(!(this instanceof LAYER_MANAGER)) throw new Error("LAYER_MANAGER: _layer_linked_evt was called without binding 'this' to LAYER_MANAGER instance (add '.bind(...)' to the event method definition)")

                console.log("LAYER_MANAGER: show_linked event fired");
            }

        LAYER_MANAGER.prototype._hide_linked_evt = function(evt, Parent_Layer_id, Child_Layer_id){
                // check for valid call to event
                if(!(this instanceof LAYER_MANAGER)) throw new Error("LAYER_MANAGER: _layer_linked_evt was called without binding 'this' to LAYER_MANAGER instance (add '.bind(...)' to the event method definition)")

                console.log("LAYER_MANAGER: hide_linked event fired");
            }

    /* -----------------------------------------
        Layer visibility methods
    -----------------------------------------*/

        // reset visible layers to initial state
        LAYER_MANAGER.prototype.Reset_Visible_Layers_To_Default = function () {

                // uncheck all visible layers if any
                this.uncheck_all_layers();

                // check the default layers
                this.check_layer.apply(this, this._default_enabled_layers);

            }


    /* -----------------------------------------
        Layer Sorting Methods
    -----------------------------------------*/
        // reset the ordering of the layers to the initial loaded state
        LAYER_MANAGER.prototype.Reset_Ordering = function () {
            debugger;
            //var current_layer_order =

        }

    /* -----------------------------------------
        Utility Methods / Functionality
    -----------------------------------------*/

        LAYER_MANAGER.prototype.Layer_Enabled = function (Layer_id) {
            var enabler = $('#' + Layer_id + '_enabler');
            if (enabler.length > 0) {
                return enabler.hasClass('enabled');
            }
            return false;
        }


        // add all layers in layer data to the map by triggering _add_map_layer event with the layer
        LAYER_MANAGER.prototype.Add_Map_layers = function () {
            // for each layer in layer data
            //var layerdata_obj = Get_Combined_layerdata();


            // add layers to the map for all of the initial layers
            $.each(this._default_layerdata, function (layer_id, layer) {

                // check for a legend definition, if there is one generate the legend HTML object
                var legend_def = (typeof (layer.Legend) != "undefined") ? layer.Legend : null;
                var legend_obj = (!!legend_def)? this.Generate_Legend_obj(legend_def) : null;

                // generate the legend object if there is a legend definition
                if (layer.meta.selectable) {
                    SELECTION_MANAGER.add_selectable_layer_info(layer.id, layer.geometry_type, layer.id);
                }

                var new_layer = layer.get_OL_layer();

                // generate Map layer from layer dataa
//                            var new_layer = new ol.layer.Tile({
//                                visible: false,
//                                name: layer_id,
//                                source: new ol.source.TileWMS({
//                                    //url: GEOSERVER_DATA_MGR._proxy_prefix + encodeURIComponent(MAP_MGR._WMS_URL), // DIDNT WORK TO RESOLVE MAP CANVAS EXPORT
//                                    url: MAP_MGR._WMS_URL,
//                                    params: {
//                                        'FORMAT': 'image/png',
//                                        'VERSION': '1.1.1',
//                                        tiled: true,
//                                        LAYERS: serverside_layerName,
//                                        serverType: 'geoserver',
//                                    }
//                                }),
//                            });

                if(!!legend_obj) legend_obj.attr('id', '{0}_lyr_legend'.format(layer.meta.html_id));

                $(this._map_container).trigger('_add_map_layer', [new_layer])

            }.bind(this));
        }


        LAYER_MANAGER.prototype.is_visible_Linked_Layer = function (Parent_Layer_id, Child_Layer_id) {
            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {
                    return this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['visible'];
                }
            }
            return false;
        }

    /* -----------------------------------------
        Layer Sortable Generation
    -----------------------------------------*/

        LAYER_MANAGER.prototype.Generate_Layer_Group_Accord = function(Group_Id, Group_Title) {

            //<div id="[GROUP ID]" class="Layer_Group_accord">
            //    <div class="group">
            //        <h3 class="group_title"><div class="enabler..."></div><div class="group_handle">[ICON] Group Name </div></h3>
            //        <div class="Layer_Listing">
            //          [CHILD LAYER SORTABLE]
            //        </div>
            //    </div>
            //</div>

            // create the accordion container and add any classes/id's to it
            var Group_Accord = $(document.createElement('div'));
            Group_Accord.attr('id', Group_Id);
            Group_Accord.addClass('Layer_Group_accord');

            // create the accordion header object and add any required elements
            var Accord_header = $(document.createElement('h3'));
            var enabler = this.Generate_Enabler(Group_Id); //$(document.createElement('div'));
            var Header_handle = $(document.createElement('div'));

            Header_handle.addClass('group_handle');
            Header_handle.html(Group_Title);

            Accord_header.addClass("group_title");
            Accord_header.append(enabler);
            Accord_header.append(Header_handle);


            // create the accordion content portion and add any required elements
            var Accord_Content = $(document.createElement('div'));
            Accord_Content.addClass('Layer_Listing');

            Group_Accord.append(Accord_header);
            Group_Accord.append(Accord_Content);

            // add accordion group id to _initial_ordering

            return Group_Accord;
        }

        LAYER_MANAGER.prototype.Generate_Layer_Sortable_Listing = function() {
            var Layer_list = $(document.createElement('ul'));
            Layer_list.addClass('layer_sortable');

            return Layer_list;
        }

        LAYER_MANAGER.prototype.Generate_Layer_Sortable_Entry = function (layer_obj) {
            //<ul class="layer_sortable">
            //    <li id="[LAYER ID]" class="layer_entry ui-state-default">
            //      <div class="enabler...">SHould be a checkbox</div>
            //      <div class="layer_handle">
            //        [ICON] Group Name [optional selection icon]
            //      </div>
            //    </li>
            //    <li class="ui-state-default">...</li>
            //    ...
            //</ul>

            var grouped = false // should read from meta


            var Layer_list_item = $(document.createElement('li'));

            Layer_list_item.attr('id', layer_obj.meta.html_id);
            Layer_list_item.attr('data-id', layer_obj.id);
            Layer_list_item.attr('data-resource-id', layer_obj.resource_id);


            //Layer_list_item.attr('id', layer_obj.id);

            Layer_list_item.addClass('layer_entry');
            Layer_list_item.addClass('ui-state-default');


            //var enabler = this.Generate_Enabler(Layer_Id);
            var enabler = this.Generate_Enabler(layer_obj);
            var Layer_handle = $(document.createElement('div'));

            // if the layer is grouped add a layer handle, otherwise add a group handle (so it's sortable with groups)
            if (!!grouped) Layer_handle.addClass('layer_handle');
            else Layer_handle.addClass('group_handle');


            var text = $(document.createElement('div'));
            text.addClass('layer_text');
            text.append(layer_obj.display_name);

            var icon = $(document.createElement('img'));
            icon.addClass("layer_type_icon");

            switch (layer_obj.geometry_type) {
                //case "shape":
                case "polygon":
                    icon.attr('src', '/static/module/images/Map_Icons/Layer_Icons/default_shape_layer_icon.png');
                    break;

                case "line":
                    icon.attr('src', '/static/module/images/Map_Icons/Layer_Icons/default_line_layer_icon.png');
                    break;

                case "point":
                    icon.attr('src', '/static/module/images/Map_Icons/Layer_Icons/default_point_layer_icon.png');
                    break;

                case "raster":
                    icon.attr('src', '/static/module/images/Map_Icons/Layer_Icons/default_raster_layer_icon.png');
                    break;

                default:
                    icon.attr('src', '/static/module/images/Map_Icons/Layer_Icons/default_layer_icon.png');
                    break;
            }


            // Add the checkbox, icon, and optional layer Selection button
            Layer_handle.append(icon);
            Layer_handle.append(text);
            //Layer_handle.append(Layer_Name);

            Layer_list_item.append(enabler);
            Layer_list_item.append(Layer_handle);

            if (layer_obj.meta.filterable) {
                var filter_btn = this.Generate_Filtering_button(layer_obj);
                Layer_list_item.append(filter_btn);
            }

            if (layer_obj.meta.selectable) {
                var selector = this.Generate_Info_Selector(layer_obj);
                Layer_list_item.append(selector);
            }

            // add Layer item id to _initial_ordering

            return Layer_list_item;
        }

        LAYER_MANAGER.prototype.Generate_Enabler = function(layer_obj) {

            var enabler = $(document.createElement('div'));

            enabler.attr('id', layer_obj.meta.html_id + '_enabler');
            enabler.attr('title', 'Click to toggle visiblity of this layer on the map.');
            enabler.attr('linked_layer', layer_obj.id);
            enabler.attr('data-resource-id', layer_obj.resource_id);

            enabler.addClass('enabler');

            return enabler;

        }

        LAYER_MANAGER.prototype.Generate_Info_Selector = function (layer_obj) {

            var selector = $(document.createElement('div'));

            selector.addClass('layer_action_btn');
            selector.attr('id', layer_obj.meta.html_id + '_selector');
            selector.attr('title', 'Click to toggle feature info selection. (layer must be visible to enable selection)');
            selector.attr('linked_layer', layer_obj.id);
            selector.attr('data-resource-id', layer_obj.resource_id);
            selector.addClass('info_selector');

            // defaults as disabled until layer is visible
            selector.addClass('disabled');

            return selector;
        }

        LAYER_MANAGER.prototype.Generate_Filtering_button = function (layer_obj) {

            var Filtering_btn = $(document.createElement('div'));

            Filtering_btn.addClass('layer_action_btn');
            Filtering_btn.attr('id', layer_obj.meta.html_id + '_Filtering_btn');
            Filtering_btn.attr('title', 'Click Open Interaction Dialog for this layer. (layer must be visible to enable Interaction)');
            Filtering_btn.attr('linked_layer', layer_obj.id);
            Filtering_btn.attr('data-resource-id', layer_obj.resource_id);
            Filtering_btn.addClass('filtering_btn');

            // defaults as disabled until layer is visible
            Filtering_btn.addClass('disabled');

            return Filtering_btn;
        }

        LAYER_MANAGER.prototype.Generate_Legend_obj = function (legend_def) {

            // generate wrapper
            var legend_wrapper = $(document.createElement('div'));
            legend_wrapper.addClass("layer_legend");

            // generate title object
            var legend_title = null;

            if (!!legend_def.title) {
                legend_title = $(document.createElement('div'));
                legend_title.addClass('legend_title');
                legend_title.append(legend_def.title);
            }
            legend_wrapper.append(legend_title);

            // generate table row for each legend item
            if (!!legend_def.items) {

                $.each(legend_def.items, function(index, item) {

                    // legend_row
                    //  legend_icon_cell
                    //      legend_icon_img || legend_color_block
                    //  legend_desc_cell
                    //
                    var new_row = $(document.createElement('div'));
                    new_row.addClass('legend_row');

                    var new_legend_icon_cell = $(document.createElement('div'));
                    new_legend_icon_cell.addClass("legend_icon_cell");


                    if (!!item.icon) {
                        var new_icon_img_tag = $(document.createElement('img'));
                        new_icon_img_tag.addClass('legend_icon_img');
                        new_icon_img_tag.attr('src', item.icon);

                        new_legend_icon_cell.append(new_icon_img_tag);

                    }else if (!!item.color) {
                        var new_color_block = $(document.createElement('div'));
                        new_color_block.addClass('legend_color_block');
                        new_color_block.css('background-color', item.color);

                        new_legend_icon_cell.append(new_color_block);
                    }

                    var new_legend_desc_cell = $(document.createElement('div'));
                    new_legend_desc_cell.addClass("legend_desc_cell");
                    new_legend_desc_cell.append((!!item.desc) ? item.desc : "no legend description...");

                    new_row.append(new_legend_icon_cell);
                    new_row.append(new_legend_desc_cell);

                    legend_wrapper.append(new_row);
                });


            }

            return legend_wrapper;

        }

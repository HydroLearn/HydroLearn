// grabs layer attributes for all layers in the workspace specified by the wfs url
//  mapping a layer id to a collection of {attr_name: "column_name", attr_type: "[string,int,number,etc]"}
//
//  TODO: eliminate dependancies on:
//      - Layer_Mgr
//      - Spinner_Mgr
//
//      NOTE:   this component is currently non functional as it is undergoing
//              restructuring.
//

function GEOSERVER_DATA_MGR(layer){

    /* -----------------------------------------
        NEW IMPLEMENTATION
            expected to be instantiated within a layer
            (moving away from singleton approach)
    -----------------------------------------*/

    if(!(layer instanceof Layer))
        throw new Error("GEOSERVER_DATA_MGR: Manager must be instantiated with object derived from 'Layer' object, i.e. new Layer(...)")

    // record the wms url for querying attribute/feature data
    this.wms_url = layer.wms_url

    // a list of attributes for a layer
    this.attributes = layer.attributes;

    // meta information for attributes
    //  (display_name/filtering_type/selectable/classifiable/etc.)
    this.attributes_meta = {};
    $.each(this.attributes, function(index, value){
        this.attributes_meta[value] = {};
    })

    /* -----------------------------------------
        GEOSERVER_DATA_MGR Properties
    -----------------------------------------*/



    /* -----------------------------------------
        GEOSERVER_DATA_MGR Properties
    -----------------------------------------*/

/* -----------------------------------------
    Externally referenced
    TODO: eliminate these references in other components
-----------------------------------------*/
    this._WORKSPACE = "";
    this._WORKSPACE_URL = "";

    // theoretically this will not be used anymore, but potentially may have to to get data
    this._proxy_prefix = "/CGI-BIN/proxy.ashx?url=";
    this._proxy_workspace_relative_path = "";

    // old way
    // this._proxy_workspace_relative_path = "/geoserver/".concat(WMS_WORKSPACE).concat("/wms");

    this._classification_methods = {
        "jenks": "Natural Breaks (Jenks)",
        "quantile": "Quantile",
        "eq_int": "Equal Interval",
        "std_dev": "Standard Deviation"
    };
    this._classification_default_method = "jenks";
    this._classification_min_cuts = 3;
    this._classification_max_cuts = 15;
    this._classification_default_cuts = 10;

/* -----------------------------------------
    Externally referenced
-----------------------------------------*/


    // object to map Layer_id's to their representative layer in GEOSERVER {'LAYER_MGR_id': 'GEOSERVER_LAYER_REF'}
    this._Layer_Mapping = {};

    // collection mapping WMS layers to an object mapping their attributes to metadata about that attribute
    this._Attribute_Metadata = {};
    this._Attribute_Metadata_LoadStatus = {};

    /* collection of loaded layer values queried from Geoserver
         constructed as:
         {
            'Layer_ID' : {
                'Attr_id': [{'feature1_id':'value'},{'feature2_id':'value'}, ... ]
            }
         }
    */
    this._Loaded_Layer_Values = {};

    /* collection of boolean values keeping track of feature ids loaded under each attribute type
        constructed as:
         {
            'Layer_ID' : {
                'Attr_id': {
                    'feature1_id': true  // only if the feature id has been added to _Loaded_Layer_Values otherwise key wont exist

                }
            }
         }
    */
    this._Loaded_Feature_Record = {};

    // each layer can have a single data display layer do display filtering/Classification data
    // indexed by layer_id
    this._Data_Display_Layers = {};

    // Generated SLD style links, indexed by layer_id
    this._Data_Layer_Styles = {};

    this._Data_Display_Layers_SOURCE_PARAMS = {
        FORMAT: 'image/png',
        VERSION: '1.1.1',

        // add dynamic style later
        StyleFormat: 'sld',

    };

    // TODO: this should define a style object for use by SLD_TEMPLATES
    this._Filter_Layer_Styles = {
        'point': "Point_Filtered_Styling",
        'shape': "Polygon_Filtered_Styling",
        'line': "Line_Filtered_Styling",
    };

    this._Filter_Layer_Styles_v2 = {
        'point': {
            "point-shape": "circle",
            "fill": "#30F489",
            "fill-opacity": "0.7",
            "stroke":"#cccccc",
            "stroke-opacity":"1",
            "stroke-width":"1",
        },

        'shape': {
                "stroke":"#cccccc",
                "stroke-opacity":"1",
                "stroke-width":"1",
                "fill":"#30F489",
                "fill-opacity":"0.7",
                "labels":false,
            },

        'line': {
                "stroke":"#00ff00",
                "stroke-opacity":"0.8",
                "stroke-width":"1.5",
                "labels":false,
            },
    };



    /* -----------------------------------------
        Preform initialization on declaration of a new instance
    -----------------------------------------*/


    // TODO: this isn't correct anymore, now it's based on the layer's specified url
    //this._WORKSPACE_URL = location.protocol.concat("//").concat(window.location.hostname).concat("/geoserver/");

    //if (!!WORKSPACE) {
    //    this._WORKSPACE = WORKSPACE;
    //    this._WORKSPACE_URL = this._WORKSPACE_URL.concat(WORKSPACE + '/');
    //
    //    this._proxy_workspace_relative_path = "/geoserver/".concat(WMS_WORKSPACE).concat("/wms");
    //}
    //this._WORKSPACE_URL = this._WORKSPACE_URL.concat("wms");

}

/* -----------------------------------------
    Externally referenced methods
-----------------------------------------*/

//TODO:     this may not be needed anymore if going with single instances within layer
//          map a system layer_id to it's server reference layer in geoserver
GEOSERVER_DATA_MGR.prototype.map_Layer_ID_to_Server_Layer = function(layer_ID, layer_ref) {

    if (!!layer_ID && !!layer_ref) {
        this._Layer_Mapping[layer_ID] = layer_ref;
    }
}


/* ----- loading methods ----- */
// TODO: Theoretically these shouldn't be accessed outside of the object
//      everything needed is contained within the object
GEOSERVER_DATA_MGR.prototype._is_Feature_Loaded = function(layer_ID, Feature_ID) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!Feature_ID || !!!server_layer_name) {
            return false;
        }

        // get list of selection layer attributes expected for this feature
        var expected_attrs = LAYER_MGR.get_Layer_Property_Meta(layer_ID);

        if (!!expected_attrs) {

            // be optimistic and assume true until proven wrong
            var all_attr_loaded = true;

            // check the attr fields against loaded layer values to ensure they all loaded
            $.each(expected_attrs, function(Attr_id) {
                // if the current attribute doesn't have a record of this feature id, set all good to false, and break the loop
                if (!this.is_Feature_Attribute_Loaded(layer_ID, Attr_id, Feature_ID)) {
                    all_attr_loaded = false;
                    return false;
                }
            }.bind(this));

            // if haven't returned by now everything was found return true
            return all_attr_loaded;
        }

        // not ready for the case where feature values are not defined in layer data so return false
        return false;

    }

GEOSERVER_DATA_MGR.prototype._Load_Feature_Values = function(layer_ID, Feature_ID) {
        /*
            method to query for the data values associated with the specified layer's feature represented by the passed Feature_ID
                - gets a list of all of this feature's attributes mapped to the value for this feature and stores it's values in _Loaded_Vals lookup
        */
        if (!!!layer_ID || !!!Feature_ID || !!!this.get_Server_Layer_Mapping(layer_ID)) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Feature_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }


        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);
        var url_params = {};

        // set up the url parameters to be passed with the request for layer feature properties
        url_params['service'] = 'wfs';
        url_params['version'] = '2.0.0';
        url_params['request'] = 'GetFeature';
        url_params['outputformat'] = 'application/json';
        url_params['typename'] = this._WORKSPACE + ":" + server_layer_name; // wms_namespace:wms_layer_name
        url_params['featureID'] = Feature_ID;


        var restricted_fields = LAYER_MGR.get_Layer_Property_Meta(layer_ID);
        if (!!restricted_fields) {

            // restricting in URL doesn't work when querying for all attributes so just record restricted field names
            url_params['propertyName'] = Object.keys(restricted_fields).join(',');
            //restricted_fields = Object.keys(restricted_fields);
        }


        var request_url = encodeURIComponent(this._proxy_workspace_relative_path + '?' + $.map(url_params, function (val, key) { return key + '=' + val; }).join('&'));

        //var return_obj = {};

        return $.ajax({
            url: this._proxy_prefix + request_url,
            type: "post",
            dataType: "json",
            success: function(response) {

                //console.log("SUCCESS: loaded attribute values for: '{0}:{1}'".format(layer_ID, Attribute_ID));
                if (response.features.length) {

                    // ensure there are properties present from query
                    if (Object.keys(response.features[0].properties).length && response.features[0].properties.constructor === Object) {


                        // For each attribute for the retrieved feature record it's attribute values
                        //  in GEOSERVER_DATA_MGR._Loaded_Layer_Values
                        $.each(response.features[0].properties, function(Attribute_ID, val) {
                            // mark the feature in the loaded record
                            this._add_Loaded_feature(layer_ID, Attribute_ID, Feature_ID, val);

                            // set up the return object
                            //return_obj[Attribute_ID] = val;
                        });


                    }

                } else {
                    console.log("ERROR: No attribute data found for Layer Attribute {0}:{1}'".format(layer_ID, Attribute_ID));
                }

            },
            error: function(msg) {
                console.log("ERROR: Failed to load Feature data for: '{0}:{1}'".format(layer_ID, Feature_ID));
                console.log(msg.responseText);
            }
        });

        //return return_obj;
    }

GEOSERVER_DATA_MGR.prototype._Load_Layer_Attribute_Meta = function(layer_id) {
        /*
            method to query for Feature Type Property values from WFS service and store for later reference
            typically called after mapping local layer_ID to server reference layer_ID

            - creates a listing of attributes associated with this layer's features mapped to their datatypes
        */

        if (!!!layer_id || !!!this.get_Server_Layer_Mapping(layer_id)) {
            console.log("ERROR: could not load layer properties for '" + layer_id + "'");
            return null;
        }

        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);
        var url_params = {};

        // set up the url parameters to be passed with the request for layer feature properties
        url_params['service'] = 'wfs';
        url_params['version'] = '2.0.0';
        url_params['request'] = 'DescribeFeatureType';
        url_params['outputformat'] = 'application/json';
        url_params['typename'] = this._WORKSPACE + ":" + server_layer_name; // wms_namespace:wms_layer_name

        // if there is a mapping of selectable fields get it's list of keys to pass to the query
        var restricted_fields = LAYER_MGR.get_Layer_Property_Meta(layer_id);
        if (!!restricted_fields) {

            // restricting in URL doesn't work when querying for all attributes so just record restricted field names
            //url_params['propertyName'] = Object.keys(restricted_fields).join(',');
            restricted_fields = Object.keys(restricted_fields);
        }

        //#region query for layer attribute metadata
        //var request_url = encodeURIComponent(this._WORKSPACE_URL + '?' + $.map(url_params, function(val, key) { return key + '=' + val; }).join('&'));
        var request_url = encodeURIComponent(this._proxy_workspace_relative_path + '?' + $.map(url_params, function (val, key) { return key + '=' + val; }).join('&'));

        return $.ajax({
            url: this._proxy_prefix + request_url,
            type: "post",
            dataType: "json",
            //async: false,
            success: function(response) {

                //console.log("SUCCESS: loaded attribute data for: '{0}'".format(layer_id));

                var parsed_data = {};

                if (response.featureTypes.length > 0) {
                    $.each(response.featureTypes, function(index, val) {

                        // for layer queried for instantiate an object to map it's attribute names to their respective types

                        // iterate over all of the properties of the current layer
                        $.each(val.properties, function(attr_index, attr_val) {

                            // if only specific fields are requested only keep those fields
                            if (!!restricted_fields) {

                                if (restricted_fields.indexOf(attr_val.name) != -1) {

                                    // map this attribute to it's type for the current layer
                                    this._add_Attr_Meta(server_layer_name, attr_val.name, "datatype", attr_val.type.replace(/.*:/, ""));
                                    this._add_Attr_Meta(server_layer_name, attr_val.name, "fully_loaded", false);
                                }

                            } else { // otherwise keep all except for the following fields
                                var excluded_fields = ['the_geom', 'geom', 'LOADDATE', 'METASOURCE', "SHAPE_AREA", "SHAPE_LENG", "SOURCEDATA", "SOURCEFEAT", "SOURCEORIG"];

                                // exclude 'the_geom' property as it will not be used within the application for filtering
                                if (excluded_fields.indexOf(attr_val.name) == -1) {

                                    // map this attribute to it's type for the current layer
                                    this._add_Attr_Meta(server_layer_name, attr_val.name, "datatype", attr_val.type.replace(/.*:/, ""));
                                    this._add_Attr_Meta(server_layer_name, attr_val.name, "fully_loaded", false);
                                }
                            }


                        }.bind(this));

                    });

                }
                this._Attribute_Metadata_LoadStatus[server_layer_name] = true;

            },
            error: function(msg) {
                console.log("ERROR: Failed to load attribute metadata for: '{0}'".format(layer_id));
                console.log(msg.responseText);
            }
        });

        // #endregion

    }

GEOSERVER_DATA_MGR.prototype._Load_Layer_Values = function(ajax_return, layer_ID) {

        // load attribute values for a specified layer

        if (!!!layer_ID) {
            console.log("ERROR: Could not load attribute data for Layer '{0}'".format(layer_ID));
            return null;
        }

        var layer_attrs = null;
        var restricted_fields = LAYER_MGR.get_Layer_Property_Meta(layer_ID);

        if (!!restricted_fields) {
            layer_attrs = Object.keys(restricted_fields);

        } else {
            layer_attrs = this.get_Attributes(layer_ID);
            layer_attrs = Object.keys(layer_attrs);
        }


        //var return_obj = null;
        if (!!layer_attrs) {

            //return_obj = {};
            $.each(layer_attrs, function(index, value) {
                //return_obj[value] = ;
                SPINNER_MGR.Register_Query(this._Load_Attribute_Values(layer_ID, value), null, null, '#map');

            });

        } else {
            console.log("ERROR: No requestable attributes specified for Layer '{0}'".format(layer_ID));
        }

        //return return_obj;
    }


/* ----- get methods ----- */
// TODO:    these should be converted to be 'Event triggering events' that
//          are triggered like a normal event and trigger a passed
//          'listener event' and pass the data
GEOSERVER_DATA_MGR.prototype.get_Feature_data = function(layer_ID, Feature_ID) {

        // returns all of the attribute data for a selected layer:feature_id
        //   EXPECTS _Load_Feature_Data to have completed before being called. otherwise will return null

        if (!!!layer_ID || !!!Feature_ID || !!!this.get_Server_Layer_Mapping(layer_ID)) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Feature_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        if (!this._is_Feature_Loaded(layer_ID, Feature_ID)) {
            console.log('ERROR: Could not get Feature data for "{0}:{1}", it is not loaded yet.'.format(layer_ID,Feature_ID));
            return null;

        }


        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);
        // get the list of attributes for this layer's features


        // get list of expected attributes for this layer's features
        var expected_attrs = LAYER_MGR.get_Layer_Property_Meta(layer_ID);


        if (!!expected_attrs) {

            var val_mappings = {};

            $.each(expected_attrs, function(Attr_id) {
                var found_entry = JSLINQ(this._Loaded_Layer_Values[server_layer_name][Attr_id]).Where(function(item) {
                    return item.feature_id == Feature_ID;
                });

                val_mappings[Attr_id] = found_entry.items[0].val;

            });


            return val_mappings;

        }





    }

GEOSERVER_DATA_MGR.prototype.get_Attribute_Meta = function(layer_ID, Attribute_id, Attr_Metadata_Requested) {

    // returns the metadata of a requested layer attribute, or if requested, a specific metadata value
    // NOTE same result as the above
    var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

    // if layer wasnt found return null
    if (!!!layer_ID || !!!server_layer_name) return null;

    var return_val;


    if (!!!Attribute_id && !!this._Attribute_Metadata[server_layer_name]) {
        // return a deep copy of the attr's meta data so it's non-modifyable
        return_val = $.extend(true, {}, this._Attribute_Metadata[server_layer_name]);
        return return_val;
    }


    // if the layer is mapped and the attribute type has been recorded return it
    if (!!this._Attribute_Metadata[server_layer_name] && !!this._Attribute_Metadata[server_layer_name][Attribute_id]) {

        if (!!Attr_Metadata_Requested) {
            return this._Attribute_Metadata[server_layer_name][Attribute_id][Attr_Metadata_Requested];

        } else {
            // return a deep copy of the attr's meta data so it's non-modifyable
            return_val = $.extend(true, {}, this._Attribute_Metadata[server_layer_name][Attribute_id]);
            return return_val;
        }
    }
    return null;
}

GEOSERVER_DATA_MGR.prototype.get_Distinct_Attribute_Values = function(layer_ID, Attribute_ID, list_attr) {

    /*
    method to get the distinct feature values of an attribute given:
    layer_id -      layer id
    attribute_id -  attribtue id
    list_attr -     boolean representing whether the attribute is a list of values (true), or single value
                    per entry (false||nonspecified)
            NOTE: for list attribtues the expected separator is ','
    */
    var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

    if (!!!layer_ID || !!!Attribute_ID || !!!server_layer_name) {
        console.log("ERROR: Could not get distinct data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, this.get_Server_Layer_Mapping(layer_ID)));
        return null;
    }

    var distinct_values = [];
    var data_pool = this.get_Attribute_Values(layer_ID, Attribute_ID);

    if (!!!data_pool) return null;

    if (!!list_attr) {

        $.each(data_pool, function(index, entry) {

            var singles = entry.val.split(',').map(function(item) { return item.trim(); });
            $.each(singles, function(val_index, value) {
                if (distinct_values.indexOf(value) == -1) distinct_values.push(value);
            });
        });

    } else {
        $.each(data_pool, function(index, entry) {

            if (distinct_values.indexOf(entry.val) == -1) distinct_values.push(entry.val);

        });
    }

    distinct_values.sort();

    return distinct_values;


}


/* ----- generated query string ----- */
// TODO:    potentially replace this with a 'layer_params' object specifying
//          these values in 'CQL_FILTER' variable
GEOSERVER_DATA_MGR.prototype.get_CQL_Filter_String = function(layer_ID, Filters) {


        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!server_layer_name) {
            console.log("ERROR: Could not generate filter string for {0}. GeoServer layer:'{1}".format(layer_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }


        // if no filters are specified there is no need for a feature restriction filter
        if (!!!Filters) return null;

        var CQL_Filters = [];


        // for each filter collect a list of all features that fall into the feature
        $.each(Filters, function(prop_id, filter) {

            // get the prop meta for this layer attribute
            var prop_meta = LAYER_MGR.get_Layer_Property_Meta(layer_ID, prop_id);

            switch (prop_meta['Filtering_Type']) {
            case 'Search':
                // filter property for features containing the specified substring
                /*  TODO: provide an option to specify strict/partial search
                            possibly:
                            strict:         100% match
                            partial:        contains the substring
                            starts_with:    begins with the specified text
                    */

                var input_str = filter.trim().toLowerCase();

                /*  TODO: Add escape characters to string where needed
                        (get list of special cql operators)

                    */

                CQL_Filters.push("strToLowerCase({0}) like '{1}%'".format(prop_id, input_str));

                break;

            case 'Multiselect':

                var multi_part_query = [];

                var selected_options = filter;

                // if no options selected dont add any filters for multiselect
                if (!!!selected_options) break;

                $.each(selected_options, function (index, option) {
                    if (option == "") {
                        multi_part_query.push("{0}=''".format(prop_id));
                    } else {
                        // need to check for exact value, or if part of a comma separated list
                        // TODO: potentially make a modification to allow for spaces around the comma, but this is getting a little long...
                        multi_part_query.push("{0} = '{1}' or {0} like'{1},%' or {0} like'%,{1},%' or {0} like'%,{1}'".format(prop_id, option));
                    }


                });

                CQL_Filters.push("({0})".format(multi_part_query.join(' or ')));

                break;

            case 'Numerical':

                var min_requested = filter['min'];
                var max_requested = filter['max'];

                var query_parts = [];

                if (!!min_requested || min_requested == 0) query_parts.push("{0} >= {1}".format(prop_id, min_requested));
                if (!!max_requested || max_requested == 0) query_parts.push("{0} <= {1}".format(prop_id, max_requested));


                CQL_Filters.push("({0})".format(query_parts.join(' and ')));

                break;

            default:
                console.log('ERROR: Could filter features for {0}:{1}. (unknown type "{3}")'.format(layer_ID, prop_id, prop_meta['Filtering_Type']));
                break;
            }


        });


        // return the distinct feature IDs
        return CQL_Filters.join(' and ');


    }

/* ----- Data Layer methods ----- */
// TODO:    theoretically these will be internalized for layer manager
//          (they already just call layer manager for show/hide)

GEOSERVER_DATA_MGR.prototype.Data_Layer_Exists = function(layer_id) {
        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);
        return (!!this._Data_Display_Layers[server_layer_name]);

    }

GEOSERVER_DATA_MGR.prototype.get_Data_Layer_id = function (layer_id) {
      if (this.Data_Layer_Exists(layer_id)) {
          var server_layer_name = this.get_Server_Layer_Mapping(layer_id);
          return this._Data_Display_Layers[server_layer_name].get('name');
      }

        return null;
    }

GEOSERVER_DATA_MGR.prototype.Show_Data_Layer = function (layer_id) {
        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not remove data layer for {0}:{1}. (layer not mapped)".format(layer_id));
            return null;
        }

        if (this.Data_Layer_Exists(layer_id)) {

            var child_layer_id = this._Data_Display_Layers[server_layer_name].get('name');
            LAYER_MGR.show_Linked_Layer(layer_id, child_layer_id);
            LAYER_MGR.Update_Layer_Draw_Order();


        }
    }

GEOSERVER_DATA_MGR.prototype.Hide_Data_Layer = function (layer_id) {
        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not remove data layer for {0}:{1}. (layer not mapped)".format(layer_id));
            return null;
        }

        if (this.Data_Layer_Exists(layer_id)) {
            //MAP_MGR.hide_Layer(this._Data_Display_Layers[server_layer_name].get('name'));
            var child_layer_id = this._Data_Display_Layers[server_layer_name].get('name');
            LAYER_MGR.hide_Linked_Layer(layer_id, child_layer_id);
        }
    }

GEOSERVER_DATA_MGR.prototype.Remove_Data_Layer = function (layer_id) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not remove data layer for {0}:{1}. (layer not mapped)".format(layer_id));
            return null;
        }

        if (this.Data_Layer_Exists(layer_id)) {

            var child_layer_id = this.get_Data_Layer_id(layer_id);
            LAYER_MGR.Unlink_Layer(layer_id,child_layer_id);

        }

        this._Data_Display_Layers[server_layer_name] = null;


        // determine best way to handle the legend

    }

GEOSERVER_DATA_MGR.prototype.Generate_Filter_Layer = function(layer_id, filter_str) {

        // generate a filter layer and add it as a linked layer to the layer represented by the passed layer_id in the LAYER_MGR

        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}".format(layer_id, server_layer_name));
            return null;
        }

        var filter_layer_Source = this.Construct_Filter_Layer_Source(layer_id, filter_str);

        var new_layer_id = layer_id + "_filter_lyr";

        // make layers and add to _LAYERS
        var new_layer = new ol.layer.Tile({
            visible: true,
            name: new_layer_id,
            source: filter_layer_Source,
        });

        //new_layer.setZIndex(this._generated_layer_z_index);
        //this._LAYERS.push(new_layer);

        this.Add_Data_Layer(layer_id, new_layer_id, new_layer);


        return new_layer;


    }

GEOSERVER_DATA_MGR.prototype.Generate_Classification_Layer = function (layer_id, Cut_Variable, classification, Num_Cuts, filter_obj) {

        // determine best way to handle the legend (possibly generate a unique id based off of the layer_id, and access it via jquery)
        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}'".format(layer_id, server_layer_name));
            return null;
        }


        if (!!!Cut_Variable || !!!classification || !!!Num_Cuts) {
            console.log("ERROR: Could not generate Classifications due to missing parameters");
            return null;
        }

        // generate the classification object
        var classification_obj = this.Generate_Classification_Object(layer_id, Cut_Variable, classification, Num_Cuts, filter_obj);

        if (classification_obj == null) {
            console.log("ERROR: Generate_Classification_Layer Failed to generate classification Object");
            return null;
        }


        // generate the cql filter string
        var filter_str = this.get_CQL_Filter_String(layer_id, filter_obj);

        // initialize the new layer source
        this.Construct_Classification_Layer_Source(layer_id, classification_obj, filter_str);


        return classification_obj;

        //return {
        //    "layer": new_layer,
        //    "Classification_obj": classification_obj,
        //};

    }


/* ----- data download ----- */
GEOSERVER_DATA_MGR.prototype.Generate_CSV_Download = function (layer_id, filter_obj) {

        var _csv_content = [];
        var layer_properties = Object.keys(LAYER_MGR.get_Layer_Property_Meta(layer_id));
        var filtered_feature_ids = this.get_Filtered_Feature_IDs(layer_id, filter_obj); // if null assume inclusion


        // if a filter was defined
        if (!$.isEmptyObject(filter_obj)) {

            _csv_content.push(['The following results are filtered by:']);
            //_csv_content.push(['Variable', 'Filter']);
            _csv_content.push([" "]);



            // add header information on filters used in data pool
            $.each(filter_obj, function(prop_id, filter_value) {

                var filter_row = [];
                var prop_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, prop_id);
                var prop_display_name = (!!LAYER_MGR.get_Layer_Property_Meta(layer_id, prop_id, "Display_Name")) ? LAYER_MGR.get_Layer_Property_Meta(layer_id, prop_id, "Display_Name") : prop_id;

                switch (prop_meta['Filtering_Type']) {
                    case "Numerical":

                        filter_row.push(prop_display_name);

                        var filter_str = "";

                        $.each(filter_value, function (constraint, value) {
                            filter_str = "{0} {1}:{2}".format(filter_str, constraint, value);
                        });

                        filter_row.push(filter_str);

                        break;
                    case "Multiselect":

                        if (!!filter_value) {
                            filter_row.push("'{0}' in:".format(prop_display_name));
                            filter_row.push('"\'{0}\'"'.format(filter_value.toString().replace(',',"\,")));
                        }
                        break;
                    case "Search":
                        if (!!filter_value) {
                            filter_row.push("'{0}' Starts With:".format(prop_display_name));
                            filter_row.push('"\'{0}\'"'.format(filter_value.toString()));
                        }

                        break;
                    default:
                        console.log('ERROR: Could not generate filter string for Layer:Property : {0}:{1}'.format(layer_id, prop_id));
                        break;
                }

                _csv_content.push(filter_row);

            });

            // add a new line after the header
            _csv_content.push([" "]);


        }

        // output the displaynames of each of the layer properties as a row
        _csv_content.push($.map(layer_properties, function (val, index) {
            return (!!LAYER_MGR.get_Layer_Property_Meta(layer_id, val, "Display_Name")) ? LAYER_MGR.get_Layer_Property_Meta(layer_id, val, "Display_Name") : val;
        }));


        // for each feature in the filter (it's assumed that all of the features are loaded at this point, and sorting will be by 1st Property_Attribute field)
        //var sorted_Feature_ids =


        var feature_order = [];
        var _Feature_Val_Mapping = {};


        // for each property,
        // construct the feature value mapping for this csv
        $.each(layer_properties, function (index, prop_id) {

            var full_attr_pool = this.get_Attribute_Values(layer_id, prop_id);

            // for each value in this pool, if the feature id is included in the filter selection add it to the data row collection,
            // and record it's feature order (retrieved values are sorted by value so adding as encountered will auto sort)
            $.each(full_attr_pool, function(attr_index, feature_val_obj) {

                var f_id = feature_val_obj['feature_id'];
                var f_val = feature_val_obj['val'].toString();



                // if the filtered feature list is null (all inclusive)
                if (!!!filtered_feature_ids) {

                    // initialize data collection if needed
                    if (!!!_Feature_Val_Mapping[f_id]) _Feature_Val_Mapping[f_id] = [];

                    if (feature_order.indexOf(f_id) == -1) feature_order.push(f_id);
                    _Feature_Val_Mapping[f_id].push('"{0}"'.format(f_val));



                } else {
                    // if there are filter id's specified check against it for the current fid
                    if (filtered_feature_ids.indexOf(f_id) != -1) {

                        // initialize data collection if needed
                        if (!!!_Feature_Val_Mapping[f_id]) _Feature_Val_Mapping[f_id] = [];

                        if (feature_order.indexOf(f_id) == -1) feature_order.push(f_id);
                        _Feature_Val_Mapping[f_id].push('"{0}"'.format(f_val));

                    }
                }


            });


        });

        // convert _Feature_Val_Mapping to csv


        $.each(feature_order, function(index, f_id) {
            _csv_content.push(_Feature_Val_Mapping[f_id]);
        });


        var formatted_csv_string = "";

        _csv_content.forEach(function (row, index) {

            var dataString = row.join(",");
            formatted_csv_string += dataString + "\r\n";

        });

        return formatted_csv_string;

    }


// should be depreciated now that we can generate sld's
GEOSERVER_DATA_MGR.prototype.Generate_SLD_Link = function (layer_id, layer_type, classification_obj ) {


    var server_layer_name = this.get_Server_Layer_Mapping(layer_id);


    var param_data =
    {
        workspace: this._WORKSPACE,
        layer_id: server_layer_name,
        layer_type: layer_type,
        variable: classification_obj.variable,
        bounds: classification_obj.bounds,
        classification_method: classification_obj.method,
    };


    var request_url = "/Map/Generate_Classification_SLD";

    return $.ajax({
        url: request_url,
        data: param_data,
        type: "post",
        dataType: "json",
        //async: false,
        success: function (data) {
            // place the loaded values into the loaded_vals collection
            this._Data_Layer_Styles[server_layer_name] = data;

        },
    });




}



/* -----------------------------------------
        END externally referenced methods
-----------------------------------------*/


    /* -----------------------------------------
        Metadata helper methods
    -----------------------------------------*/

    GEOSERVER_DATA_MGR.prototype.is_Attribute_Metadata_loaded = function (layer_id) {
        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        return this._Attribute_Metadata_LoadStatus[server_layer_name];
    }

    // method to be called on loading of attribute data for a specific feature
    GEOSERVER_DATA_MGR.prototype._add_Loaded_feature = function (layer_ID, attr_ID, feature_ID, value) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!feature_ID || !!!server_layer_name) {
            console.log("ERROR: Could not add load record for {0}:{1}:{2}.".format(layer_ID, attr_ID, feature_ID));
            return null;
        }


        // initialize layer/attribute collections _Loaded_Feature_Record in Feature_record if they dont exist
        if (!!!this._Loaded_Feature_Record[server_layer_name]) this._Loaded_Feature_Record[server_layer_name] = {};
        if (!!!this._Loaded_Feature_Record[server_layer_name][attr_ID]) this._Loaded_Feature_Record[server_layer_name][attr_ID] = {};

        // initialize layer/attribute collections _Loaded_Layer_Values in Feature_record if they dont exist
        if (!!!this._Loaded_Layer_Values[server_layer_name]) this._Loaded_Layer_Values[server_layer_name] = {};
        if (!!!this._Loaded_Layer_Values[server_layer_name][attr_ID]) this._Loaded_Layer_Values[server_layer_name][attr_ID] = [];


        // if there isn't an existing record of this layer:attribute:feature_id
        if (!!!this.is_Feature_Attribute_Loaded(layer_ID, attr_ID, feature_ID)) {

            // push the feature id entry
            this._Loaded_Layer_Values[server_layer_name][attr_ID].push({
                feature_id: feature_ID,
                val: value,
            });

            // mark this feature as loaded
            this._Loaded_Feature_Record[server_layer_name][attr_ID][feature_ID] = true;

        }


    }

    // set attribute metadata field
    // used to map additional information about the layer:feature_attributes in the system
    //      such as, if the attribute is fully loaded (piecemeal loading by feature is allowed by system), datatype, numerical max/min values, attribute descriptions, display names etc.
    GEOSERVER_DATA_MGR.prototype._add_Attr_Meta = function (layer_ID, attr_ID, new_key, stored_val) {

        if (!!!layer_ID || !!!attr_ID || !!!new_key) {
            console.log("Missing Parameter for '_add_Attr_Meta' method.");
            return null;
        }

        // if there were no _Attribute_Metadata objects generated for this layer:attribute add their containers
        if (!!!this._Attribute_Metadata[layer_ID]) this._Attribute_Metadata[layer_ID] = {};
        if (!!!this._Attribute_Metadata[layer_ID][attr_ID]) this._Attribute_Metadata[layer_ID][attr_ID] = {};

        this._Attribute_Metadata[layer_ID][attr_ID][new_key] = stored_val;

    }


    /* -----------------------------------------
        Query methods
    -----------------------------------------*/



    /*
        method to query for all feature values for a specifed Layer:Attribute and store them in _Loaded_Vals lookup
        //  NOTE: for sorting must be called after 'Load_Layer_Attribute_Meta'
    */
    GEOSERVER_DATA_MGR.prototype._Load_Attribute_Values = function(layer_ID, Attribute_ID) {

        if (!!!layer_ID || !!!Attribute_ID || !!!this.get_Server_Layer_Mapping(layer_ID)) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        // if the attribute metadata is not loaded yet, try again in a few cycles
        if (!this.is_Attribute_Metadata_loaded(layer_ID)) {

            setTimeout(function () { this._Load_Attribute_Values(layer_ID, Attribute_ID); }, 500);
            return;

        }


        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);


        // Perform a WFS query for the attribute values from
        var url_params = {};

        // set up the url parameters to be passed with the request for layer feature properties
        url_params['service'] = 'wfs';
        url_params['version'] = '2.0.0';
        url_params['request'] = 'GetFeature';
        url_params['outputformat'] = 'application/json';
        url_params['typename'] = this._WORKSPACE + ":" + server_layer_name; // wms_namespace:wms_layer_name
        url_params['propertyName'] = Attribute_ID;

        //var request_url = encodeURIComponent(GEOSERVER_DATA_MGR._WORKSPACE_URL + '?' + $.map(url_params, function(val, key) { return key + '=' + val; }).join('&'));
        var request_url = encodeURIComponent(this._proxy_workspace_relative_path + '?' + $.map(url_params, function (val, key) { return key + '=' + val; }).join('&'));

        //var return_obj = null;

        return $.ajax({
            url: this._proxy_prefix + request_url,
            type: "post",
            dataType: "json",
            success: function(response) {

                //console.log("SUCCESS: loaded attribute values for: '{0}:{1}'".format(layer_ID, Attribute_ID));
                if (response.features.length > 0) {

                    $.each(response.features, function(index, val) {
                        this._add_Loaded_feature(layer_ID, Attribute_ID, val.id, val.properties[Attribute_ID]);
                    });


                    // sort the result by value (type dependant)
                    var datatype = this.get_Attribute_Meta(layer_ID, Attribute_ID, "datatype");


                    // mark this attribute as fully loaded once it passes through this method.
                    this._add_Attr_Meta(server_layer_name, Attribute_ID, "fully_loaded", true);

                    switch (datatype) {
                    case "string":
                        this._Loaded_Layer_Values[server_layer_name][Attribute_ID] = this._Loaded_Layer_Values[server_layer_name][Attribute_ID].sort(function(a, b) {
                            return a.val.localeCompare(b.val);
                        });

                        // store count of string values as well as the number of distinct values (helps when determining classification)
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "count", this._Loaded_Layer_Values[server_layer_name][Attribute_ID].length);
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "num_distinct", JSLINQ(this._Loaded_Layer_Values[server_layer_name][Attribute_ID]).Distinct(function(item) { return item.val; }).Count());

                        break;

                    case "int":

                        this._Loaded_Layer_Values[server_layer_name][Attribute_ID] = this._Loaded_Layer_Values[server_layer_name][Attribute_ID].sort(function(a, b) {
                            return a.val - b.val;
                        });

                        // store max/min values for the numerical values
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "min", JSLINQ(this._Loaded_Layer_Values[server_layer_name][Attribute_ID]).First().val);
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "max", JSLINQ(this._Loaded_Layer_Values[server_layer_name][Attribute_ID]).Last().val);
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "count", this._Loaded_Layer_Values[server_layer_name][Attribute_ID].length);

                        break;

                    case "number":
                        this._Loaded_Layer_Values[server_layer_name][Attribute_ID] = this._Loaded_Layer_Values[server_layer_name][Attribute_ID].sort(function(a, b) {
                            return a.val - b.val;
                        });

                        // store max/min values for the numerical values
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "min", JSLINQ(this._Loaded_Layer_Values[server_layer_name][Attribute_ID]).First().val);
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "max", JSLINQ(this._Loaded_Layer_Values[server_layer_name][Attribute_ID]).Last().val);
                        this._add_Attr_Meta(server_layer_name, Attribute_ID, "count", this._Loaded_Layer_Values[server_layer_name][Attribute_ID].length);

                        break;

                    default:

                        console.log("WARNING: Unknown datatype '{0}' for Attribute {1}:{2}".format(datatype, layer_ID, Attribute_ID));
                        break;
                    }

                } else {
                    console.log("ERROR: No attribute data found for Layer Attribute {0}:{1}'".format(layer_ID, Attribute_ID));
                }

                //return_obj = GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID];
            },
            error: function(msg) {
                console.log("ERROR: Failed to load attribute values for: '{0}:{1}'".format(layer_ID, Attribute_ID));
                console.log(msg.responseText);
            }
        });


        //return return_obj;
    }





    /* -----------------------------------------
        Utility Methods
    -----------------------------------------*/
    // #region


    GEOSERVER_DATA_MGR.prototype.is_Feature_Attribute_Loaded = function(layer_ID, attr_ID, feature_ID) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        // if all of the parameters are valid and they are mapped in _Loaded_Feature_Record return true
        return (!!layer_ID
            && !!attr_ID
            && !!feature_ID
            && !!server_layer_name
            && !!this._Loaded_Feature_Record[server_layer_name]
            && !!this._Loaded_Feature_Record[server_layer_name][attr_ID]
            && !!this._Loaded_Feature_Record[server_layer_name][attr_ID][feature_ID]);
    }




    /* -----------------------------------------
        Getters
    -----------------------------------------*/
    // #region
    /*
        Methods to get data from geoserver for use in other Javascript objects
        Typical methodology is to check if the data was loaded:
            - if it is return it from the lookup
            - otherwise query for it and wait for the result to load before continuing
                (synchronous querying requiring loadspinner)
                - it is preferred to not require waiting so my recommendation is find proper places to trigger the loading
                    of values from the server before values are needed. (But you have this option if the UI cannot accomodate this)

    */


    // returns Geoserver's layer name for the specified layer name (they may differ)
    // or null if the layer id is not found in the mapping
    GEOSERVER_DATA_MGR.prototype.get_Server_Layer_Mapping = function(layer_ID) {

        if (!!layer_ID && this._Layer_Mapping[layer_ID]) {
            return this._Layer_Mapping[layer_ID];
        }

        return null;

    }

    // get all Attribute metadata for a specifed layer_id
    GEOSERVER_DATA_MGR.prototype.get_Attributes = function(layer_ID) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!server_layer_name) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        if (!!this._Attribute_Metadata[server_layer_name]) {

            return this._Attribute_Metadata[server_layer_name];
        }

        return null;
    }

    GEOSERVER_DATA_MGR.prototype.get_Attribute_Values = function(layer_ID, Attribute_ID) {


        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!Attribute_ID || !!!server_layer_name) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        // if the data has already been loaded return the requested data
        if (!!this._Loaded_Layer_Values[server_layer_name] && !!this._Loaded_Layer_Values[server_layer_name][Attribute_ID]) {
            return this._Loaded_Layer_Values[server_layer_name][Attribute_ID];

        } else {
            return this._Load_Attribute_Values(layer_ID, Attribute_ID);
        }

    }





    /* -----------------------------------------
        Data Filtering Methods
    -----------------------------------------*/

    // returns a collection of values for a specified Feature Attribute with optional filters
    GEOSERVER_DATA_MGR.prototype.get_Filtered_Values = function(layer_ID, Attribute_ID, Filters) {
        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!Attribute_ID || !!!server_layer_name) {
            console.log("ERROR: Could get_Filtered_Values attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, server_layer_name));
            return null;
        }

        // if no filters are specified return null
        var datapool = this.get_Attribute_Values(layer_ID, Attribute_ID);


        // if no filters were defined return the entire list of attribute values
        if ($.isEmptyObject(Filters)) {

            return datapool;
        } else {

            var filtered_feature_ids = this.get_Filtered_Feature_IDs(layer_ID, Filters);

            datapool = datapool.filter(function(feature_obj) {
                return !(filtered_feature_ids.indexOf(feature_obj['feature_id']) == -1);
            });

            return datapool;

        }
    }

    // get all feature id's included in a specified data filter
    GEOSERVER_DATA_MGR.prototype.get_Filtered_Feature_IDs = function(layer_ID, Filters) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!server_layer_name) {
            console.log("ERROR: Could not load attribute data for {0}. GeoServer layer:'{1}".format(layer_ID, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }


        // if no filters are specified return null
        if ($.isEmptyObject(Filters)) return null;

        var collected_feature_IDs = [];
        var individual_filter_results = [];

        // for each filter collect a list of all features that fall into the feature
        $.each(Filters, function(prop_id, filter) {

            // get the prop meta for this layer attribute
            var prop_meta = LAYER_MGR.get_Layer_Property_Meta(layer_ID, prop_id);
            var data_pool = this.get_Attribute_Values(layer_ID, prop_id);

            switch (prop_meta['Filtering_Type']) {
            case 'Search':
                // filter property for features containing the specified substring
                /*  TODO: provide an option to specify strict/partial search
                              possibly:
                                strict:         100% match
                                partial:        contains the substring
                                starts_with:    begins with the specified text
                        */

                var input_str = filter.trim().toLowerCase();
                var search_filter_result = [];

                $.each(data_pool, function(index, feature_obj) {

                    // if the feature value starts with the specified substring
                    // add it's id to the collection
                    if ((feature_obj.val).toString().toLowerCase().indexOf(input_str) == 0) {

                        search_filter_result.push(feature_obj.feature_id);
                    }

                });

                individual_filter_results.push(search_filter_result);

                break;

            case 'Multiselect':

                var selected_options = filter;
                var multiselect_filter_result = [];

                if (selected_options == null) { // if none of the multiselect options are selected add the entire data pool's features
                    multiselect_filter_result = data_pool.map(function(item) {
                        return item.feature_id;
                    });
                } else {
                    // for each item in the data pool
                    $.each(data_pool, function (index, feature_obj) {

                        // convert the feature's options to a list of individual values
                        var feature_values = feature_obj.val.split(',').map(function (item) { return item.trim(); });

                        $.each(feature_values, function (val_index, feature_value) {
                            // if one of the selected options is found in this features values collect its feature id
                            // and break out of the loop
                            if (!!selected_options && selected_options.indexOf(feature_value) != -1) {
                                multiselect_filter_result.push(feature_obj.feature_id);
                                return false;
                            }
                        });
                    });
                }




                individual_filter_results.push(multiselect_filter_result);

                break;

            case 'Numerical':

                var min_requested = filter['min'];
                var max_requested = filter['max'];
                var numerical_filter_result = [];

                $.each(data_pool, function(index, feature_obj) {

                    var feature_value = feature_obj.val;
                    var meets_conditions = true;

                    if (!!min_requested || min_requested == 0) {
                        if (feature_value < min_requested) meets_conditions = false;
                    }

                    if (!!max_requested || max_requested == 0) {
                        if (feature_value > max_requested) meets_conditions = false;
                    }

                    if (meets_conditions) numerical_filter_result.push(feature_obj.feature_id);

                });

                individual_filter_results.push(numerical_filter_result);

                break;

            default:
                console.log('ERROR: Could filter features for {0}:{1}. (unknown type "{3}")'.format(layer_ID, prop_id, prop_meta['Filtering_Type']));
                break;
            }


        });


// sort out the distinct values
        //collected_feature_IDs = collected_feature_IDs.filter(function (item, i, ar) { return ar.indexOf(item) === i; });

        collected_feature_IDs = individual_filter_results.shift().filter(function(v) {
            return individual_filter_results.every(function(a) {
                return a.indexOf(v) !== -1;
            });
        });


        // return the distinct feature IDs
        return collected_feature_IDs;

    }


    /* -----------------------------------------
        Filter/Classification Layer Methods
    -----------------------------------------*/

    // construct and return the layer source for a filter layer
    GEOSERVER_DATA_MGR.prototype.Construct_Filter_Layer_Source = function(layer_id, filter_str) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}".format(layer_id, this.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        // make a deep copy of the default params
        var params = $.extend(true, {}, this._Data_Display_Layers_SOURCE_PARAMS);

        // specify the layer to reference
        params['LAYERS'] = "{0}:{1}".format(this._WORKSPACE, server_layer_name);

        // include the filter string if any
        if (!!filter_str) params['CQL_FILTER'] = filter_str;

        // set the layer style based on the layer type
        var layer_type = LAYER_MGR.get_Layer_Meta(layer_id, 'LayerType');
        if (!!layer_type) {
            params['STYLES'] = this._Filter_Layer_Styles[layer_type];
        }


        //params['StyleUrl'] = this.Generate_SLD(variable, classification, bounds); // this will change to the generated sld url

        var request_url = encodeURI(this._WORKSPACE_URL);


        var newSource = new ol.source.TileWMS({
            url: request_url,
            params: params
        });

        return newSource;


    }

    GEOSERVER_DATA_MGR.prototype.Generate_Classification_Object = function (layer_id, Cut_Variable, classification, Num_Cuts, filter_obj) {

        var classification_object = {};

        var cuts = this.Generate_Classification_Ranges(layer_id, Cut_Variable, classification, Num_Cuts, filter_obj);

        // if ranges failed to be created due to filtering/or general error return
        if (cuts == null) return null;

        classification_object['method'] = classification;
        classification_object['variable'] = Cut_Variable;
        classification_object['Num_Cuts'] = Num_Cuts;
        classification_object['colors'] = cuts.colors;
        classification_object['distribution'] = cuts.distribution;
        classification_object['sorted_vals'] = cuts.sorted_vals;
        classification_object['categories'] = cuts.categories;
        classification_object['legend'] = cuts.legend;
        classification_object['bounds'] = cuts.bounds;

        return classification_object;

    }

    GEOSERVER_DATA_MGR.prototype.Construct_Classification_Layer_Source = function (layer_id, classification_obj, filter_str) {



        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}".format(layer_id, server_layer_name));
            return null;
        }


        // make a deep copy of the default params
        var params = $.extend(true, {}, this._Data_Display_Layers_SOURCE_PARAMS);
        params['StyleFormat'] = 'sld';

        // seemingly not needed, also causes postGIS layers to not load properly if these params are specified
        //params['STYLES'] = "{0}:{1}".format(GEOSERVER_DATA_MGR._WORKSPACE, server_layer_name);
        //params['LAYERS'] = "{0}:{1}".format(GEOSERVER_DATA_MGR._WORKSPACE, server_layer_name);  // specify the layer to reference

        if (!!filter_str) params['CQL_FILTER'] = filter_str;        // include the filter string if any
        var request_url = encodeURI(this._WORKSPACE_URL);


        var newSource_options = {
            url: request_url,
            params: params
        };





        // set the layer style based on the layer type
        var layer_type = LAYER_MGR.get_Layer_Meta(layer_id, 'LayerType');

        if (!!layer_type) {

            // TODO: Make call to controller to generate and store a new SLD for this Classification layer

            //var SLD_Meta = GEOSERVER_DATA_MGR.Generate_SLD_Link(layer_id, layer_type, classification_obj);

            SPINNER_MGR.Register_Query(this.Generate_SLD_Link(layer_id, layer_type, classification_obj),
                this.Publish_Classification_Layer,
                [layer_id, newSource_options, classification_obj],
                '#map');

        }

    }



    GEOSERVER_DATA_MGR.prototype.Publish_Classification_Layer = function (ajax_return_obj, layer_id, layer_source_options, classification_obj) {

        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        var new_layer_id = layer_id + "_class_lyr";
        var sld_info = this._Data_Layer_Styles[server_layer_name];

        // add the newly generated sld link to the source parameters
        layer_source_options.params['SLD'] = sld_info['Style_Link']; // update style params with newly generated SLD_Link


        var newSource = new ol.source.TileWMS(layer_source_options);

        // make layers and add to _LAYERS
        var new_layer = new ol.layer.Tile({
            visible: true,
            name: new_layer_id,
            source: newSource,
        });

        this.Add_Data_Layer(layer_id, new_layer_id, new_layer, classification_obj['legend']);

    }

    GEOSERVER_DATA_MGR.prototype.Add_Data_Layer = function (layer_id, linked_layer_id, layer, legend) {

        if (!!!legend) legend = null;
        var server_layer_name = this.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not add linked layer '{2}' for {0}. GeoServer layer:'{1}".format(layer_id, server_layer_name, linked_layer_id));
            return null;
        }

        // enforce single data layer per layer_id
        if (!!this.Data_Layer_Exists(layer_id)) {

            var child_id = this.get_Data_Layer_id(layer_id);

            this.Remove_Data_Layer(layer_id);
            LAYER_MGR.Unlink_Layer(layer_id, child_id);

        }

        this._Data_Display_Layers[server_layer_name] = layer;


        // add the new layer to the map and link it to the associated base layer
        MAP_MGR.add_layer(layer, legend);

        LAYER_MGR.Link_Layer(layer_id, linked_layer_id, 1, legend);
        LAYER_MGR.Update_Layer_Draw_Order();

    }

    GEOSERVER_DATA_MGR.prototype.Generate_Classification_Ranges = function (layer_id, attr_id, classification, num_cuts, filter_obj) {

        // register a new spinner because occasionally this method can take a while


        // Get filtered HUC dataset filtered by the user specified thresholds/States
        //var HUC8_mappings = HUC8_DATA_MGR.Get_Filtered_Vals(variable, NEXUS_FILTER_DIALOG_MGR.State_Filtering_selection(), NEXUS_FILTER_DIALOG_MGR.Threshold_Filtering_selections());
        var Filtered_Dataset = this.get_Filtered_Values(layer_id, attr_id, filter_obj);


        if (Filtered_Dataset.length < num_cuts) {

            SPINNER_MGR.Remove_Spinner(SPINNER_ID);
            alert("Filtering Error: Filtered dataset contains less items than specified number of classes. Please modify your filter selection and try again.\n\n" +
                "Num Classes Specified: " + num_cuts + "\n" +
                "Number of Features in filtered dataset: " + Filtered_Dataset.length);
            return null;
        }



        var values = JSLINQ(Filtered_Dataset).SelectMany(function (item) { return Number(item.val); }).items;
        var series = new geostats(values);
        var colors = COLOR_MGR.Color_Range(num_cuts);

            //series.setPrecision();
        series.setColors(colors);

        // generate series based upon selected classification method
        switch (classification) {
            case "jenks":
                try {
                    series.getJenks(num_cuts);
                } catch (err) {
                    alert("Classification Error: The currently selected filters were unable to be classified using the Jenks method.\n\n" +
                        "This error can occur due to several factors, but the most common cause is the number of items being classified being the " +
                        "same as the specified number of classifications.\n\n" +
                        "Number Classes Requested: " + num_cuts + "\n" +
                        "Number of HUCs in filtered dataset: " + Filtered_Dataset.length);
                    return null;
                }

                break;
            case "quantile":

                try {
                    series.getQuantile(num_cuts);
                } catch (err) {
                    alert("Classification Error: The currently selected filters were unable to be classified using the Quantile method.\n\n");
                    return null;
                }
                break;
            case "eq_int":

                try {
                    series.getEqInterval(num_cuts);
                } catch (err) {
                    alert("Classification Error: The currently selected filters were unable to be classified using the Equal Interval method.\n\n");
                    return null;
                }
                break;
            case "std_dev":

                try {
                    series.getStdDeviation(num_cuts);
                } catch (err) {
                    alert("Classification Error: The currently selected filters were unable to be classified using the Standard Deviation method.\n\n");
                    return null;
                }
                break;
            default:
                // default to Jenks classification
                try {
                    series.getJenks(num_cuts);
                } catch (err) {
                    alert("Classification Error: The currently selected filters were unable to be classified using the Jenks method.\n\n" +
                        "This error can occur due to several factors, but the most common cause is the number of items being classified being the " +
                        "same as the specified number of classifications.\n\n" +
                        "Number Classes Requested: " + num_cuts + "\n" +
                        "Number of Features in filtered dataset: " + Filtered_Dataset.length);
                    return null;
                }
                break;
        }

        var ranges = series.getRanges();

        var bounds_collection = [];

        for (var i = 0; i < ranges.length; i++) {
            var splitRange = ranges[i].split(' - ');

            //if (i == 0) {
            //    splitRange[0] = (trunkation)
            //}

            // default rounding
            //bounds_collection.push({
            //    color: colors[i],
            //    min: splitRange[0],
            //    max: splitRange[1],
            //});



            bounds_collection.push({
                color: colors[i],
                min: round(((i == 0) ? parseFloat(splitRange[0]).toFixed(2) : splitRange[0]), 4).toString(),
                max: round(splitRange[1], 4).toString(),
            });
        }

        function Generate_Bounds_filters(variable, bounds) {

            var filters = bounds.map(function (item, index) {

                if (index + 1 < bounds.length) {
                    return "{0} >= {1} and {0} < {2}".format(variable, item.min, item.max);
                } else {
                    return "{0} >= {1} and {0} <= {2}".format(variable, item.min, item.max);
                }
            });

            return filters;
        }


        var filters = Generate_Bounds_filters(attr_id, bounds_collection);

        var layer_display_name = LAYER_MGR.get_Layer_Meta(layer_id, 'title');
        if (!!!layer_display_name) layer_display_name = layer_id;

        var attr_display_name = LAYER_MGR.get_Layer_Property_Meta(layer_id, attr_id, "Display_Name");
        if (!!!attr_display_name) attr_display_name = attr_id;


        var legend_header = layer_display_name + ": " + attr_display_name;

        // add units to header if it exist for the current attribute
        var units = LAYER_MGR.get_Layer_Property_Meta(layer_id, attr_id, "Units");
        if (!!units) legend_header = "{0} ({1})".format(legend_header, units);



        var legend = $(series.getHtmlLegend(colors, legend_header));

        // modify legend to round to nearest 4 digits (fixed point for min to avoid exclusion)
        //      Geostats doesnt allow for this by default so must be handled manually to match the above rounding of cutpoints
        $(legend).children('div:not(.geostats-legend-title)').each(function (i) {
            var colorblock = $(this).find('.geostats-legend-block');
            var splitRange = $(this).text().split('-');

            $(this).html('');
            $(this).addClass('geostats-legend-row');

            var color_block_container = $(document.createElement('div'));
            color_block_container.addClass('geostats-legend-color-cell');
            color_block_container.append(colorblock);

            var text_container = $(document.createElement('div'));
            text_container.addClass('geostats-legend-text-cell');
            text_container.append('{0} - {1}'.format(round(((i == 0) ? parseFloat(splitRange[0]).toFixed(2) : splitRange[0]), 4).toString(), round(splitRange[1], 4).toString()));

            $(this).append(color_block_container);
            $(this).append(text_container);

        });

        // may be unnecessary assignment...
        var data_vals = Filtered_Dataset;

            // create an array of values signifying the number of hucs per class (parallel to the bounds array)
        var distribution = $.map(bounds_collection, function(bounds, index) {
            return JSLINQ(data_vals).Where(function(item) {

                if (index + 1 == bounds_collection.length) {
                    return (item.val >= Number(bounds.min) && item.val <= Number(bounds.max));
                } else {
                    return (item.val >= Number(bounds.min) && item.val < Number(bounds.max));
                }

            }).Count();
        });

        var categories = [];
        for (var i = 0; i < num_cuts; i++) {
            var class_id = "Class " + (i + 1);
            categories.push(class_id);
        }


            // get sorted collection of the requested values for use in visualization
        var sorted_vals = $.map(data_vals, function(val_obj) { return Number(val_obj.val); }).sort(function(a, b) { return a - b; });

        return {
            bounds: bounds_collection,
            categories: categories,
            colors: colors,
            distribution: distribution,
            filters: filters,
            legend: legend,
            sorted_vals: sorted_vals,
        };




    }





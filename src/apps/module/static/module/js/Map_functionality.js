// potential addition to bind events to jquery show hide, if deemed necessary
//(function ($) {
//    $.each(['show', 'hide'], function (i, ev) {
//        var el = $.fn[ev];
//        $.fn[ev] = function () {
//            this.trigger(ev);
//            return el.apply(this, arguments);
//        };
//    });
//})(jQuery);

// preliminary definitions to ensure variable's existance before initialization
WMS_WORKSPACE = null;

// read feature information provided by JSONP return from selecting a feature on the map
function parseResponse(data) {
    console.log("WORKING: in parser");
    //var feature = data.features[0];
    return data;
};

// method to download clientside csv files generated from local data
//  generates a single download of the data passed, and cleans up any objects created for the download
function dataDownload(csv_content, filename) {
    
    if (!!!filename) filename = 'HYDROVIZ_unnamed_data_download';

    // IE Clientside Download hack; see http://msdn.microsoft.com/en-us/library/ie/hh779016.aspx
    if (window.navigator.msSaveOrOpenBlob) {
        var csv_blob = new Blob([csv_content]);
        window.navigator.msSaveBlob(csv_blob, "{0}.csv".format(filename));


    } else {

        // Chrome/Firefox downloads

        var encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv_content);

        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "{0}.csv".format(filename));

        document.body.appendChild(link); // Required for FF

        link.click(); // This will download the data file named "my_data.csv".

        document.body.removeChild(link); // Required for FF
    }

}

// number rounding method
var round = function (number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
};


// grabs layer attributes for all layers in the workspace specified by the wfs url
//  mapping a layer id to a collection of {attr_name: "column_name", attr_type: "[string,int,number,etc]"}
//
//
//
var GEOSERVER_DATA_MGR = {

    // #region properties
    _WORKSPACE: "",
    _WORKSPACE_URL: "",

    _proxy_prefix: "/CGI-BIN/proxy.ashx?url=",
    _proxy_workspace_relative_path: "",
    // object to map Layer_id's to their representative layer in GEOSERVER {'LAYER_MGR_id': 'GEOSERVER_LAYER_REF'}
    _Layer_Mapping: {},

    // collection mapping WMS layers to an object mapping their attributes to metadata about that attribute
    _Attribute_Metadata: {},
    _Attribute_Metadata_LoadStatus: {},

    /* collection of loaded layer values queried from Geoserver
         constructed as:
         {
            'Layer_ID' : {
                'Attr_id': [{'feature1_id':'value'},{'feature2_id':'value'}, ... ]
            }
         }
    */
    _Loaded_Layer_Values: {},

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
    _Loaded_Feature_Record: {},

    // each layer can have a single data display layer do display filtering/Classification data
    // indexed by layer_id
    _Data_Display_Layers: {},

    // Generated SLD style links, indexed by layer_id
    _Data_Layer_Styles: {},

    _Data_Display_Layers_SOURCE_PARAMS: {
        FORMAT: 'image/png',
        VERSION: '1.1.1',
        
        // add dynamic style later
        StyleFormat: 'sld',

    },

    _Filter_Layer_Styles: {
        'point': "Point_Filtered_Styling",
        'shape': "Polygon_Filtered_Styling",
        'line': "Line_Filtered_Styling",
    },

    _classification_methods: {
        "jenks": "Natural Breaks (Jenks)",
        "quantile": "Quantile",
        "eq_int": "Equal Interval",
        "std_dev": "Standard Deviation"
    },

    _classification_default_method: "jenks",
    _classification_min_cuts: 3,
    _classification_max_cuts: 15,
    _classification_default_cuts: 10,


    // #endregion

    init: function(WORKSPACE) {

        this._WORKSPACE_URL = location.protocol.concat("//").concat(window.location.hostname).concat("/geoserver/");

        if (!!WORKSPACE) {
            this._WORKSPACE = WORKSPACE;
            this._WORKSPACE_URL = this._WORKSPACE_URL.concat(WORKSPACE + '/');

            this._proxy_workspace_relative_path = "/geoserver/".concat(WMS_WORKSPACE).concat("/wms");
        }
        this._WORKSPACE_URL = this._WORKSPACE_URL.concat("wms");

    },

    // used to populate the layer mapping object, maintaining a reference between geoserver layers and their id's in the system

    // #region Lookup Mapping methods

    // map a system layer_id (within hydroviz) to it's server reference layer in geoserver
    map_Layer_ID_to_Server_Layer: function(layer_ID, layer_ref) {

        if (!!layer_ID && !!layer_ref) {
            this._Layer_Mapping[layer_ID] = layer_ref;
        }
    },


    // #endregion Lookup Mapping Methods

    // #region Metadata helper methods

    is_Attribute_Metadata_loaded: function (layer_id) {
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        return GEOSERVER_DATA_MGR._Attribute_Metadata_LoadStatus[server_layer_name];
    },

    // method to be called on loading of attribute data for a specific feature
    _add_Loaded_feature: function (layer_ID, attr_ID, feature_ID, value) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!feature_ID || !!!server_layer_name) {
            console.log("ERROR: Could not add load record for {0}:{1}:{2}.".format(layer_ID, attr_ID, feature_ID));
            return null;
        }


        // initialize layer/attribute collections _Loaded_Feature_Record in Feature_record if they dont exist
        if (!!!GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name]) GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name] = {};
        if (!!!GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name][attr_ID]) GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name][attr_ID] = {};

        // initialize layer/attribute collections _Loaded_Layer_Values in Feature_record if they dont exist
        if (!!!GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name]) GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name] = {};
        if (!!!GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][attr_ID]) GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][attr_ID] = [];


        // if there isn't an existing record of this layer:attribute:feature_id
        if (!!!GEOSERVER_DATA_MGR.is_Feature_Attribute_Loaded(layer_ID, attr_ID, feature_ID)) {

            // push the feature id entry
            GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][attr_ID].push({
                feature_id: feature_ID,
                val: value,
            });

            // mark this feature as loaded
            GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name][attr_ID][feature_ID] = true;

        }


    },

    // set attribute metadata field
    // used to map additional information about the layer:feature_attributes in the system
    //      such as, if the attribute is fully loaded (piecemeal loading by feature is allowed by system), datatype, numerical max/min values, attribute descriptions, display names etc.
    _add_Attr_Meta: function (layer_ID, attr_ID, new_key, stored_val) {

        if (!!!layer_ID || !!!attr_ID || !!!new_key) {
            console.log("Missing Parameter for '_add_Attr_Meta' method.");
            return null;
        }

        // if there were no _Attribute_Metadata objects generated for this layer:attribute add their containers
        if (!!!GEOSERVER_DATA_MGR._Attribute_Metadata[layer_ID]) GEOSERVER_DATA_MGR._Attribute_Metadata[layer_ID] = {};
        if (!!!GEOSERVER_DATA_MGR._Attribute_Metadata[layer_ID][attr_ID]) GEOSERVER_DATA_MGR._Attribute_Metadata[layer_ID][attr_ID] = {};

        GEOSERVER_DATA_MGR._Attribute_Metadata[layer_ID][attr_ID][new_key] = stored_val;

    },

    // #endregion


    // #region Query methods

    /* 
        method to query for Feature Type Property values from WFS service and store for later reference
        typically called after mapping local layer_ID to server reference layer_ID
    
        - creates a listing of attributes associated with this layer's features mapped to their datatypes
    */
    Load_Layer_Attribute_Meta: function(layer_id) {

        if (!!!layer_id || !!!GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id)) {
            console.log("ERROR: could not load layer properties for '" + layer_id + "'");
            return null;
        }

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);
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
        var request_url = encodeURIComponent(GEOSERVER_DATA_MGR._proxy_workspace_relative_path + '?' + $.map(url_params, function (val, key) { return key + '=' + val; }).join('&'));

        return $.ajax({
            url: GEOSERVER_DATA_MGR._proxy_prefix + request_url,
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
                                    GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, attr_val.name, "datatype", attr_val.type.replace(/.*:/, ""));
                                    GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, attr_val.name, "fully_loaded", false);
                                }

                            } else { // otherwise keep all except for the following fields
                                var excluded_fields = ['the_geom', 'geom', 'LOADDATE', 'METASOURCE', "SHAPE_AREA", "SHAPE_LENG", "SOURCEDATA", "SOURCEFEAT", "SOURCEORIG"];

                                // exclude 'the_geom' property as it will not be used within the application for filtering
                                if (excluded_fields.indexOf(attr_val.name) == -1) {

                                    // map this attribute to it's type for the current layer
                                    GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, attr_val.name, "datatype", attr_val.type.replace(/.*:/, ""));
                                    GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, attr_val.name, "fully_loaded", false);
                                }
                            }


                        });

                    });

                }
                GEOSERVER_DATA_MGR._Attribute_Metadata_LoadStatus[server_layer_name] = true;

            },
            error: function(msg) {
                console.log("ERROR: Failed to load attribute metadata for: '{0}'".format(layer_id));
                console.log(msg.responseText);
            }
        });

        // #endregion

    },

    

    /* 
        method to query for the data values associated with the specified layer's feature represented by the passed Feature_ID
        - gets a list of all of this feature's attributes mapped to the value for this feature and stores it's values in _Loaded_Vals lookup

    */
    _Load_Feature_Values: function(layer_ID, Feature_ID) {

        if (!!!layer_ID || !!!Feature_ID || !!!GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Feature_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);
        var url_params = {};

        // set up the url parameters to be passed with the request for layer feature properties
        url_params['service'] = 'wfs';
        url_params['version'] = '2.0.0';
        url_params['request'] = 'GetFeature';
        url_params['outputformat'] = 'application/json';
        url_params['typename'] = GEOSERVER_DATA_MGR._WORKSPACE + ":" + server_layer_name; // wms_namespace:wms_layer_name  
        url_params['featureID'] = Feature_ID;


        var restricted_fields = LAYER_MGR.get_Layer_Property_Meta(layer_ID);
        if (!!restricted_fields) {

            // restricting in URL doesn't work when querying for all attributes so just record restricted field names
            url_params['propertyName'] = Object.keys(restricted_fields).join(',');
            //restricted_fields = Object.keys(restricted_fields);
        }

        
        var request_url = encodeURIComponent(GEOSERVER_DATA_MGR._proxy_workspace_relative_path + '?' + $.map(url_params, function (val, key) { return key + '=' + val; }).join('&'));

        //var return_obj = {};

        return $.ajax({
            url: GEOSERVER_DATA_MGR._proxy_prefix + request_url,
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
                            GEOSERVER_DATA_MGR._add_Loaded_feature(layer_ID, Attribute_ID, Feature_ID, val);

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
    },

    /* 
        method to query for all feature values for a specifed Layer:Attribute and store them in _Loaded_Vals lookup
        //  NOTE: for sorting must be called after 'Load_Layer_Attribute_Meta'
    */
    _Load_Attribute_Values: function(layer_ID, Attribute_ID) {

        if (!!!layer_ID || !!!Attribute_ID || !!!GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        // if the attribute metadata is not loaded yet, try again in a few cycles
        if (!GEOSERVER_DATA_MGR.is_Attribute_Metadata_loaded(layer_ID)) {
            
            setTimeout(function () { GEOSERVER_DATA_MGR._Load_Attribute_Values(layer_ID, Attribute_ID); }, 500);
            return;

        }


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);


        // Perform a WFS query for the attribute values from 
        var url_params = {};

        // set up the url parameters to be passed with the request for layer feature properties
        url_params['service'] = 'wfs';
        url_params['version'] = '2.0.0';
        url_params['request'] = 'GetFeature';
        url_params['outputformat'] = 'application/json';
        url_params['typename'] = GEOSERVER_DATA_MGR._WORKSPACE + ":" + server_layer_name; // wms_namespace:wms_layer_name  
        url_params['propertyName'] = Attribute_ID;

        //var request_url = encodeURIComponent(GEOSERVER_DATA_MGR._WORKSPACE_URL + '?' + $.map(url_params, function(val, key) { return key + '=' + val; }).join('&'));
        var request_url = encodeURIComponent(GEOSERVER_DATA_MGR._proxy_workspace_relative_path + '?' + $.map(url_params, function (val, key) { return key + '=' + val; }).join('&'));
        
        //var return_obj = null;

        return $.ajax({
            url: GEOSERVER_DATA_MGR._proxy_prefix + request_url,
            type: "post",
            dataType: "json",
            success: function(response) {

                //console.log("SUCCESS: loaded attribute values for: '{0}:{1}'".format(layer_ID, Attribute_ID));
                if (response.features.length > 0) {

                    $.each(response.features, function(index, val) {
                        GEOSERVER_DATA_MGR._add_Loaded_feature(layer_ID, Attribute_ID, val.id, val.properties[Attribute_ID]);
                    });

                    
                    // sort the result by value (type dependant)
                    var datatype = GEOSERVER_DATA_MGR.get_Attribute_Meta(layer_ID, Attribute_ID, "datatype");


                    // mark this attribute as fully loaded once it passes through this method.
                    GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "fully_loaded", true);

                    switch (datatype) {
                    case "string":
                        GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID] = GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID].sort(function(a, b) {
                            return a.val.localeCompare(b.val);
                        });

                        // store count of string values as well as the number of distinct values (helps when determining classification)
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "count", GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID].length);
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "num_distinct", JSLINQ(GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID]).Distinct(function(item) { return item.val; }).Count());

                        break;

                    case "int":

                        GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID] = GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID].sort(function(a, b) {
                            return a.val - b.val;
                        });

                        // store max/min values for the numerical values
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "min", JSLINQ(GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID]).First().val);
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "max", JSLINQ(GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID]).Last().val);
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "count", GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID].length);

                        break;

                    case "number":
                        GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID] = GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID].sort(function(a, b) {
                            return a.val - b.val;
                        });

                        // store max/min values for the numerical values
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "min", JSLINQ(GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID]).First().val);
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "max", JSLINQ(GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID]).Last().val);
                        GEOSERVER_DATA_MGR._add_Attr_Meta(server_layer_name, Attribute_ID, "count", GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID].length);

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
    },

    // load attribute values for a specified layer
    _Load_Layer_Values: function(ajax_return, layer_ID) {

        if (!!!layer_ID) {
            console.log("ERROR: Could not load attribute data for Layer '{0}'".format(layer_ID));
            return null;
        }

        var layer_attrs = null;
        var restricted_fields = LAYER_MGR.get_Layer_Property_Meta(layer_ID);

        if (!!restricted_fields) {
            layer_attrs = Object.keys(restricted_fields);

        } else {
            layer_attrs = GEOSERVER_DATA_MGR.get_Attributes(layer_ID);
            layer_attrs = Object.keys(layer_attrs);
        }


        //var return_obj = null;
        if (!!layer_attrs) {

            //return_obj = {};
            $.each(layer_attrs, function(index, value) {
                //return_obj[value] = ;
                SPINNER_MGR.Register_Query(GEOSERVER_DATA_MGR._Load_Attribute_Values(layer_ID, value), null, null, '#map');

            });

        } else {
            console.log("ERROR: No requestable attributes specified for Layer '{0}'".format(layer_ID));
        }

        //return return_obj;
    },

    // #endregion Query methods


    // #region Utility Methods

    is_Feature_Loaded: function(layer_ID, Feature_ID) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

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
                if (!GEOSERVER_DATA_MGR.is_Feature_Attribute_Loaded(layer_ID, Attr_id, Feature_ID)) {
                    all_attr_loaded = false;
                    return false;
                }
            });

            // if haven't returned by now everything was found return true
            return all_attr_loaded;
        }

        // not ready for the case where feature values are not defined in layer data so return false
        return false;

    },

    is_Feature_Attribute_Loaded: function(layer_ID, attr_ID, feature_ID) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        // if all of the parameters are valid and they are mapped in _Loaded_Feature_Record return true
        return (!!layer_ID
            && !!attr_ID
            && !!feature_ID
            && !!server_layer_name
            && !!GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name]
            && !!GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name][attr_ID]
            && !!GEOSERVER_DATA_MGR._Loaded_Feature_Record[server_layer_name][attr_ID][feature_ID]);
    },

    // #endregion


    // #region Getters
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
    get_Server_Layer_Mapping: function(layer_ID) {

        if (!!layer_ID && this._Layer_Mapping[layer_ID]) {
            return this._Layer_Mapping[layer_ID];
        }

        return null;

    },

    // get all Attribute metadata for a specifed layer_id
    get_Attributes: function(layer_ID) {
        
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!server_layer_name) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        if (!!GEOSERVER_DATA_MGR._Attribute_Metadata[server_layer_name]) {

            return GEOSERVER_DATA_MGR._Attribute_Metadata[server_layer_name];
        }

        return null;
    },


    // returns the metadata of a requested layer attribute, or if requested, a specific metadata value 
    // NOTE same result as the above 
    get_Attribute_Meta: function(layer_ID, Attribute_id, Attr_Metadata_Requested) {
        
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);
        
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
    },


//
    get_Attribute_Values: function(layer_ID, Attribute_ID) {


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!Attribute_ID || !!!server_layer_name) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        // if the data has already been loaded return the requested data
        if (!!GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name] && !!GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID]) {
            return GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attribute_ID];

        } else {
            return GEOSERVER_DATA_MGR._Load_Attribute_Values(layer_ID, Attribute_ID);
        }

    },

    // 
    /*
        method to get the distinct feature values of an attribute given:
        layer_id -      layer id
        attribute_id -  attribtue id
        list_attr -     boolean representing whether the attribute is a list of values (true), or single value 
                        per entry (false||nonspecified)
                NOTE: for list attribtues the expected separator is ','
    */
    get_Distinct_Attribute_Values: function(layer_ID, Attribute_ID, list_attr) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!Attribute_ID || !!!server_layer_name) {
            console.log("ERROR: Could not get distinct data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        var distinct_values = [];
        var data_pool = GEOSERVER_DATA_MGR.get_Attribute_Values(layer_ID, Attribute_ID);

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


    },


    // returns all of the attribute data for a selected layer:feature_id
    //   EXPECTS _Load_Feature_Data to have completed before being called. otherwise will return null
    get_Feature_data: function(layer_ID, Feature_ID) {

        if (!!!layer_ID || !!!Feature_ID || !!!GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)) {
            console.log("ERROR: Could not load attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Feature_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        if (!GEOSERVER_DATA_MGR.is_Feature_Loaded(layer_ID, Feature_ID)) {
            console.log('ERROR: Could not get Feature data for "{0}:{1}", it is not loaded yet.'.format(layer_ID,Feature_ID));
            return null;

        }


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);
        // get the list of attributes for this layer's features

        
        // get list of expected attributes for this layer's features
        var expected_attrs = LAYER_MGR.get_Layer_Property_Meta(layer_ID);


        if (!!expected_attrs) {

            var val_mappings = {};

            $.each(expected_attrs, function(Attr_id) {
                var found_entry = JSLINQ(GEOSERVER_DATA_MGR._Loaded_Layer_Values[server_layer_name][Attr_id]).Where(function(item) {
                    return item.feature_id == Feature_ID;
                });

                val_mappings[Attr_id] = found_entry.items[0].val;

            });


            return val_mappings;

        }


        


    },


    // #region Data Filtering Methods

    // returns a collection of values for a specified Feature Attribute with optional filters
    get_Filtered_Values: function(layer_ID, Attribute_ID, Filters) {
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!Attribute_ID || !!!server_layer_name) {
            console.log("ERROR: Could get_Filtered_Values attribute data for {0}:{1}. GeoServer layer:'{2}".format(layer_ID, Attribute_ID, server_layer_name));
            return null;
        }

        // if no filters are specified return null
        var datapool = GEOSERVER_DATA_MGR.get_Attribute_Values(layer_ID, Attribute_ID);


        // if no filters were defined return the entire list of attribute values
        if ($.isEmptyObject(Filters)) {

            return datapool;
        } else {
            
            var filtered_feature_ids = GEOSERVER_DATA_MGR.get_Filtered_Feature_IDs(layer_ID, Filters);
            
            datapool = datapool.filter(function(feature_obj) {
                return !(filtered_feature_ids.indexOf(feature_obj['feature_id']) == -1);
            });

            return datapool;

        }
    },

    // get all feature id's included in a specified data filter
    get_Filtered_Feature_IDs: function(layer_ID, Filters) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!server_layer_name) {
            console.log("ERROR: Could not load attribute data for {0}. GeoServer layer:'{1}".format(layer_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
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
            var data_pool = GEOSERVER_DATA_MGR.get_Attribute_Values(layer_ID, prop_id);

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

    },


    get_CQL_Filter_String: function(layer_ID, Filters) {


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID);

        if (!!!layer_ID || !!!server_layer_name) {
            console.log("ERROR: Could not generate filter string for {0}. GeoServer layer:'{1}".format(layer_ID, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
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


    },

    // #endregion Data Filtering Methods

    // #endregion Getters

    // #region Filter/Classification Layer Methods

    // construct and return the layer source for a filter layer
    Construct_Filter_Layer_Source: function(layer_id, filter_str) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}".format(layer_id, GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_ID)));
            return null;
        }

        // make a deep copy of the default params
        var params = $.extend(true, {}, GEOSERVER_DATA_MGR._Data_Display_Layers_SOURCE_PARAMS);

        // specify the layer to reference
        params['LAYERS'] = "{0}:{1}".format(GEOSERVER_DATA_MGR._WORKSPACE, server_layer_name);

        // include the filter string if any
        if (!!filter_str) params['CQL_FILTER'] = filter_str;

        // set the layer style based on the layer type
        var layer_type = LAYER_MGR.get_Layer_Meta(layer_id, 'LayerType');
        if (!!layer_type) {
            params['STYLES'] = GEOSERVER_DATA_MGR._Filter_Layer_Styles[layer_type];
        }


        //params['StyleUrl'] = this.Generate_SLD(variable, classification, bounds); // this will change to the generated sld url

        var request_url = encodeURI(GEOSERVER_DATA_MGR._WORKSPACE_URL);


        var newSource = new ol.source.TileWMS({
            url: request_url,
            params: params
        });

        return newSource;


    },

    // generate a filter layer and add it as a linked layer to the layer represented by the passed layer_id in the LAYER_MGR
    Generate_Filter_Layer: function(layer_id, filter_str) {


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}".format(layer_id, server_layer_name));
            return null;
        }

        var filter_layer_Source = GEOSERVER_DATA_MGR.Construct_Filter_Layer_Source(layer_id, filter_str);

        var new_layer_id = layer_id + "_filter_lyr";

        // make layers and add to _LAYERS
        var new_layer = new ol.layer.Tile({
            visible: true,
            name: new_layer_id,
            source: filter_layer_Source,
        });

        //new_layer.setZIndex(this._generated_layer_z_index);
        //this._LAYERS.push(new_layer);

        GEOSERVER_DATA_MGR.Add_Data_Layer(layer_id, new_layer_id, new_layer);


        return new_layer;


    },


    Generate_Classification_Object: function (layer_id, Cut_Variable, classification, Num_Cuts, filter_obj) {
        
        var classification_object = {};

        var cuts = GEOSERVER_DATA_MGR.Generate_Classification_Ranges(layer_id, Cut_Variable, classification, Num_Cuts, filter_obj);

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

    },

    Generate_Classification_Layer: function (layer_id, Cut_Variable, classification, Num_Cuts, filter_obj) {

        // determine best way to handle the legend (possibly generate a unique id based off of the layer_id, and access it via jquery)
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}'".format(layer_id, server_layer_name));
            return null;
        }


        if (!!!Cut_Variable || !!!classification || !!!Num_Cuts) {
            console.log("ERROR: Could not generate Classifications due to missing parameters");
            return null;
        }

        // generate the classification object
        var classification_obj = GEOSERVER_DATA_MGR.Generate_Classification_Object(layer_id, Cut_Variable, classification, Num_Cuts, filter_obj);
        
        if (classification_obj == null) {
            console.log("ERROR: Generate_Classification_Layer Failed to generate classification Object");
            return null;
        }


        // generate the cql filter string
        var filter_str = GEOSERVER_DATA_MGR.get_CQL_Filter_String(layer_id, filter_obj);

        // initialize the new layer source
        GEOSERVER_DATA_MGR.Construct_Classification_Layer_Source(layer_id, classification_obj, filter_str);


        return classification_obj;

        //return {
        //    "layer": new_layer,
        //    "Classification_obj": classification_obj,
        //};

    },

    Construct_Classification_Layer_Source: function (layer_id, classification_obj, filter_str) {

        

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not display layer source for {0}. GeoServer layer:'{1}".format(layer_id, server_layer_name));
            return null;
        }

        
        // make a deep copy of the default params
        var params = $.extend(true, {}, GEOSERVER_DATA_MGR._Data_Display_Layers_SOURCE_PARAMS);
        params['StyleFormat'] = 'sld';

        // seemingly not needed, also causes postGIS layers to not load properly if these params are specified
        //params['STYLES'] = "{0}:{1}".format(GEOSERVER_DATA_MGR._WORKSPACE, server_layer_name);
        //params['LAYERS'] = "{0}:{1}".format(GEOSERVER_DATA_MGR._WORKSPACE, server_layer_name);  // specify the layer to reference

        if (!!filter_str) params['CQL_FILTER'] = filter_str;        // include the filter string if any
        var request_url = encodeURI(GEOSERVER_DATA_MGR._WORKSPACE_URL);

        
        var newSource_options = {
            url: request_url,
            params: params
        };
        

        
        

        // set the layer style based on the layer type
        var layer_type = LAYER_MGR.get_Layer_Meta(layer_id, 'LayerType');

        if (!!layer_type) {

            // TODO: Make call to controller to generate and store a new SLD for this Classification layer

            //var SLD_Meta = GEOSERVER_DATA_MGR.Generate_SLD_Link(layer_id, layer_type, classification_obj);

            SPINNER_MGR.Register_Query(GEOSERVER_DATA_MGR.Generate_SLD_Link(layer_id, layer_type, classification_obj),
                GEOSERVER_DATA_MGR.Publish_Classification_Layer,
                [layer_id, newSource_options, classification_obj],
                '#map');

        }

    },
    
    Generate_SLD_Link: function (layer_id, layer_type, classification_obj ) {


        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        
        var param_data =
        {
            workspace: GEOSERVER_DATA_MGR._WORKSPACE,
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
                GEOSERVER_DATA_MGR._Data_Layer_Styles[server_layer_name] = data;

            },
        });

        
        

    },

    Publish_Classification_Layer: function (ajax_return_obj, layer_id, layer_source_options, classification_obj) {
        
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        var new_layer_id = layer_id + "_class_lyr";
        var sld_info = GEOSERVER_DATA_MGR._Data_Layer_Styles[server_layer_name];
        
        // add the newly generated sld link to the source parameters
        layer_source_options.params['SLD'] = sld_info['Style_Link']; // update style params with newly generated SLD_Link
        

        var newSource = new ol.source.TileWMS(layer_source_options);

        // make layers and add to _LAYERS
        var new_layer = new ol.layer.Tile({
            visible: true,
            name: new_layer_id,
            source: newSource,
        });

        GEOSERVER_DATA_MGR.Add_Data_Layer(layer_id, new_layer_id, new_layer, classification_obj['legend']);

    },


    Generate_CSV_Download: function (layer_id, filter_obj) {

        var _csv_content = [];
        var layer_properties = Object.keys(LAYER_MGR.get_Layer_Property_Meta(layer_id));
        var filtered_feature_ids = GEOSERVER_DATA_MGR.get_Filtered_Feature_IDs(layer_id, filter_obj); // if null assume inclusion


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

            var full_attr_pool = GEOSERVER_DATA_MGR.get_Attribute_Values(layer_id, prop_id);

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

    },

    Add_Data_Layer: function (layer_id, linked_layer_id, layer, legend) {

        if (!!!legend) legend = null;
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not add linked layer '{2}' for {0}. GeoServer layer:'{1}".format(layer_id, server_layer_name, linked_layer_id));
            return null;
        }

        // enforce single data layer per layer_id
        if (!!GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {

            var child_id = GEOSERVER_DATA_MGR.get_Data_Layer_id(layer_id);

            GEOSERVER_DATA_MGR.Remove_Data_Layer(layer_id);
            LAYER_MGR.Unlink_Layer(layer_id, child_id);

        }

        GEOSERVER_DATA_MGR._Data_Display_Layers[server_layer_name] = layer;
        
        
        // add the new layer to the map and link it to the associated base layer
        MAP_MGR.addLayer(layer, legend);

        LAYER_MGR.Link_Layer(layer_id, linked_layer_id, 1, legend);
        LAYER_MGR.Update_Layer_Draw_Order();

    },

    Remove_Data_Layer: function (layer_id) {

        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not remove data layer for {0}:{1}. (layer not mapped)".format(layer_id));
            return null;
        }

        if (GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {

            var child_layer_id = GEOSERVER_DATA_MGR.get_Data_Layer_id(layer_id);
            LAYER_MGR.Unlink_Layer(layer_id,child_layer_id);
            
        }

        this._Data_Display_Layers[server_layer_name] = null;


        // determine best way to handle the legend

    },

    Hide_Data_Layer: function (layer_id) {
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not remove data layer for {0}:{1}. (layer not mapped)".format(layer_id));
            return null;
        }

        if (GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {
            //MAP_MGR.hide_Layer(this._Data_Display_Layers[server_layer_name].get('name'));
            var child_layer_id = this._Data_Display_Layers[server_layer_name].get('name');
            LAYER_MGR.hide_Linked_Layer(layer_id, child_layer_id);
        }
    },

    Show_Data_Layer: function (layer_id) {
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);

        if (!!!layer_id || !!!server_layer_name) {
            console.log("ERROR: Could not remove data layer for {0}:{1}. (layer not mapped)".format(layer_id));
            return null;
        }

        if (GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {
            
            var child_layer_id = this._Data_Display_Layers[server_layer_name].get('name');
            LAYER_MGR.show_Linked_Layer(layer_id, child_layer_id);
            LAYER_MGR.Update_Layer_Draw_Order();


        }
    },

    Data_Layer_Exists: function(layer_id) {
        var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);
        return (!!this._Data_Display_Layers[server_layer_name]);

    },

    get_Data_Layer_id: function (layer_id) {
      if (GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {
          var server_layer_name = GEOSERVER_DATA_MGR.get_Server_Layer_Mapping(layer_id);
          return this._Data_Display_Layers[server_layer_name].get('name');
      }

        return null;
    },

    Generate_Classification_Ranges: function (layer_id, attr_id, classification, num_cuts, filter_obj) {

        // register a new spinner because occasionally this method can take a while
        

        // Get filtered HUC dataset filtered by the user specified thresholds/States
        //var HUC8_mappings = HUC8_DATA_MGR.Get_Filtered_Vals(variable, NEXUS_FILTER_DIALOG_MGR.State_Filtering_selection(), NEXUS_FILTER_DIALOG_MGR.Threshold_Filtering_selections());
        var Filtered_Dataset = GEOSERVER_DATA_MGR.get_Filtered_Values(layer_id, attr_id, filter_obj);


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
        
        


    },


    // #endregion

}

/* object to handle the operation of the filtering dialog
      dependent on: 
        - GEOSERVER_DATA MGR
        - CLASSIFICATION_MGR
        - LAYER_MGR
*/

var INTERACTIVE_DIALOG_MGR = {


    //#region Properties

    // maintain an instance of each filtering dialog listed mapped to the layer_id
    // to maintain selection between accessing various filtering dialogs
    _generated_dialogs: {},

    _default_animation_speed: 200,

    // the default dialog settings for generated dialogs
    _dialog_default_settings: {
        autoOpen: false,
        draggable: true,
        modal: false,
        resizable: false,
        resize: 'auto',
    },

    _tab_headers: [],

    //#endregion


    //#region FUNCTIONALITY METHODS

    open_dialog: function(layer_id) {
        // if there already is a dialog for this layer open it
        // otherwise load generate it
        if (!!INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id]) {
            // open this dialog

            INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].dialog('open');


        } else {


            // TODO: figure out how to get this spinner working correctly
            //      ajax hits to fast and closes the spinner near instantanionsly
            


            // load values for use in dialog generation before continuing
            //GEOSERVER_DATA_MGR._Load_Layer_Values(layer_id);

            var new_dialog = INTERACTIVE_DIALOG_MGR.Generate_Interaction_Dialog(layer_id);
            INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id] = new_dialog;

            


            new_dialog.dialog('open');

        }

        // enable rootlayer if the checkbox is unchecked (better for workflow)
        INTERACTIVE_DIALOG_MGR.show_base_layer(layer_id);

        

        // get any linked layers and associated with this layer_id and show them 
        if (GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {
            INTERACTIVE_DIALOG_MGR.show_data_layer(layer_id);
        }
    },

    close_dialog: function(layer_id) {
        // trigger the close event for the dialog mapped to this layer_id  
        if (!!INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id]) {
            INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].dialog('close');
        }


    },

    cleanup: function(layer_id) {
        // hide any linked layers associated with this layer
        if (GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {
            var data_layer_id = GEOSERVER_DATA_MGR.get_Data_Layer_id(layer_id);

            // older functionality, Hide the interaction layer upon dialog closing
            //LAYER_MGR.hide_Linked_Layer(layer_id, data_layer_id);

        }

        // if the base layer was hidden by the dialog reshow it
        //MAP_MGR.show_Layer(layer_id);
        INTERACTIVE_DIALOG_MGR.show_base_layer(layer_id);
    },


    //#endregion


    //#region OBJECT GENERATION METHODS
    Generate_Interaction_Dialog: function(layer_id) {
        var new_interaction_dialog = $(document.createElement('div'));

        new_interaction_dialog.attr('id', layer_id + "_Interaction_Dialog");
        new_interaction_dialog.addClass('Interaction_Dialog');
        new_interaction_dialog.attr('layer_id', layer_id);
        
        new_interaction_dialog.attr('title', "'" + LAYER_MGR.get_Layer_Meta(layer_id, 'title') + "'" + ' Layer Interaction');
        new_interaction_dialog.css('z-index', 2000);


        var new_interaction_dialog_content = $(document.createElement('div'));
        new_interaction_dialog_content.addClass('Interaction_Dialog_content');


        var layer_control_wrapper = $(document.createElement('div'));
        layer_control_wrapper.addClass('layer_control_wrapper');

        var layer_control_legend = $(document.createElement('span'));
        layer_control_legend.append('Layer Visibility:');
        layer_control_legend.css({'padding': '10px'});

        // #region base layer display control

        var base_layer_enabler_label = $(document.createElement('label'));
        base_layer_enabler_label.addClass('layer_control_input');
        base_layer_enabler_label.addClass('selected');

        var base_layer_enabler = $(document.createElement('input'));
        base_layer_enabler.css({ 'vertical-align': 'text-bottom' });
        base_layer_enabler.addClass('base_layer_enabler');
        

        base_layer_enabler.attr('name', layer_id + "_base_layer_enabler");
        base_layer_enabler.attr('type', "checkbox");
        base_layer_enabler.attr('checked', 'checked');

        base_layer_enabler.change(INTERACTIVE_DIALOG_MGR._display_base_layer_check_evt);


        base_layer_enabler_label.append(base_layer_enabler);
        base_layer_enabler_label.append('Default Layer');

        // # endregion base layer display

        // #region Data layer display control
        
        var data_layer_enabler_label = $(document.createElement('label'));
        data_layer_enabler_label.addClass('layer_control_input');
        data_layer_enabler_label.addClass('disabled');
        //data_layer_enabler_label.css({ 'float': 'right', 'cursor': 'pointer' });

        var data_layer_enabler = $(document.createElement('input'));
        data_layer_enabler.css({ 'vertical-align': 'text-bottom' });
        data_layer_enabler.addClass('data_layer_enabler');
        data_layer_enabler.attr('name', layer_id + "_data_layer_enabler");
        data_layer_enabler.attr('type', "checkbox");


        data_layer_enabler.attr('disabled', 'disabled');
        data_layer_enabler.change(INTERACTIVE_DIALOG_MGR._display_data_layer_check_evt);


        data_layer_enabler_label.append(data_layer_enabler);
        data_layer_enabler_label.append('Interaction Layer');
        

        // # endregion data layer display


        layer_control_wrapper.append(layer_control_legend);
        layer_control_wrapper.append(base_layer_enabler_label);
        layer_control_wrapper.append(data_layer_enabler_label);
        layer_control_wrapper.buttonset();
        new_interaction_dialog.append(layer_control_wrapper);


        

        var dialog_controls = INTERACTIVE_DIALOG_MGR.Generate_Dialog_Controls();
        new_interaction_dialog.append(dialog_controls);
        
        new_interaction_dialog.append('<br/>');


        //var tabs_content = INTERACTIVE_DIALOG_MGR.Generate_Dialog_Tabs(layer_id);
        var tabs_content = INTERACTIVE_DIALOG_MGR.Generate_Combined_filter_classification_tabs(layer_id);
        new_interaction_dialog_content.append(tabs_content);


        new_interaction_dialog.append(new_interaction_dialog_content);

        new_interaction_dialog.dialog(INTERACTIVE_DIALOG_MGR._dialog_default_settings);

        new_interaction_dialog.on('dialogbeforeclose', function(evt, ui) {
            // remove enabled from linked layer 'Interaction' button on before closing the dialog
            $('#' + layer_id + '_Filtering_btn').removeClass('enabled');
            INTERACTIVE_DIALOG_MGR.cleanup(layer_id);
        });


        new_interaction_dialog.on('dialogopen', function (evt, ui) {
            // add enabled from linked layer 'Interaction' button on opening the dialog (incase triggered from elsewhere)
            $('#' + layer_id + '_Filtering_btn').addClass('enabled');

            //INTERACTIVE_DIALOG_MGR.cleanup(layer_id);
        });

        return new_interaction_dialog;

    },

    Generate_Dialog_Tabs: function (layer_id) {

        // TODO: only generate filter/classification tabs when flags are true in layer meta
        var is_Classifiable = LAYER_MGR.get_Layer_Meta(layer_id, 'Classifiable');
        
        var tabs_container = $(document.createElement('div'));
        tabs_container.addClass("Interaction_Dialog_tabs");

        // #region Generate tab headers
        var tab_headers = $(document.createElement('ul'));
        tab_headers.addClass('Interaction_Dialog_tab_headers');

        var filter_tab = $(document.createElement('li'));
        var filter_tab_link = $(document.createElement('a'));
        var filter_tab_id = layer_id + '_filter_tab';

        filter_tab_link.html('Filtering');
        filter_tab_link.attr('href', '#' + filter_tab_id);

        filter_tab.append(filter_tab_link);
        tab_headers.append(filter_tab);
        INTERACTIVE_DIALOG_MGR._tab_headers.push('Filtering');
        
        if (!!is_Classifiable) {
            var Class_tab = $(document.createElement('li'));
            var Class_tab_link = $(document.createElement('a'));
            var Class_tab_id = layer_id + '_class_tab';

            Class_tab_link.html('Classification');
            Class_tab_link.attr('href', '#' + Class_tab_id);

            Class_tab.append(Class_tab_link);
            tab_headers.append(Class_tab);
            INTERACTIVE_DIALOG_MGR._tab_headers.push('Classification');

            var Visual_tab = $(document.createElement('li'));
            var Visual_tab_link = $(document.createElement('a'));
            var Visual_tab_id = layer_id + '_visual_tab';

            Visual_tab_link.html('Visualization');
            Visual_tab_link.attr('href', '#' + Visual_tab_id);

            Visual_tab.append(Visual_tab_link);
            tab_headers.append(Visual_tab);
            INTERACTIVE_DIALOG_MGR._tab_headers.push('Visualization');

        }
        
        tabs_container.append(tab_headers);

        // #endregion Generate tab headers

        // #region Generate tab content blocks
        var filter_content = $(document.createElement('div'));
        var filter_body = INTERACTIVE_DIALOG_MGR.Generate_Layer_Filtering_controls(layer_id); //filter_content.html("FILTERING TAB PLACEHOLDER");


        filter_content.attr('id', filter_tab_id);
        filter_content.append(filter_body);

        tabs_container.append(filter_content);
        
        if (!!is_Classifiable) {
            var Class_content = $(document.createElement('div'));
            Class_content.attr('id', Class_tab_id);
            Class_content.append(INTERACTIVE_DIALOG_MGR.Generate_Classification_controls(layer_id));
            tabs_container.append(Class_content);

            var Visual_content = $(document.createElement('div'));
            var Visual_body = INTERACTIVE_DIALOG_MGR.Generate_Visualization_controls(layer_id);

            Visual_content.attr('id', Visual_tab_id);
            Visual_content.append(Visual_body);

            tabs_container.append(Visual_content);

        }
        
        //#endregion Generate tab content blocks

        tabs_container.tabs();
        tabs_container.tabs('disable',2); // initially disable the visualization tab until classification has been run
        return tabs_container;

    },

    Generate_Combined_filter_classification_tabs: function (layer_id) {

        var is_Classifiable = LAYER_MGR.get_Layer_Meta(layer_id, 'Classifiable');

        var tabs_container = $(document.createElement('div'));
        tabs_container.addClass("Interaction_Dialog_tabs");

        // #region Generate tab headers
        var tab_headers = $(document.createElement('ul'));
        tab_headers.addClass('Interaction_Dialog_tab_headers');

        var filter_tab = $(document.createElement('li'));
        var filter_tab_link = $(document.createElement('a'));
        var filter_tab_id = layer_id + '_filter_tab';

        filter_tab_link.html('Filtering');
        filter_tab_link.attr('href', '#' + filter_tab_id);

        filter_tab.append(filter_tab_link);
        tab_headers.append(filter_tab);
        INTERACTIVE_DIALOG_MGR._tab_headers.push('Filtering');

        if (!!is_Classifiable) {

            var Visual_tab = $(document.createElement('li'));
            var Visual_tab_link = $(document.createElement('a'));
            var Visual_tab_id = layer_id + '_visual_tab';

            Visual_tab_link.html('Visualization');
            Visual_tab_link.attr('href', '#' + Visual_tab_id);

            Visual_tab.append(Visual_tab_link);
            tab_headers.append(Visual_tab);
            INTERACTIVE_DIALOG_MGR._tab_headers.push('Visualization');
        }


        tabs_container.append(tab_headers);

        // #endregion Generate tab headers

        // #region Generate tab content blocks

        var filter_content = $(document.createElement('div'));
        filter_content.attr('id', filter_tab_id);


        // add a container for default filtering inputs here
        var layer_attr_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id);

        // check if any of the attributes are marked as 'Default_Filter'
        var has_default_domain = false;
        $.each(layer_attr_meta, function(attr_id, meta_data) {
            if (!!meta_data['Default_Filter']) {
                has_default_domain = true;
            }
        });

        // if there are default filters specifed place them in the 'Select Domain' fieldset
        if (!!has_default_domain) {
            var default_filtering_fieldset = $(document.createElement('fieldset'));
            var default_filtering_fieldset_legend = $(document.createElement('legend'));
            default_filtering_fieldset_legend.append("Select Domain");

            var default_filtering_wrapper = $(document.createElement('div'));
            default_filtering_wrapper.addClass('default_filtering_wrapper');

            $.each(layer_attr_meta, function (attr_id, meta_data) {
                // if the current attribute is a default filter add it's filter input to the default_filtering_wrapper
                if (!!meta_data['Default_Filter']) {
                    default_filtering_wrapper.append(INTERACTIVE_DIALOG_MGR.Generate_Filter_Input(layer_id, attr_id, false));
                }
            });

            $.each(default_filtering_wrapper.find('.filter'), function (index, filter_obj) {
                // if the current attribute is a default filter add it's filter input to the default_filtering_wrapper
                if ($(filter_obj).find('.filter_input_form').hasClass('multiselect')) {
                    var prop_id = $(filter_obj).attr('prop_id');
                    var display_name = (!!layer_attr_meta[prop_id]['Display_Name']) ? layer_attr_meta[prop_id]['Display_Name'] : prop_id;
                    $(filter_obj).find('select.multiselect_drop').multiselect({ noneSelectedText: "Select {0}".format(display_name), selectedText: "# {0} selected".format(display_name) });
                }
            });
            // initialize any multiselects after appending them


            default_filtering_fieldset.append(default_filtering_fieldset_legend);
            default_filtering_fieldset.append(default_filtering_wrapper);
            filter_content.append(default_filtering_fieldset);

        }

        
        // add classification block to filter container if this layer is set to have classification
        if (!!is_Classifiable) {

            var classification_fieldset = $(document.createElement('fieldset'));
            var classification_fieldset_legend = $(document.createElement('legend'));
            classification_fieldset_legend.append("Select Classification");


            var Class_content = $(document.createElement('div'));
            var Class_tab_id = layer_id + '_class_tab';
            Class_content.attr('id', Class_tab_id);
            Class_content.append(INTERACTIVE_DIALOG_MGR.Generate_Classification_controls(layer_id,false));
            //var Class_body = INTERACTIVE_DIALOG_MGR.Generate_Classification_controls(layer_id); //filter_content.html("FILTERING TAB PLACEHOLDER");


            classification_fieldset.append(classification_fieldset_legend);
            classification_fieldset.append(Class_content);
            filter_content.append(classification_fieldset);

            //filter_content.append(Class_content);


            var Visual_content = $(document.createElement('div'));
            var Visual_body = INTERACTIVE_DIALOG_MGR.Generate_Visualization_controls(layer_id);

            Visual_content.attr('id', Visual_tab_id);
            Visual_content.append(Visual_body);

            tabs_container.append(Visual_content);
        }



        var addtl_filters_fieldset = null;
        var addtl_filters_legend = null;
        

        
        


        // if the current layer is classifiable or has a default domain,
        // add teh 'Show/hide addtl filters' button add additional filters to a fieldset
        if (!!is_Classifiable || !!has_default_domain) {
            addtl_filters_fieldset = $(document.createElement('fieldset'));
            addtl_filters_fieldset.addClass('addtl_filters_wrapper');


            addtl_filters_legend = $(document.createElement('legend'));
            addtl_filters_legend.append("Additional Filtering");

            addtl_filters_fieldset.append(addtl_filters_legend);

            var addtl_filter_link = $(document.createElement('a'));
            addtl_filter_link.addClass('toggle_Addtl_filters_button');
            addtl_filter_link.html('Show Additional Filters');

            addtl_filter_link.click(function(evt) {
                
                var toggle_filter_link = $(evt.currentTarget);
                var curr_dialog = toggle_filter_link.closest('.Interaction_Dialog');
                var addtl_filters_wrapper = curr_dialog.find('.addtl_filters_wrapper');

                if (addtl_filters_wrapper.is(':visible')) {
                    toggle_filter_link.html('Show Additional Filters');
                    addtl_filters_wrapper.hide();

                } else {
                    toggle_filter_link.html('Hide Additional Filters');
                    addtl_filters_wrapper.show();
                }

            });

            filter_content.append('<br/>');
            filter_content.append(addtl_filter_link);
            filter_content.append('<br/>');

            addtl_filters_fieldset.hide();

        } else {
            var addtl_filters_fieldset = $(document.createElement('div'));
            addtl_filters_fieldset.addClass('addtl_filters_wrapper');
        }

        
        
        var filter_body = INTERACTIVE_DIALOG_MGR.Generate_Layer_Filtering_controls(layer_id, false); 
        
        filter_content.append('<br/>');
        
        //filter_content.append(filter_body);
        addtl_filters_fieldset.append(filter_body);
        filter_content.append(addtl_filters_fieldset);

        tabs_container.append(filter_content);
        
        var button_wrapper = $(document.createElement('div'));
        button_wrapper.addClass('button_wrapper');

        var display_button = $(document.createElement('button'));
        display_button.attr('type', 'button');
        display_button.addClass('interaction_display_button');
        //display_button.attr('disabled', 'disabled');
        display_button.append("Display");

        display_button.click(function (evt) {

            var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');
            var class_selection = curr_dialog.find('.classification_var_selection');
            var selected_val = class_selection.val();
            if (selected_val == "0" || typeof (selected_val) == "undefined") {
                INTERACTIVE_DIALOG_MGR._filter_display_clicked_evt(evt);
            } else {
                INTERACTIVE_DIALOG_MGR._classification_display_clicked_evt(evt);
            }
            
        }) ;

        var download_button = $(document.createElement('button'));
        download_button.attr('type', 'button');
        download_button.addClass('download_button');

        var download_icon = $(document.createElement('img'));
        download_icon.attr('src', '/Content/images/icons/Download_icon_white.png');

        download_button.append(download_icon);
        download_button.append("Download Selection");

        // download same dataset as the filter tab
        download_button.click(INTERACTIVE_DIALOG_MGR._filter_download_clicked_evt);

        button_wrapper.append(download_button);
        button_wrapper.append(display_button);
        tabs_container.append(button_wrapper);



        tabs_container.tabs();
        if (is_Classifiable) tabs_container.tabs('disable', INTERACTIVE_DIALOG_MGR._tab_headers.indexOf('Visualization')); // initially disable the visualization tab until classification has been run






        return tabs_container;
    },
    
    // add generic controls used for this dialog (reset/help)
    Generate_Dialog_Controls: function() {
        var controls_container = $(document.createElement('div'));

        controls_container.addClass('Interaction_Dialog_controls_container');

        //var dialog_help_btn = $(document.createElement('div'));
        //dialog_help_btn.addClass('Interaction_Dialog_control');
        //dialog_help_btn.addClass('info_button');
        //dialog_help_btn.attr('title', "Help");

        //controls_container.append(dialog_help_btn);


        var dialog_reset_btn = $(document.createElement('div'));
        dialog_reset_btn.addClass('Interaction_Dialog_control');
        dialog_reset_btn.addClass('reset_button');
        dialog_reset_btn.attr('title', "Reset all fields on this dialog");
        dialog_reset_btn.css({
            'float': 'right',
            'margin-top': '-21px',
        });

        dialog_reset_btn.click(INTERACTIVE_DIALOG_MGR._reset_dialog_clicked_evt);

        controls_container.append(dialog_reset_btn);

        return controls_container;
    },

    // add generic controls used for the user input tabs of this dialog
    Generate_Tab_Controls: function() {
        var controls_container = $(document.createElement('div'));
        controls_container.addClass('tab_controls_container');

        var dialog_help_btn = $(document.createElement('div'));
        dialog_help_btn.addClass('Interaction_Dialog_control');
        dialog_help_btn.addClass('help_button');
        dialog_help_btn.attr('title', "Help");

        controls_container.append(dialog_help_btn);


        var dialog_reset_btn = $(document.createElement('div'));
        dialog_reset_btn.addClass('Interaction_Dialog_control');
        dialog_reset_btn.addClass('reset_button');
        dialog_reset_btn.attr('title', "Reset");

        controls_container.append(dialog_reset_btn);

        return controls_container;


    },

    Generate_Layer_Filtering_controls: function (layer_id, include_buttons) {

        if (typeof (include_buttons) == "undefined") include_buttons = true;

        var layer_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id);


        var filtering_wrapper = $(document.createElement('div'));
        filtering_wrapper.addClass('tab_content_wrapper');
        filtering_wrapper.addClass('filtering_wrapper');
        

        var filter_selector_label = $(document.createElement('label'));
        filter_selector_label.attr('for', layer_id + "_filter_selection");
        filter_selector_label.append('Select a Filter Variable:');


        var filter_selector = $(document.createElement('select'));
        filter_selector.addClass('filter_selection');
        filter_selector.attr('name', layer_id + "_filter_selection");
        
        filter_selector.change(INTERACTIVE_DIALOG_MGR._filter_var_selection_changed_evt);

        var default_option = $(document.createElement('option'));
        default_option.attr('value', 0);
        default_option.append("Add Filter");

        filter_selector.append(default_option);


        //var add_filter_button = $(document.createElement('button'));
        //add_filter_button.attr('title', 'Add Filter for Selected Variable');
        //add_filter_button.attr('type', 'button');
        //add_filter_button.append('+');
        //add_filter_button.addClass('add_filter_btn');
        //// add events to necessary buttons/controls
        //add_filter_button.click(INTERACTIVE_DIALOG_MGR._filter_var_selection_changed_evt);


        var reset_all_filters_button = $(document.createElement('a'));
        //reset_all_filters_button.addClass('reset_button');

        
        reset_all_filters_button.html("Clear Filters");
        reset_all_filters_button.addClass('ClearAll_Filters');
        reset_all_filters_button.attr('title', 'Remove all Selected Filters');
        reset_all_filters_button.css({
            'margin-left': '10px',
            'display': 'inline-block',
        });


        reset_all_filters_button.click(INTERACTIVE_DIALOG_MGR._remove_all_filters_clicked_evt);

        var variable_description_container = $(document.createElement('div'));
        variable_description_container.addClass('var_description');


        var filter_input_container = $(document.createElement('div'));
        filter_input_container.addClass('added_filters');
        //filter_input_container.append('added_filters placeholder');

        //var generated_FilterInput_container = $(document.createElement('fieldset'));
        //generated_FilterInput_container.addClass('added_filters_wrapper');

        //var FilterInput_container_label = $(document.createElement('legend'));
        //FilterInput_container_label.append('Selected Filters');

        
        
        var group_properties = LAYER_MGR.get_Layer_Meta(layer_id, 'Group_Properties');

        // optgroup object mapping a 'Display_Group' id to its list of properties
        var opt_groups = {};
        var opt_groups_order = []; // display order will be determined by the order groups are encountered

        $.each(layer_meta, function(property_key, display_meta) {
            // create a dropdown for filtering

            //var display_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, property_key);
            if (!!display_meta['Default_Filter']) return;

            var curr_option_obj = $(document.createElement('option'));
            curr_option_obj.attr('value', property_key);

            // set the text to the property's display name if it has one, otherwise use the property_id
            var option_text = (!!display_meta && !!display_meta['Display_Name']) ? display_meta['Display_Name'] : property_key;
            curr_option_obj.append(option_text);


            // check if the options should be grouped
            if (group_properties && display_meta['Display_Group']) {
                var curr_group = display_meta['Display_Group'];

                // if this group hasn't already been initialized, initialize it and record the order it was loaded
                if (!!!opt_groups[curr_group]) {
                    opt_groups[curr_group] = [];
                    opt_groups_order.push(curr_group);
                }

                // push this option to this optgroup's collection to be output after 
                opt_groups[curr_group].push(curr_option_obj);


            } else {
                filter_selector.append(curr_option_obj);
            }
        });

        if (group_properties) {
            // generate and append any option groups to the filter_selector

            $.each(opt_groups_order, function(i, group_name) {
                var new_group_obj = $(document.createElement('optgroup'));
                new_group_obj.attr('label', group_name);

                $.each(opt_groups[group_name], function(i, value) {
                    new_group_obj.append(value);
                });

                filter_selector.append(new_group_obj);
            });


        }

        filtering_wrapper.append(filter_selector_label);
        filtering_wrapper.append('<br/>');
        filtering_wrapper.append(filter_selector);

        filtering_wrapper.append(reset_all_filters_button);
        filtering_wrapper.append(variable_description_container);
        filtering_wrapper.append(filter_input_container);
        

        if (include_buttons) {
            var button_wrapper = $(document.createElement('div'));
            button_wrapper.addClass('button_wrapper');

            var filter_display_button = $(document.createElement('button'));
            filter_display_button.attr('type', 'button');
            filter_display_button.addClass('filter_display_button');
            filter_display_button.append("Display");

            filter_display_button.click(INTERACTIVE_DIALOG_MGR._filter_display_clicked_evt);

            var filter_download_button = $(document.createElement('button'));
            filter_download_button.attr('type', 'button');
            filter_download_button.addClass('download_button');

            var download_icon = $(document.createElement('img'));
            download_icon.attr('src', '/Content/images/icons/Download_icon_white.png');


            filter_download_button.append(download_icon);
            filter_download_button.append("Download Selection");

            filter_download_button.click(INTERACTIVE_DIALOG_MGR._filter_download_clicked_evt);

            button_wrapper.append(filter_download_button);
            button_wrapper.append(filter_display_button);
            filtering_wrapper.append(button_wrapper);
        }
        
        //filtering_wrapper.append(filter_layer_enabler_label);
        //filtering_wrapper.append('<br/>');

        


        return filtering_wrapper;


    },

    Generate_Classification_controls: function(layer_id, include_buttons) {

        if (typeof (include_buttons) == "undefined") include_buttons = true;

        var layer_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id);

        var classification_wrapper = $(document.createElement('div'));
        classification_wrapper.addClass('tab_content_wrapper');
        classification_wrapper.addClass('classification_wrapper');
        
        
        var classification_selector_label = $(document.createElement('label'));
        classification_selector_label.attr('for', layer_id + "_classification_var_selection");
        classification_selector_label.append('Select a Classification Variable:');


        var classification_selector = $(document.createElement('select'));
        classification_selector.addClass('classification_var_selection');
        classification_selector.attr('name', layer_id + "_classificatioin_var_selection");
        

        classification_selector.change(function (evt) {
            INTERACTIVE_DIALOG_MGR._var_select_changed_evt(evt);
            INTERACTIVE_DIALOG_MGR._class_variable_selected_evt(evt);
        });

        // #region Variable Selection generation

        var default_option = $(document.createElement('option'));
        default_option.attr('value', 0);
        default_option.append("Select Variable");

        classification_selector.append(default_option);


        var group_properties = LAYER_MGR.get_Layer_Meta(layer_id, 'Group_Properties');

        // optgroup object mapping a 'Display_Group' id to its list of properties
        var opt_groups = {};
        var opt_groups_order = []; // display order will be determined by the order groups are encountered

        $.each(layer_meta, function (property_key, display_meta) {

            // if the display meta for this attribute doesn't have the 'Classifiable' flag skip adding option for this variable
            if (!!!display_meta['Classifiable']) return true;


            // create a dropdown for filtering
            
            //var display_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, property_key);
            var curr_option_obj = $(document.createElement('option'));
            curr_option_obj.attr('value', property_key);

            // set the text to the property's display name if it has one, otherwise use the property_id
            var option_text = (!!display_meta && !!display_meta['Display_Name']) ? display_meta['Display_Name'] : property_key;
            curr_option_obj.append(option_text);


            // check if the options should be grouped
            if (group_properties && display_meta['Display_Group']) {
                var curr_group = display_meta['Display_Group'];

                // if this group hasn't already been initialized, initialize it and record the order it was loaded
                if (!!!opt_groups[curr_group]) {
                    opt_groups[curr_group] = [];
                    opt_groups_order.push(curr_group);
                }

                // push this option to this optgroup's collection to be output after 
                opt_groups[curr_group].push(curr_option_obj);


            } else {
                classification_selector.append(curr_option_obj);
            }
        });

        if (group_properties) {
            // generate and append any option groups to the filter_selector

            $.each(opt_groups_order, function (i, group_name) {
                var new_group_obj = $(document.createElement('optgroup'));
                new_group_obj.attr('label', group_name);

                $.each(opt_groups[group_name], function (i, value) {
                    new_group_obj.append(value);
                });

                classification_selector.append(new_group_obj);
            });


        }



        var variable_description_container = $(document.createElement('div'));
        variable_description_container.addClass('var_description');
        
        // #endregion Variable Selection generation


        // #region Classification method controls

        var classification_method_wrapper = $(document.createElement('div'));
        classification_method_wrapper.addClass('classification_method_wrapper');
        


        var classification_method_selector_label = $(document.createElement('label'));
        classification_method_selector_label.attr('for', layer_id + "_classification_method_selection");
        classification_method_selector_label.append('Classification Method:');


        var classification_method_selector = $(document.createElement('select'));
        classification_method_selector.addClass('classification_method_selection');
        classification_method_selector.attr('name', layer_id + "_classification_method_selection");
        classification_method_selector.attr('id', layer_id + "_classification_method_selection");
        

        // add an option for each of the Classification methods

        $.each(GEOSERVER_DATA_MGR._classification_methods, function(key, display_name) {
            var new_option = $(document.createElement('option'));
            new_option.attr('value', key);
            new_option.html(display_name);
            classification_method_selector.append(new_option);

        });


        var classification_num_cuts_selector_label = $(document.createElement('label'));
        classification_num_cuts_selector_label.attr('for', layer_id + "_classification_method_selection");
        classification_num_cuts_selector_label.append('Number of Classes:');


        var classification_num_cuts_selector = $(document.createElement('select'));
        classification_num_cuts_selector.addClass('classification_num_cuts_selection');
        classification_num_cuts_selector.attr('name', layer_id + "_classification_num_cuts_selection");
        classification_num_cuts_selector.attr('id', layer_id + "_classification_num_cuts_selection");
        

        for (var i = GEOSERVER_DATA_MGR._classification_min_cuts; i <= GEOSERVER_DATA_MGR._classification_max_cuts; i++) {
            var new_option = $(document.createElement('option'));
            new_option.attr('value', i);
            new_option.html(i);
            classification_num_cuts_selector.append(new_option);
        }


        classification_method_wrapper.append('<br/>');
        classification_method_wrapper.append(classification_method_selector_label);
        classification_method_wrapper.append(classification_method_selector);
        classification_method_wrapper.append('<br/>');
        classification_method_wrapper.append('<br/>');
        classification_method_wrapper.append(classification_num_cuts_selector_label);
        classification_method_wrapper.append(classification_num_cuts_selector);

        classification_wrapper.append(classification_selector_label);
        classification_wrapper.append('<br/>');
        classification_wrapper.append(classification_selector);
        classification_wrapper.append(variable_description_container);

        classification_wrapper.append(classification_method_wrapper);

        // #endregion Classification





        // #region Button definitions

        if (include_buttons) {
            var button_wrapper = $(document.createElement('div'));
            button_wrapper.addClass('button_wrapper');

            var class_display_button = $(document.createElement('button'));
            class_display_button.attr('type', 'button');
            class_display_button.addClass('class_display_button');
            class_display_button.attr('disabled', 'disabled');
            class_display_button.append("Display");

            class_display_button.click(INTERACTIVE_DIALOG_MGR._classification_display_clicked_evt);

            var class_download_button = $(document.createElement('button'));
            class_download_button.attr('type', 'button');
            class_download_button.addClass('download_button');

            var download_icon = $(document.createElement('img'));
            download_icon.attr('src', '/Content/images/icons/Download_icon_white.png');

            class_download_button.append(download_icon);
            class_download_button.append("Download Selection");

            // download same dataset as the filter tab
            class_download_button.click(INTERACTIVE_DIALOG_MGR._filter_download_clicked_evt);

            button_wrapper.append(class_download_button);
            button_wrapper.append(class_display_button);
            classification_wrapper.append(button_wrapper);
        }
            
            

        // #endregion Button definitions


        return classification_wrapper;
    },

    Generate_Visualization_controls: function(layer_id) {


        var visualization_wrapper = $(document.createElement('div'));
        visualization_wrapper.addClass('tab_content_wrapper');
        visualization_wrapper.addClass('visualization_wrapper');
        

        var visual_controls_container = $(document.createElement('div'));
        visual_controls_container.addClass('visual_controls_container');

        var dist_radio = $(document.createElement('input'));
        dist_radio.addClass('dist_radio');
        dist_radio.attr('id', layer_id + '_dist_radio');
        dist_radio.attr('chart_id', layer_id + "_Feature_Dist");
        dist_radio.attr('name', layer_id + '_vis_radio');
        dist_radio.attr('type', 'radio');
        dist_radio.attr('checked', 'checked');

        var dist_radio_label = $(document.createElement('label'));
        dist_radio_label.addClass('radio_label');
        dist_radio_label.addClass('selected');
        dist_radio_label.attr('for', layer_id + '_dist_radio');
        dist_radio_label.attr('aria-pressed', "true");
        dist_radio_label.append(dist_radio);
        dist_radio_label.append('Feature Distribution');


        var val_dist_radio = $(document.createElement('input'));
        val_dist_radio.addClass('val_dist_radio');
        val_dist_radio.attr('id', layer_id + '_val_dist_radio');
        val_dist_radio.attr('chart_id', layer_id + '_Value_Dist');
        val_dist_radio.attr('name', layer_id + '_vis_radio');
        val_dist_radio.attr('type', 'radio');
        
        var val_dist_radio_label = $(document.createElement('label'));
        val_dist_radio_label.addClass('radio_label');
        val_dist_radio_label.attr('for', layer_id + '_val_dist_radio');
        val_dist_radio_label.append(val_dist_radio);
        val_dist_radio_label.append('Value Distribution');
        


        //visual_controls_container.append(dist_radio);
        visual_controls_container.append(dist_radio_label);
        //visual_controls_container.append(val_dist_radio);
        visual_controls_container.append(val_dist_radio_label);


        var chart_container = $(document.createElement('div'));
        chart_container.addClass('chart_container');
        chart_container.attr('id', layer_id + "_chart_container");


        visualization_wrapper.append(visual_controls_container);
        visualization_wrapper.append(chart_container);

        visual_controls_container.buttonset();
        $(visual_controls_container).on('change', INTERACTIVE_DIALOG_MGR._refresh_visualizations);

        // #region Add Chart types used in this dialog to the highcharts manager
        HIGHCHARTS_MGR.Add_Chart_Def(layer_id + "_Feature_Dist",
            {
                chart: {
                    type: 'column',

                },
                legend: {
                    enabled: false,
                },
                title: {
                    text: ''
                },
                subtitle: {
                    text: ''
                },
                xAxis: {
                    categories: [],
                    crosshair: true,
                    title: { text: "" },

                },
                yAxis: {
                    title: {
                        text: 'Number of Features\'s in class'
                    }
                },
                tooltip: {
                    headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                    pointFormat: '<tr><td class="highcharts_series_popup_label" style="color:{series.color};">{series.name}</td>' +
                        '<td style="padding:0">: <b>{point.y} Feature(s)</b></td></tr>',
                    footerFormat: '</table>',
                    shared: true,
                    useHTML: true
                },
                plotOptions: {

                    column: {
                        pointPadding: 0.2,
                        borderWidth: 1
                    }
                },

            },
            function (container_selector, variable, categories, colors, distributions) {
                
                //var parent_chart_container = HIGHCHARTS_MGR._chart_container_selector;
                var parent_dialog = $(container_selector).closest('.Interaction_Dialog');
                var layer_id = parent_dialog.attr('layer_id');

                var chart = HIGHCHARTS_MGR.Get_Chart(layer_id + "_Feature_Dist");

                var var_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, variable);

                var display_name = (!!var_meta["Display_Name"]) ? var_meta["Display_Name"] : variable;
                var units = (!!var_meta["Units"]) ? var_meta["Units"] : "";
                var units_abbr = (!!var_meta["Units_Abbr"]) ? var_meta["Units_Abbr"] : units;

                chart.options.subtitle.text = display_name + ((!!units) ? ' (' + units + ')' : "");
                chart.options['xAxis']['categories'] = categories;
                chart.options['xAxis']['title']['text'] = display_name + ((!!units)? ' ('+ units+ ')': "");


                // match categories to series data
                var classification_totals = $.map(categories, function (item, index) {
                    return { color: colors[index], y: distributions[index] }
                });

                chart.options['series'] = [{ name: "Total", data: classification_totals }];
            });



        HIGHCHARTS_MGR.Add_Chart_Def(layer_id + "_Value_Dist",
            {
                chart: {
                    type: 'area',
                    zoomType: 'x',
                    resetZoomButton: {
                        position: {
                            align: 'right', // by default
                            verticalAlign: 'top', // by default
                            x: -10,
                            y: 0
                        },
                        relativeTo: 'chart'
                    }
                },
                legend: {
                    enabled: false,
                },
                title: {
                    text: ''
                },
                subtitle: {
                    text: ''
                },
                xAxis: {
                    categories: [],
                    crosshair: true,
                    tickInterval: 200,
                    title: { text: 'Sorted Rank of Features' },
                },
                yAxis: {
                    title: {
                        text: 'Feature Values'
                    }
                },
                tooltip: {
                    formatter: function () {

                        return '<span style="font-size:10px">Sorted Rank: ' + (this.points[0].key + 1) + ' of ' + this.points[0].series.data.length + '</span><table>' +
                            '<tr><td class="highcharts_series_popup_label" style="color:' + this.points[0].point.color + ';">' + this.points[0].series.name + '</td>' +
                            '<td style="padding:0">: <b>' + Highcharts.numberFormat(this.points[0].y) + ' ' + this.points[0].series.options.units + '</b></td></tr>' +
                            '</table>';
                    },

                    shared: true,
                    useHTML: true
                },
                plotOptions: {
                    area: {
                        zoneAxis: 'x',
                        turboThreshold: 3000,
                        fillColor: {
                            linearGradient: {
                                x1: 0,
                                y1: 0,
                                x2: 0,
                                y2: 1
                            },
                            stops: [
                                [0, Highcharts.getOptions().colors[0]],
                                [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                            ]
                        },
                        marker: {
                            enabled: false,
                        },
                        lineWidth: 1,
                        states: {
                            hover: {
                                lineWidth: 1
                            }
                        },
                    }
                },

            },
            function (container_selector, variable, categories, colors, series_data, distributions) {
                
                //var parent_chart_container = HIGHCHARTS_MGR._chart_container_selector;
                var parent_dialog = $(container_selector).closest('.Interaction_Dialog');
                var layer_id = parent_dialog.attr('layer_id');

                var chart = HIGHCHARTS_MGR.Get_Chart(layer_id + "_Value_Dist");

                var var_meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, variable);

                var display_name = (!!var_meta["Display_Name"]) ? var_meta["Display_Name"] : variable;
                var units = (!!var_meta["Units"]) ? var_meta["Units"] : "";
                var units_abbr = (!!var_meta["Units_Abbr"]) ? var_meta["Units_Abbr"] : units;


                //var chart = HIGHCHARTS_MGR.Get_Chart("Val_Dist");
                //var var_data = HUC8_DATA_MGR.Attribute_Data[variable];

                chart.options['xAxis']['categories'] = [''];

                // update the chart title to reflect which variable is being presented

                //chart.options.title.text = "Value Distribution".format(var_data.title);
                //chart.options.subtitle.text = "{0} in {1}".format(var_data["Display Name"], var_data.Units);
                // update the value formatting to account for the variable's units
                //chart.options.yAxis.title.text = "{0} ({1})".format(var_data.Units, var_data.Unit_Abbr);
                chart.options.yAxis.title.text = display_name + ((!!units)? ' ('+ units+ ')': "");


                // set up zones to highlight values that fall into the different classes
                //[{ value: class1_max_value, color: class1_category_color }, ...]
                var zone_cut = 0;
                var zones = $.map(distributions, function (item, index) {
                    zone_cut += item;
                    return {
                        value: zone_cut, // sum together all previous distributions for new zone cap
                        color: colors[index],
                        fillColor: COLOR_MGR.HEX_to_RGB(colors[index].slice(1)).toRGBA(.3),
                    }
                });
                delete zones[zones.length - 1].value;


                // calculate the average value for plotline
                var var_sum = series_data.reduce(function (a, b) { return a + b });
                var var_avg = (var_sum / series_data.length).toFixed(2);

                // add plotline for average value of hucs
                chart.options.yAxis.plotLines = [
                {
                    color: 'red', // Color value
                    dashStyle: 'longdashdot', // Style of the plot line. Default to solid
                    value: var_avg, // Value of where the line will appear
                    width: 2, // Width of the line 
                    gridZIndex: 10,
                    label: {
                        zIndex: 30,
                        text: 'Average value: {0} {1}'.format(var_avg, units_abbr),
                        align: 'left',
                    },

                }
                ];

                chart.options['series'] = [{ name: "Value", data: series_data, zoneAxis: 'x', zones: zones, units: units_abbr }];


            });

        // #endregion chart defs

        return visualization_wrapper;

        

    },

    Generate_Filter_Input: function(layer_id, Property_id, allow_removal) {

        if (typeof (allow_removal) == "undefined") allow_removal = true;

        var new_filter_container = $(document.createElement('div'));
        new_filter_container.addClass('filter');
        new_filter_container.attr('prop_id', Property_id);


        
        /*
             switch on attribute type to provide:

             Numerical: threshold inputs
             Multiselect: multiselect dropdown
             Search: text input
            */

        var Data_meta = GEOSERVER_DATA_MGR.get_Attribute_Meta(layer_id, Property_id);
        var Prop_Meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, Property_id);


        var display_name = (!!Prop_Meta['Display_Name']) ? Prop_Meta['Display_Name'] : Property_id;


        var input_field;

        switch (Prop_Meta['Filtering_Type']) {
        case "Numerical":
            input_field = INTERACTIVE_DIALOG_MGR.Generate_Numerical_Threshold_input(Property_id, display_name, Data_meta['min'], Data_meta['max']);
            break;

        case "Search":
            input_field = INTERACTIVE_DIALOG_MGR.Generate_Search_input(Property_id, display_name);
            break;

        case "Multiselect":
            var distinct_values = GEOSERVER_DATA_MGR.get_Distinct_Attribute_Values(layer_id, Property_id, Prop_Meta["Listing_Field"]);
            input_field = INTERACTIVE_DIALOG_MGR.Generate_MultiSelect_drop_input(Property_id, display_name, distinct_values);

            break;

        default:
            input_field = 'Could not generate input field for "{0}" (datatype:"{1}") '.format(Property_id, Prop_Meta['Filtering_Type']);

            break;
        }

        input_field.addClass('filter_input_form');

        var controls_wrapper = $(document.createElement('div'));
        controls_wrapper.addClass('filter_controls');

        if (allow_removal) {
            var remove_filter_button = $(document.createElement('button'));
            remove_filter_button.addClass('remove_filter_btn');
            remove_filter_button.addClass('filter_control');
            remove_filter_button.attr('title', 'Remove This Filter');
            remove_filter_button.attr('type', 'button');
            remove_filter_button.append('-');


            // add events to necessary buttons/controls
            remove_filter_button.click(INTERACTIVE_DIALOG_MGR._remove_filter_clicked_evt);
            controls_wrapper.append(remove_filter_button);
        }
        

        var reset_filter_button = $(document.createElement('div'));
        reset_filter_button.addClass('reset_button');
        reset_filter_button.addClass('filter_control');
        reset_filter_button.css('float', 'right');
        reset_filter_button.attr('title', 'Reset This Filter');

        reset_filter_button.click(INTERACTIVE_DIALOG_MGR._reset_filter_clicked_evt);

        
        controls_wrapper.append(reset_filter_button);


        new_filter_container.append(input_field);
        new_filter_container.append(controls_wrapper);

        return new_filter_container;

    },
    
    Generate_Numerical_Threshold_input: function(prop_id, display_name, min_val, max_val) {

        var threshold_container = $(document.createElement('div'));
        threshold_container.addClass('threshold');
        threshold_container.attr('filter_type', 'threshold');

        var min_input = $(document.createElement('input'));
        min_input.attr('type', 'number');
        min_input.attr('name', 'min_threshold');
        min_input.attr('min', min_val);
        min_input.attr('max', max_val);
        min_input.val(min_val);

        min_input.addClass('val_input');
        min_input.addClass('min');

        var max_input = $(document.createElement('input'));
        max_input.attr('type', 'number');
        max_input.attr('name', 'max_threshold');
        max_input.attr('min', min_val);
        max_input.attr('max', max_val);
        max_input.val(max_val);

        max_input.addClass('val_input');
        max_input.addClass('max');

        min_input.keypress(INTERACTIVE_DIALOG_MGR._input_validation_numeric);
        max_input.keypress(INTERACTIVE_DIALOG_MGR._input_validation_numeric);

        var var_text = $(document.createElement('div'));
        var_text.addClass('threshold_var');
        var_text.attr('value', prop_id);
        var_text.html(display_name);

        threshold_container.append(min_input);
        threshold_container.append('&le;');
        threshold_container.append(var_text);
        threshold_container.append('&le;');
        threshold_container.append(max_input);

        return threshold_container;

    },

    Generate_MultiSelect_drop_input: function(prop_id, display_name, select_options) {

        
        var select_container = $(document.createElement('div'));
        select_container.addClass('multiselect');
        select_container.attr('filter_type', 'multiselect');


        var text_label = $(document.createElement('label'));
        text_label.addClass('text_label');
        text_label.attr('for', prop_id + "_multiselect");
        text_label.append("{0}:".format(display_name));

        var multiselect_drop = $(document.createElement('select'));
        multiselect_drop.addClass('multiselect_drop');
        multiselect_drop.attr('multiple', 'multiple');
        multiselect_drop.attr('name', prop_id + "_multiselect");
        multiselect_drop.attr('id', prop_id + "_multiselect");

        // add option obj for each of the select options
        $.each(select_options, function (index, option_val) {

            var option_obj = $(document.createElement('option'));

            option_obj.attr('value', option_val);
            


            if (option_val == "") {
                option_obj.html('No {0} Specified'.format(display_name));
            }

            option_obj.append(option_val);
            
            
            multiselect_drop.append(option_obj);

        });

        // initialize the jquery-ui version of this dropdown
        //multiselect_drop.multiselect({ noneSelectedText: "Select {0}:".format(display_name), selectedText: "# {0} selected".format(display_name) });

        select_container.append(text_label);
        select_container.append(multiselect_drop);

        return select_container;

    },

    Generate_Search_input: function(prop_id, display_name) {
        var search_container = $(document.createElement('div'));
        search_container.addClass('search');
        search_container.attr('filter_type', 'search');

        var var_text = $(document.createElement('label'));
        var_text.addClass('text_label');
        var_text.attr('value', prop_id);
        var_text.attr('for', prop_id + '_search_val');
        var_text.html(display_name + ": ");

        var text_input = $(document.createElement('input'));
        text_input.addClass('search_input');
        text_input.attr('type', 'text');
        text_input.attr('name', prop_id + '_search_val');
        text_input.attr('prop_id', prop_id);


        text_input.keypress(INTERACTIVE_DIALOG_MGR._input_validation_alphaNumeric);

        search_container.append(var_text);
        search_container.append(text_input);

        return search_container;


    },

    Generate_SaveAs_Download_Dialog: function(csv_content, filters) {


        var SAVEAS_DIALOG = $(document.createElement('div'));

        SAVEAS_DIALOG.attr('id', "SAVEAS_Dialog");
        //new_interaction_dialog.addClass('Interaction_Dialog');
        SAVEAS_DIALOG.attr('title', "Download Selection As...");
        SAVEAS_DIALOG.css('z-index', 2000);

        
        var input_label = $(document.createElement('label'));
        input_label.html('Download File As: ');
        input_label.attr('for', 'SAVEAS_Filename_input');

        var filename_input = $(document.createElement('input'));
        filename_input.attr('id', "SAVEAS_Filename_input");
        filename_input.attr('name', "SAVEAS_Filename_input");
        filename_input.attr('type', "text");
        filename_input.attr('maxlength', 100);


        var warning = $(document.createElement('div'));
        warning.attr('id', 'SAVEAS_Error_msg');
        warning.css({
            'margin': '10px',
            'font-weight': 'bold',
            'font-style': 'italic',
            'color': '#E4522F',
            'text-align': 'left',
            "display": 'none',
        });

        warning.html('Please enter a valid file name. <ul/> <li>Must begin with a Letter/Number</li><li>Exclude any special characters.</li></ul> ');


        var SAVEAS_button = $(document.createElement('button'));
        SAVEAS_button.attr('type', 'button');
        SAVEAS_button.attr('csv_contents', csv_content);
        SAVEAS_button.addClass('SAVEAS_button');
        SAVEAS_button.append("Download");

        SAVEAS_button.click(INTERACTIVE_DIALOG_MGR._SaveAs_Download_clicked);

        var CANCEL_button = $(document.createElement('button'));
        CANCEL_button.attr('type', 'button');
        CANCEL_button.addClass('SAVEAS_Cancel_btn');
        CANCEL_button.append("Cancel");

        
        CANCEL_button.click(INTERACTIVE_DIALOG_MGR._SaveAs_Cancel_clicked);


        var download_notice = $(document.createElement('span'));
        download_notice.css({ 'font-style': 'italic' });
        download_notice.html("<br/>*Downloads will be stored in your browser's default downloads directory.");


        SAVEAS_DIALOG.append(input_label);
        SAVEAS_DIALOG.append(filename_input);
        SAVEAS_DIALOG.append('.csv');
        SAVEAS_DIALOG.append('<br/>');
        SAVEAS_DIALOG.append(warning);
        SAVEAS_DIALOG.append('<br/>');
        SAVEAS_DIALOG.append(SAVEAS_button);
        SAVEAS_DIALOG.append(CANCEL_button);
        SAVEAS_DIALOG.append(download_notice);

        return SAVEAS_DIALOG;
    },

    Parse_Filters_To_Obj: function(layer_id) {
        var curr_dialog = $('.Interaction_Dialog[layer_id="' + layer_id + '"]');
        var filter_wrapper = curr_dialog.find('.filtering_wrapper');
        var filters_collection = curr_dialog.find('.filter:visible');


        var filter_obj = {};

        if (filters_collection.length > 0) {

            // iterate through defined filters and construct a filter_obj
            $.each(filters_collection, function(index, filter_element) {

                var curr_filter = $(filter_element);
                var prop_id = curr_filter.attr('prop_id');

                var input_form = curr_filter.find('.filter_input_form');
                var input_type = input_form.attr('filter_type');
                var input_value = null;
                

                switch (input_type) {
                case "search":
                    
                    input_value = input_form.find('input.search_input').val().trim();

                    break;
                case 'multiselect':
                    input_value = input_form.find('select.multiselect_drop').val();

                    break;
                case 'threshold':

                    input_value = {
                        'min': parseFloat(input_form.find('input.min').val()),
                        'max': parseFloat(input_form.find('input.max').val()),
                    }

                    break;
                default:
                    console.log('ERROR: Could not parse generate filter for: {0} (input type: {1})'.format(prop_id, input_type));
                    break;

                }
                if (!!input_value) {
                    filter_obj[prop_id] = input_value;
                }
                
            });


        }
        
        return filter_obj;


    },

    //#endregion OBJECT GENERATION METHODS


    //#region Event handlers

    show_base_layer: function(layer_id) {
        MAP_MGR.show_Layer(layer_id);

        var enabler = INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].find('.base_layer_enabler');
        var parent_label = enabler.closest('label.layer_control_input');

        // add necessary actions to highlight the root layer toggle
        enabler.prop('checked', true);
        parent_label.addClass('selected');
    },

    hide_base_layer: function (layer_id) {
        MAP_MGR.hide_Layer(layer_id);

        var enabler = INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].find('.base_layer_enabler');
        var parent_label = enabler.closest('label.layer_control_input');

        // add necessary actions to highlight the root layer toggle
        enabler.prop('checked', false);
        parent_label.removeClass('selected');
    },

    show_data_layer: function (layer_id) {

        GEOSERVER_DATA_MGR.Show_Data_Layer(layer_id);

        var enabler = INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].find('.data_layer_enabler');
        var parent_label = enabler.closest('label.layer_control_input');

        // add necessary actions to highlight the root layer toggle
        enabler.prop('checked', true);
        parent_label.addClass('selected');
    },
    
    hide_data_layer: function (layer_id) {

        GEOSERVER_DATA_MGR.Hide_Data_Layer(layer_id);

        var enabler = INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].find('.data_layer_enabler');
        var parent_label = enabler.closest('label.layer_control_input');

        // add necessary actions to highlight the root layer toggle
        enabler.prop('checked', false);
        parent_label.removeClass('selected');
    },

    _var_select_changed_evt: function(evt) {
        
        var selected_value = $(evt.currentTarget).val();
        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');

        var layer_id = curr_dialog.attr('layer_id');
        var description_container = $(evt.currentTarget).closest('.tab_content_wrapper').find('.var_description');

        // if a valid value was selected, update the description text and display step 2
        if (selected_value != 0) {
            var Prop_Meta = LAYER_MGR.get_Layer_Property_Meta(layer_id, selected_value);

            if (!!Prop_Meta && !!Prop_Meta['Description']) {
                description_container.html('Description of Variable: <br/>' + Prop_Meta['Description']);
            }


        } else {
            description_container.html('');
        }


    },

    _filter_var_selection_changed_evt: function(evt) {
        var associated_dropdown = $(evt.currentTarget);
        var selected_value = associated_dropdown.val();
        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');

        var layer_id = curr_dialog.attr('layer_id');
        

        // if a valid value was selected, update the description text and display step 2
        if (selected_value != 0) {
            

            var linked_layer_id = associated_dropdown.closest('.Interaction_Dialog').attr('layer_id');
            var filter_wrapper = curr_dialog.find('.filtering_wrapper');
            var generated_filters_box = filter_wrapper.find('.added_filters');
            
            

            // generate a new filter input for the selected layer attribute
            var filter_input = INTERACTIVE_DIALOG_MGR.Generate_Filter_Input(linked_layer_id, selected_value);


            // hide the selected option from the dropdown and reset value to default
            associated_dropdown.val('0');
            var selected_option = associated_dropdown.find('option[value="' + selected_value + '"]');

            // account for the stupidity that is IE, by disabling the option
            //      *IE doesn't support <option style"display:none"> because that would be too easy...
            selected_option.attr('disabled', 'disabled').hide();

            // if the hidden option is the last of it's group, hide the group
            if (selected_option.closest('optgroup').find('option').filter(function () { return $(this).css("display") != "none"; }).length == 0) {
                selected_option.closest('optgroup').hide();
            }

            // add the newly generated filter input to the generated_filters container
            generated_filters_box.append(filter_input);

            // if the generated filter was a jquery-ui element initialize it
            /*
                    TODO: FIND BETTER METHOD OF INITILIZING THESE
                    (possibly just specify a callback)
                */

            var prop_meta = LAYER_MGR.get_Layer_Property_Meta(linked_layer_id, selected_value);
            var display_name = (!!prop_meta['Display_Name']) ? prop_meta['Display_Name'] : selected_value;

            filter_input.find('select[multiple="multiple"]').multiselect({ noneSelectedText: "Select {0}".format(display_name), selectedText: "# {0} selected".format(display_name) });


            // clear the var description since it has been removed
            //description_container.html('');

            // show the selected filters container
            //filter_wrapper.find('.added_filters_wrapper').show();


        } else {
            //description_container.html('');
        }
    },
    
    _class_variable_selected_evt: function (evt) {
        
        var selected_value = $(evt.currentTarget).val();
        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');

        var class_method_wrapper = curr_dialog.find('.classification_method_wrapper');
        var method_select = curr_dialog.find('.classification_method_selection');
        var num_cuts_select = curr_dialog.find('.classification_num_cuts_selection');
        var class_display_button = curr_dialog.find('.class_display_button');

        // if a valid value was selected, update the description text and display step 2
        if (selected_value != 0) {
            class_method_wrapper.show();
            method_select.val(GEOSERVER_DATA_MGR._classification_default_method);
            num_cuts_select.val(GEOSERVER_DATA_MGR._classification_default_cuts);
            class_display_button.removeAttr('disabled');
            

        } else {
            class_method_wrapper.hide();
            class_display_button.attr('disabled', 'disabled');
            
            
        }
    },

    _display_base_layer_check_evt: function(evt) {
        
        var checkbox_obj = $(evt.currentTarget);
        var parent_label = checkbox_obj.closest('label.layer_control_input');
        var layer_id = checkbox_obj.closest('.Interaction_Dialog').attr('layer_id');

        if (parent_label.hasClass('disabled')) return;

        if (this.checked) {
            // the checkbox is now checked 

            //MAP_MGR.show_Layer(layer_id);
            //parent_label.addClass('selected');
            INTERACTIVE_DIALOG_MGR.show_base_layer(layer_id);
        } else {
            // the checkbox is now no longer checked
            
            //MAP_MGR.hide_Layer(layer_id);
            //parent_label.removeClass('selected');

            INTERACTIVE_DIALOG_MGR.hide_base_layer(layer_id);
        }
    },

    _display_data_layer_check_evt: function(evt) {

        var checkbox_obj = $(evt.currentTarget);
        var parent_label = checkbox_obj.closest('label.layer_control_input');
        var layer_id = checkbox_obj.closest('.Interaction_Dialog').attr('layer_id');

        if (parent_label.hasClass('disabled')) return;

        if (this.checked) {
            // the checkbox is now checked 

            //GEOSERVER_DATA_MGR.Show_Data_Layer(linked_layer);
            //parent_label.addClass('selected');

            INTERACTIVE_DIALOG_MGR.show_data_layer(layer_id);

        } else {
            // the checkbox is now no longer checked
            //GEOSERVER_DATA_MGR.Hide_Data_Layer(linked_layer);
            //parent_label.removeClass('selected');

            INTERACTIVE_DIALOG_MGR.hide_data_layer(layer_id);
        }
    },

    _add_filter_clicked_evt: function(evt) {

        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');
        var filter_wrapper = curr_dialog.find('.filtering_wrapper');
        var associated_dropdown = filter_wrapper.find('.filter_selection');

        if (associated_dropdown.val() != '0') {

            
            var selected_value = associated_dropdown.val();
            var linked_layer_id = associated_dropdown.closest('.Interaction_Dialog').attr('layer_id');
            var generated_filters_box = filter_wrapper.find('.added_filters');
            var description_container = filter_wrapper.find('.var_description');

            // generate a new filter input for the selected layer attribute
            var filter_input = INTERACTIVE_DIALOG_MGR.Generate_Filter_Input(linked_layer_id, selected_value);


            // hide the selected option from the dropdown and reset value to default
            associated_dropdown.val('0');
            var selected_option = associated_dropdown.find('option[value="' + selected_value + '"]');

            // account for the stupidity that is IE, by disabling the option
            //      *IE doesn't support <option style"display:none"> because that would be too easy...
            selected_option.attr('disabled', 'disabled').hide();

            // if the hidden option is the last of it's group, hide the group
            if (selected_option.closest('optgroup').find('option').filter(function() { return $(this).css("display") != "none"; }).length == 0) {
                selected_option.closest('optgroup').hide();
            }

            // add the newly generated filter input to the generated_filters container
            generated_filters_box.append(filter_input);

            // if the generated filter was a jquery-ui element initialize it
            /*
                    TODO: FIND BETTER METHOD OF INITILIZING THESE
                    (possibly just specify a callback)
                */

            var prop_meta = LAYER_MGR.get_Layer_Property_Meta(linked_layer_id, selected_value);
            var display_name = (!!prop_meta['Display_Name']) ? prop_meta['Display_Name'] : selected_value;
            
            filter_input.find('select[multiple="multiple"]').multiselect({ noneSelectedText: "Select {0}".format(display_name), selectedText: "# {0} selected".format(display_name) });


            // clear the var description since it has been removed
            description_container.html('');

            // show the selected filters container
            filter_wrapper.find('.added_filters').show();

        }
    },

    _remove_all_filters_clicked_evt:function(evt){
        var filter_wrapper = $(evt.currentTarget).closest('.filtering_wrapper');
        var existing_filters = filter_wrapper.find('.filter');

        // trigger the 'remove filter clicked event for each of the existing filters
        $.each(existing_filters, function(index, filter_obj) {
            $(filter_obj).find('.remove_filter_btn').click();
        });
    },

    _remove_filter_clicked_evt: function(evt) {
        var filter_wrapper = $(evt.currentTarget).closest('.filtering_wrapper');
        var associated_dropdown = filter_wrapper.find('.filter_selection');
        var filter_to_remove = $(evt.currentTarget).closest('.filter');


        if (!!filter_to_remove.length > 0) {

            // grab the property id of the filter, and re-show it's option in the associated dropdown
            var prop_to_remove = filter_to_remove.attr('prop_id');
            var linked_option = associated_dropdown.find('option[value="' + prop_to_remove + '"]');

            // account for the stupidity that is IE, by reenabling the option the option
            linked_option.removeAttr('disabled').show();

            // if the option is part of a previously hidden optgroup, re-show the optgroup
            var parent_optgroup = linked_option.closest('optgroup');

            if (parent_optgroup.length > 0) {
                parent_optgroup.show();
            }
            filter_to_remove.remove();

            if (filter_wrapper.find('.filter').length == 0) {
                //filter_wrapper.find('.added_filters').hide();
            }


        }

    },

    _reset_filter_clicked_evt: function(evt) {

        var filter_to_reset = $(evt.currentTarget).closest('.filter');
        var input_form = filter_to_reset.find('.filter_input_form');
        var filter_type = input_form.attr('filter_type');

        if (!!!filter_type) {
            console.log("ERROR: Filter Form has no assigned type");
        }

        switch (filter_type) {
        case "search":
            var input = input_form.find('input');
            input.val("");

            break;
        case "multiselect":
            var multiselect = input_form.find('select');
            multiselect.multiselect("uncheckAll");

            break;
        case "threshold":

            var min_box = input_form.find('input.min');
            var max_box = input_form.find('input.max');


            min_box.val(min_box.attr('min'));
            max_box.val(max_box.attr('max'));

            break;

        default:
            console.log("ERROR: Could not reset filter of unknown type: '{0}'".format(filter_type));
            break;
        }


    },

    _filter_display_clicked_evt: function(evt) {
        
        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');
        var layer_id = curr_dialog.attr('layer_id');
        var data_layer_display_control = curr_dialog.find('.data_layer_enabler');

        var filter_obj = INTERACTIVE_DIALOG_MGR.Parse_Filters_To_Obj(layer_id);
        var CQL_str = GEOSERVER_DATA_MGR.get_CQL_Filter_String(layer_id, filter_obj);

        // generate a new linked layer for 'layer_id' including the CQL_Filter string 
        GEOSERVER_DATA_MGR.Generate_Filter_Layer(layer_id, CQL_str);

        data_layer_display_control.removeAttr('disabled');

        data_layer_display_control.prop('checked', true);
        data_layer_display_control.closest('label.layer_control_input').removeClass('disabled');
        data_layer_display_control.closest('label.layer_control_input').addClass('selected');

        var tab_container = curr_dialog.find('.Interaction_Dialog_tabs');
        if (INTERACTIVE_DIALOG_MGR._tab_headers.indexOf("Visualization") != -1) tab_container.tabs('disable', INTERACTIVE_DIALOG_MGR._tab_headers.indexOf("Visualization"));
    },

    _filter_download_clicked_evt: function (evt) {

        
        var dialog_content = $(evt.currentTarget).closest('.Interaction_Dialog_content');
        var filter_wrapper = dialog_content.find('.filtering_wrapper');
        var layer_id = filter_wrapper.closest('.Interaction_Dialog').attr('layer_id');
        
        var filter_obj = INTERACTIVE_DIALOG_MGR.Parse_Filters_To_Obj(layer_id);
        var csv_content = GEOSERVER_DATA_MGR.Generate_CSV_Download(layer_id, filter_obj);

        var saveas_dlg = INTERACTIVE_DIALOG_MGR.Generate_SaveAs_Download_Dialog(csv_content, filter_obj);

        saveas_dlg.dialog({
            autoOpen: false,
            draggable: false,
            modal: true,
            resizable: false,
            resize: 'auto',
            close: INTERACTIVE_DIALOG_MGR._SaveAs_Cancel_clicked,
        });
        
        saveas_dlg.dialog("open");

    },
    
    _classification_display_clicked_evt: function(evt) {
        
        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');
        var class_wrapper = curr_dialog.find('.classification_wrapper');
        var layer_id = curr_dialog.attr('layer_id');
        var data_layer_display_control = curr_dialog.find('.data_layer_enabler');
        
        //var chart_container_id = '#' + curr_dialog.find('.chart_container').attr('id');
        //var data_layer_display_control = filter_wrapper.find('.data_layer_enabler');


        // get Classification settings 
        var selected_var = class_wrapper.find('.classification_var_selection').val();
        var class_method = class_wrapper.find('.classification_method_selection').val();
        var num_cuts = parseInt(class_wrapper.find('.classification_num_cuts_selection').val());

        // get the selected filters obj and generate the cql_str
        var filter_obj = INTERACTIVE_DIALOG_MGR.Parse_Filters_To_Obj(layer_id);
        //var CQL_str = GEOSERVER_DATA_MGR.get_CQL_Filter_String(layer_id, filter_obj);

        
        var classification_obj = GEOSERVER_DATA_MGR.Generate_Classification_Layer(layer_id, selected_var, class_method, num_cuts, filter_obj);


        data_layer_display_control.removeAttr('disabled');
        data_layer_display_control.prop('checked', true);
        data_layer_display_control.closest('label.layer_control_input').removeClass('disabled');
        data_layer_display_control.closest('label.layer_control_input').addClass('selected');
        
        //var classification_obj = (!!class_layer_info) ? class_layer_info : null;

        
        if (!!classification_obj) {

            // Initialize charts used in visualizaiton tab
            var chart_container_id = '#' + layer_id + "_chart_container";
            if (!HIGHCHARTS_MGR.is_Registered_Chart_Container(chart_container_id)) {
                HIGHCHARTS_MGR.Register_Chart_Container(chart_container_id);
            }
            //HIGHCHARTS_MGR.init();

            // update highcharts with the visualization data

            HIGHCHARTS_MGR.Get_Chart(layer_id + '_Feature_Dist').update(chart_container_id, selected_var, classification_obj.categories, classification_obj.colors, classification_obj.distribution);
            HIGHCHARTS_MGR.Get_Chart(layer_id + '_Value_Dist').update(chart_container_id, selected_var, classification_obj.categories, classification_obj.colors, classification_obj.sorted_vals, classification_obj.distribution);

            HIGHCHARTS_MGR.Draw_Chart(chart_container_id, layer_id + '_Feature_Dist');

            var tab_container = curr_dialog.find('.Interaction_Dialog_tabs');
            tab_container.tabs('enable', INTERACTIVE_DIALOG_MGR._tab_headers.indexOf('Visualization'));

            
            curr_dialog.find('.visual_controls_container label').removeClass('selected');
            curr_dialog.find('.dist_radio').closest('label').addClass('selected');
            curr_dialog.find('.dist_radio').prop('checked', true).button('refresh');
        }
        
        

    },

    _refresh_visualizations: function(evt) {

        var chart_container = $(evt.currentTarget).closest('.Interaction_Dialog').find('.chart_container').attr('id');
        var selected_input = $(evt.currentTarget).find('input:checked');

        var selected_vis = selected_input.attr('chart_id');

        $(evt.currentTarget).find('label').removeClass('selected');

        selected_input.closest('label').addClass('selected');

        HIGHCHARTS_MGR.Draw_Chart('#' + chart_container, selected_vis);

    },

    _SaveAs_Download_clicked: function(evt) {
        
        var save_btn = $(evt.currentTarget);

        var csv_content = save_btn.attr('csv_contents');
        var input_name = save_btn.closest('#SAVEAS_Dialog').find('#SAVEAS_Filename_input').val().trim();


        var Valid_filename = /^(?=[\w])[^\\\/:*?"<>|.]+$/;
        

        if (!Valid_filename.test(input_name)) {
            $('#SAVEAS_Error_msg').show();
            return;
        } else {
            $('#SAVEAS_Error_msg').hide();
        }


        dataDownload(csv_content,input_name);

        

        // destroy this button's parent dialog from existence
        $('#SAVEAS_Dialog').dialog('destroy').remove();
        

    },

    _SaveAs_Cancel_clicked: function (evt) {
        
        $('#SAVEAS_Dialog').dialog('destroy').remove();

    },

    _reset_dialog_clicked_evt: function(evt) {
        
        var curr_dialog = $(evt.currentTarget).closest('.Interaction_Dialog');
        var layer_id = curr_dialog.attr('layer_id');

        //var layer_meta = LAYER_MGR.get_Layer_Meta(layer_id);

        // click the clear all filters button
        curr_dialog.find('.ClearAll_Filters').click();

        // clear any remaining filters (default filters)
        curr_dialog.find('.reset_button.filter_control').click();

        // reset classification var selection and fire change event
        curr_dialog.find('.classification_var_selection').val(0);
        curr_dialog.find('.classification_var_selection').change();

        

        // if there is a datalayer instantiated remove/unlink it
        if (!!GEOSERVER_DATA_MGR.Data_Layer_Exists(layer_id)) {

            var child_id = GEOSERVER_DATA_MGR.get_Data_Layer_id(layer_id);

            GEOSERVER_DATA_MGR.Remove_Data_Layer(layer_id);
            LAYER_MGR.Unlink_Layer(layer_id, child_id);

            
            INTERACTIVE_DIALOG_MGR.hide_data_layer(layer_id);
            var data_layer_enabler_input = curr_dialog.find('.data_layer_enabler').closest('.layer_control_input');
            data_layer_enabler_input.addClass('disabled');

            var tabs_container = curr_dialog.find('.Interaction_Dialog_tabs');
            if (INTERACTIVE_DIALOG_MGR._tab_headers.indexOf("Visualization") != -1) {
                tabs_container.tabs('disable', INTERACTIVE_DIALOG_MGR._tab_headers.indexOf("Visualization"));
                tabs_container.tabs("option", "active", 0);
            }
        }


        INTERACTIVE_DIALOG_MGR.show_base_layer(layer_id);

        // if additional filters are shown hide them
        if (curr_dialog.find('.addtl_filters_wrapper:visible').length > 0) {
            curr_dialog.find('.toggle_Addtl_filters_button').click();
        }


    },

    _input_validation_numeric: function(evt) {

        var charCode = (evt.which) ? evt.which : event.keyCode;

        return INTERACTIVE_DIALOG_MGR.__isNumeric(charCode);
    },

    _input_validation_alphaNumeric: function(evt) {

        var charCode = (evt.which) ? evt.which : event.keyCode;

        return (INTERACTIVE_DIALOG_MGR.__isAlphaNumeric(charCode));
    },

    __isNumeric: function(charCode) {

        //list of acceptable special characters for input
        var accepted_special_chars = [
            46, // .
            45, // -
            8, // backspace (needs to be defined for Firefox (stupid fox))
        ];

        if (accepted_special_chars.indexOf(charCode) != -1) {
            return true;
        }

        // allow decimal and negation
        if (charCode == 46 && charCode == 45) {
            return true;
        }

        // reject all other non numeric values (not [48-57])
        //  OLD METHOD (LESS REFINED)
        //if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        //    return false;
        //}
        //return true;

        // if number return true
        if (charCode >= 48 && charCode <= 57) {
            return true;
        }

        return false;
    },

    __isAlpha: function(charCode) {

        //list of acceptable special characters for input
        var accepted_special_chars = [
            32, // space
            38, // ampersand
            39, // '
            44, // ,
            45, // -
            46, // .
            40, // (
            41, // )
            95, // _
            58, // :
            59, // ;
            8, // backspace (needs to be defined for Firefox (stupid fox))
        ];

        if (accepted_special_chars.indexOf(charCode) != -1) {
            return true;
        }

        // accept Upper case letters
        if (charCode >= 65 && charCode <= 90) {
            return true;
        }

        // accept lower case letters
        if (charCode >= 97 && charCode <= 122) {
            return true;
        }

        return false;
    },

    __isAlphaNumeric: function(charCode) {
        return (INTERACTIVE_DIALOG_MGR.__isNumeric(charCode) || INTERACTIVE_DIALOG_MGR.__isAlpha(charCode));
    },

    // #endregion

    


};

// #region Reimplementing Legacy functions from OL2 for compatability of newer modules with existing system
//
//window.uncheckAllLayers = function () {
//
//    LAYER_MGR.uncheck_all_layers();
//
//    if(typeof CUTPOINT_LAYER_MGR != "undefined") CUTPOINT_LAYER_MGR.CLEAR_LAYERS();
//
//    $("#legpanel.content").html("");
//    $("#legpanel").hide();
//
//}
//
//window.checkLayers = function () {
//    LAYER_MGR.check_layer.apply(LAYER_MGR, arguments);
//}

// #endregion


// -------------------------------------------------------------------
//      map functionality methods
// -------------------------------------------------------------------


// #region MAP MANAGER
// manager for the OL3 map including several common methods for manipulating the map
var MAP_MGR = {

    //#region MAP_MGR Properties/Attributes
    is_Initialized: false,
    //_target: null,
    _Parent_container_id: "",
    _Loaded_Section: null,
    _Loaded_Region: null,
    _Loaded_Module: null,
    _Loaded_SubStudy: null,
    _default_projection: null,

    _WMS_URL: "",
    _Map: null, // ol3 map object
    _default_controls: [], // map controls
    _external_controls: [],
    _interactions: [], // map interactions
    
    _Defalut_center: null,
    _Default_zoom: null,

    _Min_zoom: 3,
    _Max_zoom: 19,

    _Module_Layers: [], // layers collection consisting of layers Gd from layersData of preloaded 'layers.js' script
    _Layer_Legends: {},
    _Legend_container_selector: '#legpanel',


    _popup_container: null,
    _popup_content: null,
    _popup_closer: null,

    _overlay :  null,
    _help_popup: null,

    _on_reopen_events: [],
    

    // the base layer collection of the map
    //  0 - WorldImagry
    //  1 - Topo
    //  2 - Street
    //  3 - ShadedRelief
    //
    _Base_layers: null,


    // in the event that the map manager utilizes child plugins 
    // add their initialization methods to an array to execute after this object's initialization
    _child_plugin_initializations: [],

    //#endregion

    // #region INITIALIZATION METHODS
        init: function (parent_container, Loaded_Region, Loaded_Module, optional_SubStudy) {
            // set the target container to use when displaying map content
            this._Parent_container_id = parent_container;

            // set the current loaded region/casestudy references
            this._Loaded_Region = Loaded_Region;
            this._Loaded_Module = Loaded_Module;
            this._Loaded_SubStudy = optional_SubStudy;

            $(window).resize(function () {
                MAP_MGR.Resize();
            });

        },
        
        register_child_plugin: function(plugin_init_fn) {
            if (!!plugin_init_fn) {
                this._child_plugin_initializations.push(plugin_init_fn);
            }
        },

        init_child_plugins: function() {
            for (var i = 0; i < this._child_plugin_initializations.length; i++) {
                this._child_plugin_initializations[i]();
            }
        },

        // this should happen after 
        Init_Map: function (wms_url) {

            var default_base = (typeof (default_base_layer) != "undefined") ? default_base_layer : 'WorldImagery';

            $('.baseMap_tile[val="' + default_base + '"]').addClass('selected_basemap_tile');

            this._Base_layers = [
                new ol.layer.Tile({
                    name: 'WorldImagery',
                    //visible: true,
                    visible: (typeof (default_base_layer) != "undefined") ? (default_base_layer == "WorldImagery") : true,
                    source: new ol.source.XYZ({
                        url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

                        //wrapX: false,
                        //wrapY: false,
                    })
                }),
                new ol.layer.Tile({
                    name: 'Topo',
                    //visible: false,
                    visible: (typeof (default_base_layer) != "undefined") ? (default_base_layer == "Topo") : false,
                    source: new ol.source.XYZ({
                        url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                        //wrapX: false,
                        //wrapY: false,
                    })
                }),
                new ol.layer.Tile({
                    name: 'Street',
                    //visible: false,
                    visible: (typeof (default_base_layer) != "undefined") ? (default_base_layer == "Street") : false,
                    source: new ol.source.XYZ({
                        url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                        //wrapX: false,
                        //wrapY: false,
                    }),
                }),
            ];

            // if there is a wms url store it for later use
            if (!!wms_url) this._WMS_URL = wms_url,

            this._default_projection = ol.proj.get("EPSG:3857");
            //this._default_projection = ol.proj.get("EPSG:4326");


            // create the default controls and add to collection
            this._default_controls.push(this.Create_Control('Help', '?', this.open_help_popover_event));

            // add zoom in/out buttons
            this._default_controls.push(new ol.control.Zoom({ title: "Zoom In", target: document.querySelector('#mapPanel') }));

            // add reset view to relocate camera to it's default position as defined by map center/zoom defined in layers.js
            this._default_controls.push(this.Create_Control("Reset Map Position", '&#8634;', this.reset_view_event));


            // TODO: find a way to do this
            // add export button to download a PNG of the current map state
            //this._default_controls.push(this.Create_Control("Export View as Image", '<img src="/Content/images/Map_Icons/Image_Icon_White.png" />', this.export_map_event));


            this._popup_container = document.getElementById('popup');
            this._popup_content = document.getElementById('popup-content');
            this._popup_closer = document.getElementById('popup-closer');

            // setup help popover
            this._help_popup = $("#Map_Help_popover");

            this._help_popup.popover({
                html: true,
                container: '#mapPanel',
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
                controls: MAP_MGR._default_controls,
                layers: MAP_MGR._Base_layers,
                loadTilesWhileInteracting: true,
                view: new ol.View({
                    center: mapCenter,
                    zoom: default_zoom,
                    projection: MAP_MGR._default_projection,

                    // restrict the user from zooming to far or to close to features (some boundaries are a good thing...)
                    minZoom: this._Min_zoom,
                    maxZoom: this._Max_zoom,
                })
            });

            this._Map.addOverlay(this._overlay);

            this._popup_closer.onclick = function () {

                MAP_MGR._overlay.setPosition(undefined);
                //this._popup_closer.blur();
                return false;
            };

            // set up the image export functionality



            // by default hide the legend container
            $(MAP_MGR._Legend_container_selector).hide();



            LAYER_MGR.init($("#layers div.content div.layers_content_wrapper"), layersData);


            SELECTION_MANAGER.init(this._WMS_URL);

            this.init_child_plugins();
            this.is_Initialized = true;


            MAP_MGR.Resize()


        },

        // internal MAP_MGR utility method to 
        //      add all default controls to the map
        _Add_default_controls: function() {
            this._default_controls.forEach(function(element) {
                this._Map.addControl(element);
            });
        },

        // internal MAP_MGR utility method to 
        //      Add all default interactions to the map
        _Add_Interactions: function() {
            this._interactions.forEach(function(element) {
                this._Map.addInteraction(element);
            });
        },

        // method to create a new control button to the map
        //      control_title:  title to be displayed upon hovering over contol
        //      icon_html:      the raw html of what is to be displayed on the control button (can be a 16x16 image or an encoded html character)
        //      clickevent:     The click event for the button which maps the functionality of the control
        Create_Control: function(control_title, icon_html, clickevent) {
        
            var new_control_options = {
                title: control_title,
                display_html: icon_html,
                clickevent: clickevent,
                target: document.querySelector('#mapPanel'),
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
        },

        Add_Control: function(control) {
        
            if (!!control) {
                this._external_controls.push(control);
                this._Map.addControl(control);
            }
        },

    // #endregion

    // #region MAP functionality methods
        Reset_Position: function() {
            this._Map.getView().setCenter(mapCenter);
            this._Map.getView().setZoom(default_zoom);
        },

        // get the current view's extent
        Get_Map_Extent: function () {
            
            //return MAP_MGR._Map.getView().calculateExtent(MAP_MGR._Map.getSize());

            var extent = MAP_MGR._Map.getView().calculateExtent(MAP_MGR._Map.getSize());
            return ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
            
        },
        
        Get_Current_Zoom: function() {
            return MAP_MGR._Map.getView().getZoom();

        },
        
        Get_Current_Center: function() {
            var center = MAP_MGR._Map.getView().getCenter();
            return ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
        },

        //  get current viewport information, used for setting up the default view for layers
        Get_Viewport_Dump: function() {

            var viewDump = {};

            viewDump["zoom"] = MAP_MGR.Get_Current_Zoom();
            viewDump["center"] = MAP_MGR.Get_Current_Center();
            viewDump["extent"] = MAP_MGR.Get_Map_Extent();

            return viewDump;
        },

        // convert point to lon/lat OL3
        Convert_point_to_LonLat: function (point) {
            ol.proj.transform(point, 'EPSG:3857', 'EPSG:4326');

        },

        Resize: function () {

            if (this.is_Initialized) {
                if($(this._Parent_container_id).is(':visible')){

                    setTimeout(function(){

                        var window_height = $(window).height()
                        var map_top = $(MAP_MGR._Parent_container_id).offset().top
                        var footer_height = $('#footer').height()
                        var new_height = window_height - map_top - footer_height

                        $(MAP_MGR._Parent_container_id).height(new_height)
                        $('#' + MAP_MGR._Map.getTarget()).height(new_height)

                        MAP_MGR._Map.updateSize();
                        console.log('updating map size...')
                    }, 200);
                }

            }
        
            if (typeof SPINNER_MGR != "undefined") {
                SPINNER_MGR.Resize_spinners();
            }
        },
    // #endregion

    //#region BASEMAP functionality methods

        Change_BaseLayer_byName: function (lyr_name) {
        
            this._Base_layers.forEach(function (element, index) {
                (element.get('name') == lyr_name) ?
                    MAP_MGR._Base_layers[index].setVisible(true) :
                    MAP_MGR._Base_layers[index].setVisible(false);
            });
        },

    //#endregion

    // #region Module Layers functionality 

    // add a constructed layer to the map
    addLayer: function (Layer, legend) {
        
        // optional legend
        if (!!!legend) legend = null;
        else legend = $(legend);

        this._Module_Layers.push(Layer);
        this._Map.addLayer(Layer);
        
        // add legend graphic from server
        if (!!legend) {
            var layer_name = Layer.get('name');

            legend.addClass('layer_legend');
            legend.attr('id', layer_name + '_legend');

            this._Layer_Legends[layer_name] = legend;
            
            $(this._Legend_container_selector).find('.content').append(legend);
            $(this._Legend_container_selector).show();
            

        }


    },

    // remove a constructed layer
    // this method assumes that the layer you're removing exists
    removeLayer: function(Layer) {
        //this._Module_Layers.push(Layer);
        this._Module_Layers = this._Module_Layers.filter(function (el) {
            return el !== Layer;
        });
        this._Map.removeLayer(Layer);

        // remove legend graphic if exists
        var layer_name = Layer.get('name');
        if (!!this._Layer_Legends[layer_name]) {
            // remove legend from legend container if it exists
            $(this._Legend_container_selector).find('#' + layer_name + '_legend').remove();

            if ($(this._Legend_container_selector).find('.layer_legend:visible').length == 0) {
                $(this._Legend_container_selector).hide();
            }

            // delete legend reference
            delete this._Layer_Legends[layer_name];
        }
    },

    // remove a layer from the map by the id of the layer
    removeLayer_byName: function(name) {
        var layer = this.get_Layer_byName(name);

        if (!!layer) {
            this.removeLayer(layer);
        }
    },

    // internal MAP_MGR utility method to 
    //  add layers loaded from layers.js to the map
    _add_Module_Layers: function() {
        this._Module_Layers.forEach(function (element, index) {
            MAP_MGR._Map.addLayer(element);
        });
    },

    // get a layer reference by the id
    get_Layer_byName: function (lyr_name) {
        var found_lyr = null;
        //Map_Layers.forEach(function (element, index) {
        this._Module_Layers.forEach(function (element, index) {
            if ((element.get('name') == lyr_name)) {
                found_lyr = MAP_MGR._Module_Layers[index];
            }

        });
        return found_lyr;        
    },

    // hide map layer with specified id
    hide_Layer: function(lyr_name) {
        var layer = this.get_Layer_byName(lyr_name);
        if (!!layer) {
            layer.setVisible(false);

            // hide the legend of this layer if it exists

            if (!!this._Layer_Legends[lyr_name]) {
                // remove legend from legend container if it exists
                $(this._Legend_container_selector).find('#' + lyr_name + '_legend').hide();

                if ($(this._Legend_container_selector).find('.layer_legend:visible').length == 0) {
                    $(this._Legend_container_selector).hide();
                }
            }
        }
        
    },
    
    // show map layer with the specified id
    show_Layer: function (lyr_name) {
        var layer = this.get_Layer_byName(lyr_name);
        layer.setVisible(true);
        
        // show the legend of this layer if it exists
        if (!!this._Layer_Legends[lyr_name]) {
            // remove legend from legend container if it exists
            $(this._Legend_container_selector).show();
            $(this._Legend_container_selector).find('#' + lyr_name + '_legend').show();
            
            //debugger;

        }
    },
    // #endregion

    // #region Events handlers
    open_help_popover_event: function () {
        
        //MAP_MGR._help_popup.fadeToggle();

        
        MAP_MGR._help_popup.popover("toggle");

        //var popover_obj = $("#" + $(MAP_MGR._help_popup).attr('aria-describedby'));

        //// position the popover to right of marker
        //popover_obj.css("top", -(popover_obj.height() / 2) - 10);
        //popover_obj.css("left", 45);
        //popover_obj.find(".map_popover_arrow").css("margin-top", -(popover_obj.height() / 2) + 15);

    },

    
    reset_view_event : function () {
        //this_.getMap().getView().setRotation(0);
        MAP_MGR.Reset_Position();
    },

    export_map_event: function () {
        

        var download_link = $(document.createElement('a'));
        download_link.attr('target', '_blank');
        download_link.attr('download', 'Hydroviz_Capture.png');

        MAP_MGR._Map.once('postcompose', function (event) {
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

        MAP_MGR._Map.renderSync();

    },

    // #endregion

    // #region Popup Handlers
    Display_popup: function (content, coord) {
        $("#popup-content").html(content);
        $("#popup-content").scrollTop(0);
        $('#popup').show();
        this._overlay.setPosition(coord);
    },

    Hide_popup: function() {
        $('#popup').hide();

    },
    // #endregion

    //  #region Viewport Manipulation methods
    pre_display: function() {
        
        // Pause any open videos if the youtube player is open
//        if (!!youtube_player) {
//            pauseVideo();
//        }


        // activate the map tab
        $("#map-tab").addClass("active");
    },

    post_display: function() {
        


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
            MAP_MGR.Change_BaseLayer_byName(selected_tile.attr('val'));

        });

        if (arguments.length > 0) {
            //uncheckAllLayers();
            //checkLayers.apply(null, arguments);
        }

        // give OpenLayers a chance to initalize itself and then run the Resize event handler 
        setTimeout(MAP_MGR.Resize(), 500);
    },

    on_Hide: function() {
        
        $("#map-tab").removeClass("active");

        // get list of all open dialog's ids
        var curr_open_dialogs = $('.ui-dialog-content').filter(function () { return $(this).dialog('isOpen'); }).map(function () { return "#{0}".format($(this).attr('id')); });

        // register a reopen event for each of the open dialogs to trigger reopening them
        MAP_MGR.Register_on_reopen_event(function() {
            $.each(curr_open_dialogs, function(index, id) {
                $(id).dialog("open");
            });

        });


        
        $('.ui-dialog-content').dialog('close');
    },

    on_Show: function () {
        
        if (!$("#map-tab").hasClass('active')) {
            $("#map-tab").addClass("active");
        }

        // if have any arguments (layer_ids) check the associated layers on the map
        if (arguments.length > 0) {
            //uncheckAllLayers();
            //checkLayers.apply(null, arguments);
        }


        if (MAP_MGR._on_reopen_events.length > 0) {
            // run each of the reopen events
            $.each(MAP_MGR._on_reopen_events, function (index, evt) { evt(); });

            // clear the reopen events
            MAP_MGR._on_reopen_events = [];

        }

        MAP_MGR.Resize()
    },

    // expects an anonomous method to be run next time the map is opened 
    // (typically used for opening dialogs that loaded after user navigated away from the map) 
    Register_on_reopen_event: function(method_to_run) {
        MAP_MGR._on_reopen_events.push(method_to_run);
    },

    get_content_query_data:function() {

        // theoretically this isn't needed anymore being that
        //  layer data can be stored in module
        return null

        var query_data = {};

        query_data['url'] = "/map/MapWithCheckedLayers/"
        //+ MAP_MGR._Loaded_Region
        //+ "/" + MAP_MGR._Loaded_Module
        + ((!!MAP_MGR._Loaded_SubStudy) ? "/" + MAP_MGR._Loaded_SubStudy : "");

        
        var vis_layers_str = "";
        if (arguments.length > 0) {
            for (var i = 0; i < arguments.length; i++) {
                vis_layers_str += arguments[i];
                if (i != arguments.length - 1) vis_layers_str += ",";
            }
        }
        
        query_data['data'] = { 'visibleLayers': vis_layers_str }

        return query_data;
    }
    //  #endregion
}

// #endregion

// #region SELECTION MANAGER 

var SELECTION_MANAGER = {

    WMS_URL: "",
    _selected_feature_ids: [], // parallel lists for HUCs and their associated Feature ID's in WMS
    selection_enabled: false,
    _style_layers: {
        "shape": 'Polygon_Selected_Styling',
        "line": 'Line_Selected_Styling',
        "point": 'Point_Selected_Styling',
    },

    _active_selection_layer_ID: '',
    _active_source_params: null,
    _Selectable_Layer_Info: {},

    
    SELECTION_LAYER_SOURCE_PARAMS: {
        'FORMAT': 'image/png',
        'VERSION': '1.1.1',
        serverType: 'geoserver',
        STYLES: "",
        
        

    },

    SELECTION_LAYER_SOURCE: null,

    // SELECT WMS LAYER
    SELECTION_LAYER: null,

    SELECTION_DIALOG: null,

    init: function () {

        //var selection_toggle_nexus_control = MAP_MGR.Create_Control("Toggle Additional Feature Info Selection", '<img id="Selection_Toggle_img" src="/Content/images/icons/infoIcon_white.png" />', this._toggle_info_selection);
        //MAP_MGR.Add_Control(selection_toggle_nexus_control);
        if (typeof (WMS_URL) != "undefined") this.WMS_URL = WMS_URL
        

        // create the selection dialog for displaying the feature query result
        SELECTION_MANAGER.SELECTION_DIALOG = $('#Selection_Info_Dialog').dialog({
            autoOpen: false,
            draggable: true,
            modal: false,
            resizable: true,
            resize: 'auto',
            resizeStop: SELECTION_MANAGER.info_dialog_resize_evt,

        });

        
        // set close event
        SELECTION_MANAGER.SELECTION_DIALOG.on('dialogclose', SELECTION_MANAGER.info_dialog_close_evt);
        SELECTION_MANAGER.SELECTION_DIALOG.on('dialogopen', SELECTION_MANAGER.info_dialog_open_evt);




        // update the layer source 
        //this.update_SELECTION_LAYER_SOURCE();
    },

    _toggle_info_selection: function (optional_manual_setting) {

        if (typeof (optional_manual_setting) != "undefined") {
            SELECTION_MANAGER.toggle_feature_selection_enabled(optional_manual_setting);
        } else {
            SELECTION_MANAGER.toggle_feature_selection_enabled();
        }

        if (SELECTION_MANAGER.selection_enabled) {
            $('.ol-viewport').css('cursor', 'help');
            $("#Selection_Toggle_img").closest('button').css('background-color', 'rgba(255,157,0,.5)');
        } else {
            $('.ol-viewport').css('cursor', 'default');
            $("#Selection_Toggle_img").closest('button').css('background-color', 'rgba(0,60,137,.5)');
        }
    },
    
    set_active_selection_layer: function (selected_layer_ID) {
        
        // remove any existing selection layer
        this.REMOVE_SELECTION_LAYER_FROM_MAP();

        if (!!this._Selectable_Layer_Info[selected_layer_ID]) {

            //clear any existing selections/close the dialog
            SELECTION_MANAGER.close_info_dialog();

            // clone the SELECTION_LAYER_SOURCE_PARAMS object and add the appropriate WMS layer and style parameters
            var updated_source_params = $.extend(true, {}, this.SELECTION_LAYER_SOURCE_PARAMS);
            updated_source_params.LAYERS = this.get_Layer_Ref(selected_layer_ID);
            updated_source_params.STYLES = this._style_layers[this.get_Layer_Type(selected_layer_ID)];
            
            this._active_source_params = updated_source_params;

            // generate new layer with updated source params for the selected layer

            
            // set default values for the selection layer
            this.SELECTION_LAYER_SOURCE = new ol.source.TileWMS({
                url: this.WMS_URL,
                params: updated_source_params,
            });

            // create the layer used for displaying selections
            this.SELECTION_LAYER = new ol.layer.Tile({
                visible: true,
                name: "SELECTION_LAYER",
                source: this.SELECTION_LAYER_SOURCE,

            });

            // add the updated selection layer to the map
            this.ADD_SELECTION_LAYER_TO_MAP();

            // set the active selecteion layer
            this._active_selection_layer_ID = selected_layer_ID;

            // update the selection layer source
            this.update_SELECTION_LAYER_SOURCE();

        }
    },

    add_selectable_layer_info: function (Layer_ID, Layer_Type, Layer_Ref) {
        if (!!Layer_ID && !!Layer_Ref && !!Layer_Type) {
            this._Selectable_Layer_Info[Layer_ID] = { "Layer_Ref": Layer_Ref, 'Layer_Type': Layer_Type };
        }
    },
    
    update_SELECTION_LAYER_SOURCE: function () {

        // NOTE: that there appears to be a firm cap of ~300 passed feature id's
        //      Request url most likely gets too large...

        if (!!this.SELECTION_LAYER) {
            this.SELECTION_LAYER.setVisible(false);
        }

        if (this.total_selected() > 0) {
            var filtered_url = this.WMS_URL;

            var data = {}
            
            if (this.total_selected() > 0) {
                filtered_url += "?CQL_FILTER=in(" + this.get_Feature_IDs_string() + ")";
                
            }


            this.SELECTION_LAYER_SOURCE = new ol.source.TileWMS({
                url: filtered_url,
                params: this._active_source_params
            });

            this.SELECTION_LAYER.setSource(this.SELECTION_LAYER_SOURCE);

            if (this.total_selected() > 0) {
                this.SELECTION_LAYER.setVisible(true);
            }
        }

    },

    ADD_SELECTION_LAYER_TO_MAP: function () {

        MAP_MGR.addLayer(SELECTION_MANAGER.SELECTION_LAYER);
        SELECTION_MANAGER.SELECTION_LAYER.setZIndex(1000);  // ensure selection layer is always on top
        MAP_MGR._Map.on('singleclick', this.Feature_selection_event);

    },

    REMOVE_SELECTION_LAYER_FROM_MAP: function() {
        if (this.SELECTION_LAYER != null) {

            MAP_MGR.removeLayer_byName("SELECTION_LAYER");
            this.SELECTION_LAYER = null;
            this.SELECTION_LAYER_SOURCE = null;

            this._active_source_params = null;
            this._active_selection_layer_ID = '';
        }
    },

    toggle_feature_selection_enabled: function (optional_manual_setting) {

        if (typeof (optional_manual_setting) != "undefined") {
            this.selection_enabled = optional_manual_setting;
        } else {
            this.selection_enabled = !this.selection_enabled;
        }
    },

    Feature_selection_event: function (evt) {

        if (SELECTION_MANAGER.selection_enabled && !! SELECTION_MANAGER.get_active_layer_id()) {


            var map = MAP_MGR._Map;
            var view = map.getView();
            var viewResolution = view.getResolution();
            var curr_layer = SELECTION_MANAGER.get_active_layer_id();
            var source = MAP_MGR.get_Layer_byName(curr_layer).getSource();
            var coordinate = evt.coordinate;

            //var indexed_feature_field = 
            
            var requested_properties = LAYER_MGR.get_Layer_Property_Meta(curr_layer);

            var requested_properties_key_list = null;
            
            if (!!requested_properties) {
                requested_properties_key_list = Object.keys(requested_properties);
                
            }
            
            var url_params = {};
            
            url_params['VERSION'] = '2.0.0';
            url_params['INFO_FORMAT'] = 'application/json';
            url_params['FEATURE_COUNT'] = 1;
            
            
            if (!!requested_properties) {

                //if (!index_included) requested_properties_key_list.push(indexed_property);
                url_params['propertyName'] = requested_properties_key_list.join(',') ;

            }
            url_params['propertyName'] = '';



            // generate the url to query for feature info,
            //      requesting specific attributes
            var url = source.getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), url_params); 

            // if the url was successfully generated make the request and parse the response
            if (url) {

                // modify the featureinfo url to be a call to proxy (remove the base address)
                url = '/geoserver/{0}'.format(url.split('/geoserver/')[1]);


                var request_url = encodeURIComponent(url);
                var parser = new ol.format.GeoJSON();

                

                // query for the feature id of the clicked feature if any
                SPINNER_MGR.Register_Query($.ajax({
                        url: GEOSERVER_DATA_MGR._proxy_prefix + request_url,
                        type: "post",
                        dataType: "json",
                        //error: function (msg) {
                        //    console.log("ERROR: Failed to load selection data");
                        //    console.log(msg.responseText);
                        //}
                    }),
                    function(response) {

                        
                        var result = null;

                        // if a feature was present at the clicked coord parse it's results
                        if (response.features.length) {
                            result = parser.readFeatures(response.features[0]);
                        }

                        // if there was a parsed result and the number of features is not 0
                        if (!!result && result.length) {

                            //only support a single huc selection for this implementaion
                            SELECTION_MANAGER.clear_selection();

                            var feature_id = result[0].getId();

                            // if the feature information has not already been loaded, register a query to load the feature values
                            // once loaded populate the feature detail dialog
                            if (!GEOSERVER_DATA_MGR.is_Feature_Loaded(curr_layer, feature_id)) {
                                SPINNER_MGR.Register_Query(
                                    GEOSERVER_DATA_MGR._Load_Feature_Values(curr_layer, feature_id),
                                    SELECTION_MANAGER.Populate_Feature_Details_Dialog, [curr_layer, feature_id], '#map');

                            } else {
                                SELECTION_MANAGER.Populate_Feature_Details_Dialog(null, curr_layer, feature_id);
                            }


                            

                        }
                    },null,'#map');

            }
        }
    },

    Populate_Feature_Details_Dialog: function(ajax_return, layer_id, feature_id) {
        
        var feature_properties = GEOSERVER_DATA_MGR.get_Feature_data(layer_id, feature_id);
        var requested_properties = LAYER_MGR.get_Layer_Property_Meta(layer_id);
        var alternate_color = false;

        //for (var i = 0, ii = result.length; i < ii; ++i) {
            SELECTION_MANAGER.toggle_selection(feature_id);
        //}

        function isNumber(obj) { return !isNaN(parseFloat(obj)); };

        var feature_popup_content = '<p style="font-weight: bold;font-size: 1.25em;"> Selected "'
            + LAYER_MGR.Get_layer_data(layer_id).title + '" Feature Info</p>' +
            '<div class="Feature_Popup_table">'
            + '<div class="Feature_Popup_table_row">' +
            '<div class="Feature_Popup_table_cell Feature_Popup_table_header_cell">Variable</div>' +
            '<div style="min-width:100px" class="Feature_Popup_table_cell Feature_Popup_table_header_cell">Value</div>' +
            '</div>'
            + $.map(feature_properties, function(val, key) {
                // do some data formatting here

                if (key == "geometry") return null;

                //var var_data = HUC8_DATA_MGR.Attribute_Data[key];
                // get the attribute title from the layer_mgr's property meta if it exists otherwise just use the attribute key
                var title = (!!requested_properties) ?
                        LAYER_MGR.get_Layer_Property_Meta(layer_id, key, "Display_Name") :
                        key;

                // if the layer attribute meta has a unit_abbr defined add it to the title
                var units = LAYER_MGR.get_Layer_Property_Meta(layer_id, key, "Units_Abbr");
                if (!!units) title = "{0} ({1})".format(title, units);

                // if there are custom value mappings for this property's values, replace the value text with its
                //  custom mapped value
                var custom_value_mappings = LAYER_MGR.get_Layer_Property_Meta(layer_id, key, "Custom_Value_Mappings");
                if (!!custom_value_mappings) {
                    val = (!!custom_value_mappings[val]) ? custom_value_mappings[val] : val;
                }

                var property_row = '<div class="Feature_Popup_table_row">' +
                    '<div class="Feature_Popup_table_cell ' + ((alternate_color) ? "alt" : "") + '">{0}</div>' +
                    '<div class="Feature_Popup_table_cell ' + ((alternate_color) ? "alt" : "") + '">{1}</div>' +
                    '</div>';

                alternate_color = !alternate_color;
                return property_row.format(title, val);


            }).filter(Boolean).join(" ")
            + '</div>';

        // old method of displaying info in popup
        //MAP_MGR.Display_popup(feature_popup_content, coordinate);

        SELECTION_MANAGER.display_info_dialog(feature_popup_content);

    },

    display_info_dialog: function (content) {
        SELECTION_MANAGER.SELECTION_DIALOG.find(".content").html(content);
        SELECTION_MANAGER.SELECTION_DIALOG.find(".content").scrollTop(0);

        if (VIEWPORT_MGR.Current_View() != 'Map') {
            
            MAP_MGR.Register_on_reopen_event(function() {
                SELECTION_MANAGER.SELECTION_DIALOG.dialog("open");
                SELECTION_MANAGER.SELECTION_LAYER.setVisible(true);
            });

        } else {
            SELECTION_MANAGER.SELECTION_DIALOG.dialog("open");
        }
        



        $('.ui-dialog :button').blur();
    },

    close_info_dialog: function () {
        SELECTION_MANAGER.SELECTION_DIALOG.dialog("close");
        //$('#Selection_Info_Dialog').dialog("open");
    },

    info_dialog_resize_evt: function (event, ui) {
        $(this).height($(this).parent().height() - $(this).prev('.ui-dialog-titlebar').height() - 34);
        $(this).width($(this).prev('.ui-dialog-titlebar').width() + 2);
    },

    info_dialog_close_evt: function (event, ui) {
        //SELECTION_MANAGER.clear_selection();
        if (!!SELECTION_MANAGER.SELECTION_LAYER) SELECTION_MANAGER.SELECTION_LAYER.setVisible(false);


    },

    info_dialog_open_evt: function (event, ui) {
        //SELECTION_MANAGER.clear_selection();
        if (!!SELECTION_MANAGER.SELECTION_LAYER) SELECTION_MANAGER.SELECTION_LAYER.setVisible(true);
    },

    total_selected: function () {
        return this._selected_feature_ids.length;
    },

    find_by_Feature_ID: function (Feature_id) {
        return this._selected_feature_ids.indexOf(Feature_id);
    },

    remove_by_Feature_ID: function (Feature_id) {
        var index = this.find_by_Feature_ID(Feature_id);
        if (index != -1) {
            this._selected_feature_ids.splice(index, 1);
        }
    },

    clear_selection: function () {
        this.close_info_dialog();
        this._selected_feature_ids = [];
        this.update_SELECTION_LAYER_SOURCE();
    },

    toggle_selection: function (feature_id) {
        if (!!feature_id) {

            this._selected_feature_ids.push(feature_id);
            SELECTION_MANAGER.update_SELECTION_LAYER_SOURCE();

        }
    },

    // helper methods
    
    // get selected Feature_IDs as a comma separated string of values
    get_Feature_IDs_string: function () {
        // get list of feature IDs as a csv string
        var featureID_csv = "";

        for (var i = 0, len = this.total_selected() ; i < len; i++) {
            if (i == 0)
                featureID_csv += "'" + this._selected_feature_ids[i] + "'";
            else {
                featureID_csv += "," + "'" + this._selected_feature_ids[i] +"'";
            }
        }

        return featureID_csv;
    },

    get_active_layer_id: function () {
        return this._active_selection_layer_ID;
    },

    get_Layer_Ref: function (Layer_ID) {
        // if no layer was specified use the current active layer
        var layer_id = (!!Layer_ID) ? Layer_ID : this._active_selection_layer_ID;
        return (!!this._Selectable_Layer_Info[layer_id]) ? this._Selectable_Layer_Info[layer_id].Layer_Ref : null;
    },

    get_Layer_Type: function (Layer_ID) {
        var layer_id = (!!Layer_ID) ? Layer_ID : this._active_selection_layer_ID;
        return (!!this._Selectable_Layer_Info[layer_id]) ? this._Selectable_Layer_Info[layer_id].Layer_Type : null;
    },

    
};

// #endregion


var LAYER_MGR = {
    
    // #region LAYER_MGR Properties

        _target: null, // jquery reference to the target container of the layer manager
    
        _default_layerdata: {}, // the layerdata indexed by layer_id
        _default_enabled_layers: [],
        _default_layer_order: [],

        // object mapping layer group id's to their child layer id's (also used for storing default ordering of child layers in group)
        //      mapped as {'group_id': ['child_layer_id1', ...]}
        _layer_groups: {},
        _additional_layer_groups: {},

        // object mapping layer id to it's selectable fields to be referenced by the SELECTION_MGR
        _Layer_Properties_Meta: {},


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
        _linked_layers_meta: {},

        // the default starting z index of layers in the layer manager 
        _start_z_index: 100,

    // #endregion

    // method to read LayerData object from loaded 'layers.js' script and generate layer groupings from it's contents
    init: function (target, layerData) {
        
        this._target = target;
        
        var Layer_Listing_Object = this._Parse_Layer_Data_to_Object(layerData);

        // add listing object to it's target container
        this._target.html(Layer_Listing_Object);

        // after loading the remainder of the page run the following
        $(function () {

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
                update: LAYER_MGR.Update_Layer_Draw_Order,
            });
        
            $(".layer_sortable").sortable({
                revert: true,
                placeholder: "ui-state-highlight",
                start: function (e, ui) {
                    ui.placeholder.height(ui.item.height());
                },
                handle: ".layer_handle",
                helper : 'clone',
                update: LAYER_MGR.Update_Layer_Draw_Order,
            });

            //
            //$(".layer_sortable").disableSelection();

            // add click events to the enabler/info_selector/filter buttons
            
            $('.enabler').click(LAYER_MGR._enabler_clicked_evt);
            $('.info_selector').click(LAYER_MGR._info_selector_clicked_evt);
            $('.filtering_btn').click(LAYER_MGR._filter_btn_clicked_evt);
            
            // generate map layers from loaded layerData
            LAYER_MGR.Add_Map_layers();

            
            // set visiblity of layers to specified default
            LAYER_MGR.Reset_Visible_Layers_To_Default();
            
            // set the z-index for all layers according to sort order
            LAYER_MGR.Update_Layer_Draw_Order();

            
        });

    },

    // #region Parsing/Event Handling

        _Parse_Layer_Data_to_Object: function (layerData) {

            var Parsed_Obj = $(document.createElement('div'));
            Parsed_Obj.attr('id', 'Layer_Listing_wrapper');

            // layerData is a list of objects
            //      objects have 'data' objects and optional child lists
            //
            for(var i = 0; i < layerData.length; i++)
            {
                // if has children create accordion object and generate sortable listing entry for each child layer
                var listing_obj = this.Generate_Layer_Sortable_Listing();

                if (layerData[i].type == 'Group') {
                
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
                        var layer_type = (!!children[j].LayerType) ? children[j].LayerType : "";
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
                                GEOSERVER_DATA_MGR.Load_Layer_Attribute_Meta(layer_id),
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
                    
                    var layer_id = layerData[i].id;
                    var layer_title = layerData[i].title;
                    var info_selectable = (!!layerData[i].Selectable);
                    var filtering_enabled = (!!layerData[i].Filterable);
                    var layer_type = (!!layerData[i].LayerType) ? layerData[i].LayerType : "";
                    var default_enabled = (!!layerData[i].Default_Enabled) ? layerData[i].Default_Enabled : false;

                    // map the layer to it's geoserver layer reference in the Geoserver_data_mgr
                    GEOSERVER_DATA_MGR.map_Layer_ID_to_Server_Layer(layer_id, layerData[i].Layer_Reference);

                    // if this layer is enabled by default store it's id in the default collection
                    if (default_enabled) this._default_enabled_layers.push(layer_id);


                    // if there are feature variable mappings store them for later use
                    if (!!layerData[i].Feature_Properties_Meta) {
                        this._Layer_Properties_Meta[layer_id] = layerData[i].Feature_Properties_Meta;
                    }


                    // keep track of it's parent
                    //this._layer_groups[group_id].push(layer_id);

                    // store a record of it's layer data indexed by it's id
                    this._default_layerdata[layer_id] = layerData[i];

                    // keep track of the layer's load order for z-ordering
                    this._default_layer_order.push(layer_id);

                    var list_entry = this.Generate_Layer_Sortable_Entry(false, layer_id, layer_title, layer_type, filtering_enabled, info_selectable);
                    listing_obj.append(list_entry);

                    
                    if (layer_type != 'raster') {
                        // trigger the data load for this layer
                        SPINNER_MGR.Register_Query(GEOSERVER_DATA_MGR.Load_Layer_Attribute_Meta(layer_id),
                            (filtering_enabled) ?
                            GEOSERVER_DATA_MGR._Load_Layer_Values
                            : null, [layer_id], '#map');

                    }
                    


                    Parsed_Obj.append(listing_obj);
                }
            

            }
        
            return Parsed_Obj;
        },
    
        _enabler_clicked_evt: function (evt) {
            evt.stopPropagation();
        
            $(evt.target).toggleClass('enabled');

            //TODO: add conditions for if group or layer selected
            LAYER_MGR._enabler_changed_evt(evt.target);
        },

        _enabler_changed_evt: function(obj) {
            
            // if this is a group enabler enabler, enable all child layers
            if (LAYER_MGR._layer_groups.hasOwnProperty($(obj).attr('linked_layer'))) {
            
                if ($(obj).hasClass('enabled')) {
                    $.each(LAYER_MGR._layer_groups[$(obj).attr('linked_layer')], function(i, layer_id) { LAYER_MGR.check_layer(layer_id); });
                    $($(obj).attr('linked_layer')).addClass('enabled');
                } else {
                    $.each(LAYER_MGR._layer_groups[$(obj).attr('linked_layer')], function (i, layer_id) { LAYER_MGR.uncheck_layer(layer_id); });
                }

            } else {

                var layer_selector = $(obj).parent().find('.info_selector');
                var filtering_btn = $(obj).parent().find('.filtering_btn');

                // if enabling the layer
                if ($(obj).hasClass('enabled')) { 
                    layer_selector.removeClass('disabled');
                    filtering_btn.removeClass('disabled');

                    MAP_MGR.show_Layer($(obj).attr('linked_layer'));

                    // show any linked child layers if they are set to visible
                    if (!!LAYER_MGR._linked_layers_meta[$(obj).attr('linked_layer')]) {

                        $.each(LAYER_MGR._linked_layers_meta[$(obj).attr('linked_layer')], function (child_id, child_layer_meta) {

                            if (child_layer_meta['visible']) {
                                MAP_MGR.show_Layer(child_id);
                            }
                            

                        });

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

                    MAP_MGR.hide_Layer($(obj).attr('linked_layer'));

                    // show any linked child layers
                    if (!!LAYER_MGR._linked_layers_meta[$(obj).attr('linked_layer')]) {
                        $.each(LAYER_MGR._linked_layers_meta[$(obj).attr('linked_layer')], function (child_id, val) {
                            MAP_MGR.hide_Layer(child_id);
                        });
                    }
                }
                 
                // check if there's a parent group for this layer and add 'partial' or 'enabled' class to parent enabler respectivly
                $.each(this._layer_groups, function (group_id, layers) {
                    // if the current layer being enabled is in this group

                    if (layers.indexOf($(obj).attr('linked_layer')) != -1) {
                        $('#' + group_id + '_enabler').removeClass('enabled');
                        $('#' + group_id + '_enabler').removeClass('partial');

                        var total_enabled = 0;
                        $.each(layers, function (i, layer_id) { if (LAYER_MGR.Layer_Enabled(layer_id)) total_enabled++; });

                        if (total_enabled == layers.length) {
                            $('#' + group_id + '_enabler').addClass('enabled');

                        } else if (total_enabled > 0) {
                            $('#' + group_id + '_enabler').addClass('partial');
                        }
                    }
                });

            }
        },

        _info_selector_clicked_evt: function (evt) {
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
        
        },

        _filter_btn_clicked_evt: function (evt) {
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

        },
        
        
    // #endregion

    // #region Layer Sortable Generation

        Generate_Layer_Group_Accord: function(Group_Id, Group_Title) {

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

            // add accordion group id to this._initial_ordering 

            return Group_Accord;
        },

        Generate_Layer_Sortable_Listing: function() {
            var Layer_list = $(document.createElement('ul'));
            Layer_list.addClass('layer_sortable');

            return Layer_list;
        },

        Generate_Layer_Sortable_Entry: function (grouped, Layer_Id, Layer_Name, Layer_type, filtering_enabled, info_selectable) {
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
            var Layer_list_item = $(document.createElement('li'));
            Layer_list_item.attr('id', Layer_Id);

            
            Layer_list_item.addClass('layer_entry');
            Layer_list_item.addClass('ui-state-default');

            var enabler = this.Generate_Enabler(Layer_Id);
            var Layer_handle = $(document.createElement('div'));

            // if the layer is grouped add a layer handle, otherwise add a group handle (so it's sortable with groups)
            if (!!grouped) Layer_handle.addClass('layer_handle');
            else Layer_handle.addClass('group_handle');
            

            var text = $(document.createElement('div'));
            text.addClass('layer_text');
            text.append(Layer_Name);

            var icon = $(document.createElement('img'));
            icon.addClass("layer_type_icon");

            switch (Layer_type) {
                case "shape":
                    icon.attr('src', '/Content/images/Map_Icons/Layer_Icons/default_shape_layer_icon.png');
                    break;

                case "line":
                    icon.attr('src', '/Content/images/Map_Icons/Layer_Icons/default_line_layer_icon.png');
                    break;

                case "point":
                    icon.attr('src', '/Content/images/Map_Icons/Layer_Icons/default_point_layer_icon.png');
                    break;

                case "raster":
                    icon.attr('src', '/Content/images/Map_Icons/Layer_Icons/default_raster_layer_icon.png');
                    break;

                default:
                    icon.attr('src', '/Content/images/Map_Icons/Layer_Icons/default_layer_icon.png');
                    break;
            }

        
            // Add the checkbox, icon, and optional layer Selection button
            Layer_handle.append(icon);
            Layer_handle.append(text);
            //Layer_handle.append(Layer_Name);

            Layer_list_item.append(enabler);
            Layer_list_item.append(Layer_handle);

            if (filtering_enabled) {
                var filter_btn = this.Generate_Filtering_button(Layer_Id);
                Layer_list_item.append(filter_btn);
            }

            if (info_selectable) {
                var selector = this.Generate_Info_Selector(Layer_Id);
                Layer_list_item.append(selector);
            }

            

            // add Layer item id to this._initial_ordering 

            return Layer_list_item;
        },

        Generate_Enabler: function(item_id) {
            var enabler = $(document.createElement('div'));

            enabler.attr('id', item_id + '_enabler');
            enabler.attr('title', 'Click to toggle visiblity of this layer on the map.');
            enabler.attr('linked_layer', item_id);
            enabler.addClass('enabler');

            return enabler;

        },

        Generate_Info_Selector: function(item_id) {

            var selector = $(document.createElement('div'));

            selector.addClass('layer_action_btn');
            selector.attr('id', item_id + '_selector');
            selector.attr('title', 'Click to toggle feature info selection. (layer must be visible to enable selection)');
            selector.attr('linked_layer', item_id);
            selector.addClass('info_selector');

            // defaults as disabled until layer is visible
            selector.addClass('disabled');

            return selector;
        },
        
        Generate_Filtering_button: function(item_id) {
            
            var Filtering_btn = $(document.createElement('div'));

            Filtering_btn.addClass('layer_action_btn');
            Filtering_btn.attr('id', item_id + '_Filtering_btn');
            Filtering_btn.attr('title', 'Click Open Interaction Dialog for this layer. (layer must be visible to enable Interaction)');
            Filtering_btn.attr('linked_layer', item_id);
            Filtering_btn.addClass('filtering_btn');

            // defaults as disabled until layer is visible
            Filtering_btn.addClass('disabled');

            return Filtering_btn;
        },

        Generate_Legend_obj: function(legend_def) {
            
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

        },

    // #endregion

    // #region Utility Methods / Functionality

        Layer_Enabled: function(Layer_id) {
            var enabler = $('#' + Layer_id + '_enabler');
            if (enabler.length > 0) {
                return enabler.hasClass('enabled');
            }
            return false;
        },

        // get the layer data for a layer associated with passed layer_id
        Get_layer_data: function (layer_id) {
            var requested_layer_data = null;
        
            // check the default initialized layer data
            if (!!this._default_layerdata[layer_id]) {
                requested_layer_data = this._default_layerdata[layer_id];
            }

            // TODO: check any additional layer data


            return requested_layer_data;
        },

        // add all layers in layer data to the map using MAP_MGR
        Add_Map_layers: function() {
            // for each layer in layer data
            //var layerdata_obj = this.Get_Combined_layerdata();
            
            // add layers to the map for all of the initial layers
            $.each(this._default_layerdata, function (layer_id, layer_data) {
            
                var is_server_side = (typeof (layer_data.ServerSide) != "undefined") ? layer_data.ServerSide : false;
                var layer_type = layer_data.Server_Layer_Type;
                var serverside_layerName = WMS_WORKSPACE + ":" + layer_data.Layer_Reference;
                var kml_lyr = MAP_MGR.get_Layer_byName(layer_id);

                // check for a legend definition, if there is one generate the legend HTML object
                var legend_def = (typeof (layer_data.Legend) != "undefined") ? layer_data.Legend : null;
                var legend_obj = (!!legend_def)? LAYER_MGR.Generate_Legend_obj(legend_def) : null;

                // generate the legend object if there is a legend definition
                
                

                if (!!!kml_lyr) {
                    if (is_server_side) {

                        if (layer_type == "WMS") {

                            if (layer_data.Selectable) {
                                SELECTION_MANAGER.add_selectable_layer_info(layer_data.id, layer_data.LayerType, serverside_layerName);
                            }

                            // generate Map layer from layer dataa
                            var new_layer = new ol.layer.Tile({
                                visible: false,
                                name: layer_id,
                                source: new ol.source.TileWMS({
                                    //url: GEOSERVER_DATA_MGR._proxy_prefix + encodeURIComponent(MAP_MGR._WMS_URL), // DIDNT WORK TO RESOLVE MAP CANVAS EXPORT
                                    url: MAP_MGR._WMS_URL,
                                    params: {
                                        'FORMAT': 'image/png',
                                        'VERSION': '1.1.1',
                                        tiled: true,
                                        LAYERS: serverside_layerName,
                                        serverType: 'geoserver',
                                    }
                                }),
                            });


                            if(!!legend_obj) legend_obj.attr('id', '{0}_lyr_legend'.format(layer_id));

                            MAP_MGR.addLayer(new_layer, legend_obj);

                        }
                    }
                }


            });
        },
        
        get_Layer_Property_Meta: function (layerid, property, meta_field) {

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

        },

        
        get_Layer_Meta: function(layerid, meta_field) {
            // if the layer id exists in the collection return it's requested attribute
            if (Object.keys(this._default_layerdata).indexOf(layerid) > -1) {
                // if this layer has this attribute mapped return it
                if (!!this._default_layerdata[layerid][meta_field]) {
                    return this._default_layerdata[layerid][meta_field];
                }
            }
            return null;

        },
        
        Link_Layer: function(Parent_Layer_id, Child_Layer_id, Relative_z_index, legend) {
            
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

        },
        
        Unlink_Layer: function (Parent_Layer_id, Child_Layer_id) {

            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) delete this._linked_layers_meta[Parent_Layer_id][Child_Layer_id];
                MAP_MGR.removeLayer_byName(Child_Layer_id);
            }
        },
        
        show_Linked_Layer: function (Parent_Layer_id, Child_Layer_id)
        {
            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {
                    this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['visible'] = true;

                    // if there's a legend show the legend container and append it to it
                    if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['legend']) {
                        
                    }

                    MAP_MGR.show_Layer(Child_Layer_id);
                }

            }
        },

        hide_Linked_Layer: function (Parent_Layer_id, Child_Layer_id) {
            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {
                    this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['visible'] = false;

                    // if there's a legend remove it from the legend container and if it's empty hide it
                    if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['legend']) {

                    }

                    MAP_MGR.hide_Layer(Child_Layer_id);
                }

            }
        },
        
        is_visible_Linked_Layer: function (Parent_Layer_id, Child_Layer_id) {
            // ensure parameters were specified and this there is a record of this child layer for the parent layer
            if (!!Parent_Layer_id && !!Child_Layer_id && !!this._linked_layers_meta[Parent_Layer_id] && !!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {

                // if the child is already present in the collection of children update it's z-index
                if (!!this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]) {
                    return this._linked_layers_meta[Parent_Layer_id][Child_Layer_id]['visible'];
                }
            }
            return false;
        },

        // #region Layer visibility methods

            // check layers with id's associated with the passed arguments (if not enabled already)
            check_layer: function () {
                
                var args = arguments;
                for (var i = 0; i < args.length; i++) {
                    var layer_id = args[i];
                    if (!!layer_id) {
                        
                        if (!this.Layer_Enabled(layer_id)) {
                            $('#' + layer_id + "_enabler").click();
                    
                        }

                    }

                }
            },

            // uncheck layers with id's associated with the passed arguments (if not already disabled)
            uncheck_layer: function() {

                var args = arguments;
                for (var i = 0; i < args.length; i++) {
                    var layer_id = args[i];
                    if (!!layer_id) {

                        if (this.Layer_Enabled(layer_id)) {
                            $('#' + layer_id + "_enabler").click();

                        }
                    }
                }
            },

            // uncheck all layers
            uncheck_all_layers: function() {
                $.each(Object.keys(this._default_layerdata), function (i,layer_id) {
                    LAYER_MGR.uncheck_layer(layer_id);
                });
            },

            // reset visible layers to initial state
            Reset_Visible_Layers_To_Default: function () {

                // uncheck all visible layers if any
                this.uncheck_all_layers();

                // check the default layers
                this.check_layer.apply(this, this._default_enabled_layers);

            },

        // #endregion

        // #region Layer Sorting Methods

            // reset the ordering of the layers to the initial loaded state
            Reset_Ordering: function () {
                debugger;
                //var current_layer_order = 
                
            },

            // after any sorting takes place update the layer draw order on the map by setting layer z-indexes
            Update_Layer_Draw_Order: function() {

                // grab the listing of layer entries (in reverse so 'Higher' items in the listing will be over lower items)
                var layer_entries = $('.layer_entry').get().reverse(); 
                

                var drawn = 0; // keep a count of drawn for linked layers

                $.each(layer_entries, function (index, layer_entry) {
                    var layer_id = $(layer_entry).attr('id');

                    //var z_index = LAYER_MGR._start_z_index + layer_count - index;
                    var z_index = LAYER_MGR._start_z_index + drawn;
                    MAP_MGR.get_Layer_byName(layer_id).setZIndex(z_index);

                    drawn++;

                    // check for any linked layers for the current layer
                    if (!!LAYER_MGR._linked_layers_meta[layer_id]) {
                        
                        // if so set the z-index for it's linked layers to the specified relative z-index
                        $.each(LAYER_MGR._linked_layers_meta[layer_id], function (child_id, child_meta) {
                            if (child_meta['visible']) {
                                MAP_MGR.get_Layer_byName(child_id).setZIndex(z_index + child_meta['Relative_Z_index']);
                                drawn++;
                            }
                            
                        });

                    }


                });


            },
    
        // #endregion 
    
    // #endregion


}




// COLOR Helper functions
// Manager for some common tasks with color manipulation
var COLOR_MGR = {

    // custom color object for use in calculations
    Color: function (_r, _g, _b) {
        var r, g, b;
        var setColors = function (_r, _g, _b) {
            r = _r;
            g = _g;
            b = _b;
        };
        setColors(_r, _g, _b);

        this.getColors = function () {
            var colors = { r: r, g: g, b: b };
            return colors;
        };

        this.toRGB = function () {
            return "rgb(" + r + "," + g + "," + b + ")";
        }


        this.toRGBA = function (opacity) {
            return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
        }

    },

    // method to interpolate colors between 2 colors 
    // given a start value, end value, number of steps, and current step count
    Interpolate: function (start, end, steps, count) {
        var s = start,
            e = end,
            final = s + (((e - s) / steps) * count);
        return Math.floor(final);
    },

    // method to keep the color numbers within the range of 0-255
    // 
    colorBoundsInt: function (num) {
        if (num <= 0) return 00;
        else if (num >= 255) return 255;
        else return parseInt(num);
    },

    // method to return a 0-padded string representation of a number
    // of length 'length'
    pad: function (number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;

    },

    // method to convert r,g,b values to a hex representation
    RGB_to_HEX: function (r, g, b) {
        return "#" + this.pad(this.colorBoundsInt(r).toString(16), 2) + this.pad(this.colorBoundsInt(g).toString(16), 2) + this.pad(this.colorBoundsInt(b).toString(16), 2);

    },

    // method to convert hex value to rgb values
    HEX_to_RGB: function (hex_val) {

        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = hex_val.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new this.Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)) : null;

    },

    // method to return an array of interpolated colors between 3 colors
    //  a start color, middle stop, and stop color
    //      defaults to start=blue, mid=yellow, stop=red
    Color_Range: function (color_count, start_color, mid_color, stop_Color) {

        var color_collection = [];

        if (!!!start_color) start_color = new this.Color(28, 117, 187);
        if (!!!mid_color) mid_color = new this.Color(225, 255, 0);
        if (!!!stop_Color) stop_Color = new this.Color(255, 0, 0);


        var start = start_color;
        var end = mid_color;

        for (var i = 0; i < color_count; i++) {
            var val = i / (color_count - 1) * 100;

            if (val > 50) {
                start = mid_color;
                end = stop_Color;
                val = val % 51;
            }
            var startColors = start.getColors(),
                endColors = end.getColors();
            var r = this.Interpolate(startColors.r, endColors.r, 50, val);
            var g = this.Interpolate(startColors.g, endColors.g, 50, val);
            var b = this.Interpolate(startColors.b, endColors.b, 50, val);

            var hexVal = this.RGB_to_HEX(r, g, b);
            color_collection.push(hexVal);

        }

        return color_collection;

    }

}


// a manager to handle multiple charts in a single container
//  storing chart options and update methods for each named chart
//  and providing the ability to store an update method for each chart with it's own parameters
var HIGHCHARTS_MGR = {
    _chart_container_selector: "",
    _chart_container: "",
    _chart: null,

    _registered_chart_containers: {},

    _Highcharts_Default_Settings: {
        lang: { thousandsSep: ',' },// place commas for thousands separator (used when displaying tooltips)
    },

    _default_chart_options: {

        credits: {
            enabled: false
        },
        chart: {
            width: 600,
            height: 400,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }
    },

    _chart_collection: {},

    init: function () {
        Highcharts.setOptions(this._Highcharts_Default_Settings);

        //this._chart_container_selector = container_selector;
        //this._chart_container = $(container_selector);

        //this._chart = this._chart_container.highcharts(this._default_chart_options);


    },

    is_Registered_Chart_Container: function (container_selector) {
        return !!this._registered_chart_containers[container_selector];
    },

    Register_Chart_Container: function (container_selector) {
        if (!!container_selector) {
            this._registered_chart_containers[container_selector] = {
                selector: container_selector,
                chart_container: $(container_selector),
                chart: $(container_selector).highcharts(this._default_chart_options),
            }
        }
    },

    Add_Chart_Def: function (chart_name, options, update_fn) {

        if (!!chart_name && !!options) {
            this._chart_collection[chart_name] = {};
            this._chart_collection[chart_name].options = options;
            this._chart_collection[chart_name].update = update_fn;

        }

    },

    // get the stored items for a specified chart, by name
    Get_Chart: function (chart_name) {
        return this._chart_collection[chart_name];
    },

    // Update the options of the current highchart, to the options stored under the passed chart name,
    //      and redraw 
    Draw_Chart: function (Chart_container, Chart_name) {
        
        var requested_chart = this.Get_Chart(Chart_name);
        if (this.is_Registered_Chart_Container(Chart_container) && !!requested_chart) {

            // recursivly merge the chart options with the default 
            var merged_options = {};
            $.extend(true, merged_options, this._default_chart_options, requested_chart.options);

            this._registered_chart_containers[Chart_container].chart.highcharts(merged_options);
            //this._chart.highcharts(merged_options);
        }
    }

}

// #region ON PAGE LOAD

$(document).ready(function () {

    //MAP_MGR.register_child_plugin(HIGHCHARTS_MGR.init);
    //MAP_MGR.Init_Map();
    MAP_MGR.Resize()

});

//#endregion
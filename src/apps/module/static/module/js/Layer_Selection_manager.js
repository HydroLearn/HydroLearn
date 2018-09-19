/*
    TODO: remove raw dependencies for
    - GEOSERVER_DATA_MGR
    - map_mgr
    - layer_mgr
    - spinner_mgr

*/

var SELECTION_MANAGER = function(){

    /* -----------------------------------------
        SELECTION_MANAGER Properties
    -----------------------------------------*/
        this.WMS_URL = "";
        this._selected_feature_ids = []; // parallel lists for HUCs and their associated Feature ID's in WMS
        this.selection_enabled = false;
        this._style_layers = {
            "shape": 'Polygon_Selected_Styling',
            "line": 'Line_Selected_Styling',
            "point": 'Point_Selected_Styling',
        };

        this._active_selection_layer_ID = '';
        this._active_source_params = null;
        this._Selectable_Layer_Info = {};

        this.SELECTION_LAYER_SOURCE = null;
        this.SELECTION_LAYER_SOURCE_PARAMS = {
            'FORMAT': 'image/png',
            'VERSION': '1.1.1',
            serverType: 'geoserver',
            STYLES: "",



        };

        // SELECT WMS LAYER
        this.SELECTION_LAYER = null;
        this.SELECTION_DIALOG = null;


    /* -----------------------------------------
        Preform initialization on declaration of a new instance
    -----------------------------------------*/
        //var selection_toggle_nexus_control = MAP_MGR.Create_Control("Toggle Additional Feature Info Selection", '<img id="Selection_Toggle_img" src="/Content/images/icons/infoIcon_white.png" />', this._toggle_info_selection);
        //MAP_MGR.Add_Control(selection_toggle_nexus_control);
        if (typeof (WMS_URL) != "undefined") this.WMS_URL = WMS_URL


        // create the selection dialog for displaying the feature query result
        this.SELECTION_DIALOG = $('#Selection_Info_Dialog').dialog({
            autoOpen: false,
            draggable: true,
            modal: false,
            resizable: true,
            resize: 'auto',
            resizeStop: this.info_dialog_resize_evt,

        });


        // set close event
        this.SELECTION_DIALOG.on('dialogclose', this.info_dialog_close_evt);
        this.SELECTION_DIALOG.on('dialogopen', this.info_dialog_open_evt);

    // update the layer source
    //this.update_SELECTION_LAYER_SOURCE();




}

/* -----------------------------------------
    Selection manager public methods
-----------------------------------------*/

    SELECTION_MANAGER.prototype.clear_selection = function () {
            this.close_info_dialog();
            this._selected_feature_ids = [];
            this.update_SELECTION_LAYER_SOURCE();
        }

    SELECTION_MANAGER.prototype.set_active_selection_layer = function (selected_layer_ID) {

            // remove any existing selection layer
            this.REMOVE_SELECTION_LAYER_FROM_MAP();

            if (!!this._Selectable_Layer_Info[selected_layer_ID]) {

                //clear any existing selections/close the dialog
                this.close_info_dialog();

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
        }

    SELECTION_MANAGER.prototype.add_selectable_layer_info = function (Layer_ID, Layer_Type, Layer_Ref) {
            if (!!Layer_ID && !!Layer_Ref && !!Layer_Type) {
                this._Selectable_Layer_Info[Layer_ID] = { "Layer_Ref": Layer_Ref, 'Layer_Type': Layer_Type };
            }
        }


/* -----------------------------------------
    Selection manager internals
-----------------------------------------*/

    // TODO: this method gets called manually several times in Layer_Manager,
    //          but seemingly can be integrated into another method to remove
    //          this requirement
    //          (activates cursor, and sets 'this.selection_enabled')
    SELECTION_MANAGER.prototype._toggle_info_selection = function (optional_manual_setting) {

        if (typeof (optional_manual_setting) != "undefined") {
            this.toggle_feature_selection_enabled(optional_manual_setting);
        } else {
            this.toggle_feature_selection_enabled();
        }

        if (this.selection_enabled) {
            $('.ol-viewport').css('cursor', 'help');
            $("#Selection_Toggle_img").closest('button').css('background-color', 'rgba(255,157,0,.5)');
        } else {
            $('.ol-viewport').css('cursor', 'default');
            $("#Selection_Toggle_img").closest('button').css('background-color', 'rgba(0,60,137,.5)');
        }
    }

    SELECTION_MANAGER.prototype.update_SELECTION_LAYER_SOURCE = function () {

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

    }

    SELECTION_MANAGER.prototype.ADD_SELECTION_LAYER_TO_MAP = function () {

        MAP_MGR.add_layer(this.SELECTION_LAYER);
        this.SELECTION_LAYER.setZIndex(1000);  // ensure selection layer is always on top
        MAP_MGR._Map.on('singleclick', this.Feature_selection_event);

    }

    SELECTION_MANAGER.prototype.REMOVE_SELECTION_LAYER_FROM_MAP = function() {
        if (this.SELECTION_LAYER != null) {

            MAP_MGR.remove_layer("SELECTION_LAYER");
            this.SELECTION_LAYER = null;
            this.SELECTION_LAYER_SOURCE = null;

            this._active_source_params = null;
            this._active_selection_layer_ID = '';
        }
    }

    SELECTION_MANAGER.prototype.toggle_feature_selection_enabled = function (optional_manual_setting) {

        if (typeof (optional_manual_setting) != "undefined") {
            this.selection_enabled = optional_manual_setting;
        } else {
            this.selection_enabled = !this.selection_enabled;
        }
    }

    SELECTION_MANAGER.prototype.Feature_selection_event = function (evt) {

        if (this.selection_enabled && !! this.get_active_layer_id()) {


            var map = MAP_MGR._Map;
            var view = map.getView();
            var viewResolution = view.getResolution();
            var curr_layer = this.get_active_layer_id();
            var source = MAP_MGR.get_layer(curr_layer).getSource();
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
                            this.clear_selection();

                            var feature_id = result[0].getId();

                            // if the feature information has not already been loaded, register a query to load the feature values
                            // once loaded populate the feature detail dialog
                            if (!GEOSERVER_DATA_MGR._is_Feature_Loaded(curr_layer, feature_id)) {
                                SPINNER_MGR.Register_Query(
                                    GEOSERVER_DATA_MGR._Load_Feature_Values(curr_layer, feature_id),
                                    this.Populate_Feature_Details_Dialog, [curr_layer, feature_id], '#map');

                            } else {
                                this.Populate_Feature_Details_Dialog(null, curr_layer, feature_id);
                            }




                        }
                    },null,'#map');

            }
        }
    }

    SELECTION_MANAGER.prototype.Populate_Feature_Details_Dialog = function(ajax_return, layer_id, feature_id) {

        var feature_properties = GEOSERVER_DATA_MGR.get_Feature_data(layer_id, feature_id);
        var requested_properties = LAYER_MGR.get_Layer_Property_Meta(layer_id);
        var alternate_color = false;

        //for (var i = 0, ii = result.length; i < ii; ++i) {
            this.toggle_selection(feature_id);
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

        this.display_info_dialog(feature_popup_content);

    }

    SELECTION_MANAGER.prototype.display_info_dialog = function (content) {
        this.SELECTION_DIALOG.find(".content").html(content);
        this.SELECTION_DIALOG.find(".content").scrollTop(0);

        if (VIEWPORT_MGR.Current_View() != 'Map') {

            MAP_MGR.Register_on_reopen_event(function() {
                this.SELECTION_DIALOG.dialog("open");
                this.SELECTION_LAYER.setVisible(true);
            });

        } else {
            this.SELECTION_DIALOG.dialog("open");
        }




        $('.ui-dialog :button').blur();
    }

    SELECTION_MANAGER.prototype.close_info_dialog = function () {
        this.SELECTION_DIALOG.dialog("close");
        //$('#Selection_Info_Dialog').dialog("open");
    }

    SELECTION_MANAGER.prototype.info_dialog_resize_evt = function (event, ui) {
        $(this).height($(this).parent().height() - $(this).prev('.ui-dialog-titlebar').height() - 34);
        $(this).width($(this).prev('.ui-dialog-titlebar').width() + 2);
    }

    SELECTION_MANAGER.prototype.info_dialog_close_evt = function (event, ui) {
        //SELECTION_MANAGER.clear_selection();
        if (!!this.SELECTION_LAYER) this.SELECTION_LAYER.setVisible(false);


    }

    SELECTION_MANAGER.prototype.info_dialog_open_evt = function (event, ui) {
        //SELECTION_MANAGER.clear_selection();
        if (!!this.SELECTION_LAYER) this.SELECTION_LAYER.setVisible(true);
    }

    SELECTION_MANAGER.prototype.total_selected = function () {
        return this._selected_feature_ids.length;

    }

    SELECTION_MANAGER.prototype.find_by_Feature_ID = function (Feature_id) {
        return this._selected_feature_ids.indexOf(Feature_id);

    }

    SELECTION_MANAGER.prototype.remove_by_Feature_ID = function (Feature_id) {
        var index = this.find_by_Feature_ID(Feature_id);
        if (index != -1) {
            this._selected_feature_ids.splice(index, 1);
        }
    }


    SELECTION_MANAGER.prototype.toggle_selection = function (feature_id) {
        if (!!feature_id) {

            this._selected_feature_ids.push(feature_id);
            // was SELECTION_MANAGER.update_SELECTION_LAYER_SOURCE();
            this.update_SELECTION_LAYER_SOURCE();

        }
    }

    // helper methods

    // get selected Feature_IDs as a comma separated string of values
    SELECTION_MANAGER.prototype.get_Feature_IDs_string = function () {
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
    }

    SELECTION_MANAGER.prototype.get_active_layer_id = function () {
        return this._active_selection_layer_ID;

    }

    SELECTION_MANAGER.prototype.get_Layer_Ref = function (Layer_ID) {
        // if no layer was specified use the current active layer
        var layer_id = (!!Layer_ID) ? Layer_ID : this._active_selection_layer_ID;
        return (!!this._Selectable_Layer_Info[layer_id]) ? this._Selectable_Layer_Info[layer_id].Layer_Ref : null;
    }

    SELECTION_MANAGER.prototype.get_Layer_Type = function (Layer_ID) {
        var layer_id = (!!Layer_ID) ? Layer_ID : this._active_selection_layer_ID;
        return (!!this._Selectable_Layer_Info[layer_id]) ? this._Selectable_Layer_Info[layer_id].Layer_Type : null;
    }



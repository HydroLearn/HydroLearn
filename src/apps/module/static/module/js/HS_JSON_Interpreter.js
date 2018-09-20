// introduce a interpreter for hydroshare map definitions
//      reads JSON objects provided by HydroShare defining
//      OpenLayers map settings and layer information
//      and provides various methods for utilizing that data
//      in other Javascript modules
//
//      allows for generalization of data useage from HS map resources
//
//      Expected to be consumed by a MAP_MGR instance

/*
    // Sample instantiation loading directly from a 'mapProject.json'
    // file produced by HydroShare_GIS
    //
    layer_data = new HS_resource({
                    "map": {
                        "layers":
                        {
                            "Utah DEM":
                            {
                                "geomType": "None",
                                "bandInfo": {
                                    "max": 3573.57666016,
                                    "nd": -3.40282346639e+38,
                                    "min": 1280.28942871
                                },

                                "displayName": "Utah DEM",
                                "index": 3,
                                "listOrder": 1,
                                "resType": "RasterResource",
                                "extents": [-12469642.181853892, 4865062.947402067, -12356263.595049797, 5013229.486534236],
                                "visible": true,
                                "cssStyles": {"color-map": {"3573.57666016": {"color": "#ffffff","opacity": "1"},"1280.28942871": {"color": "#fa0000","opacity": "1"},"-3.40282346639e+38": {"color": "#000000","opacity": "0"}},"method": "ramp"},
                                "hsResId": "e3721f22fae84468a08528b0646ebdb7",
                                "attributes": "None",
                                "hide255": true,
                                "id": "hydroshare_gis:gis_e3721f22fae84468a08528b0646ebdb7"
                            },

                            "Utah DEM 2":
                            {
                                "geomType": "None",
                                "bandInfo": {
                                    "max": 3573.57666016,
                                    "nd": -3.40282346639e+38,
                                    "min": 1280.28942871
                                },

                                "displayName": "Utah DEM 2",
                                "index": 3,
                                "listOrder": 1,
                                "resType": "RasterResource",
                                "extents": [-12469642.181853892, 4865062.947402067, -12356263.595049797, 5013229.486534236],
                                "visible": true,
                                "cssStyles": {"color-map": {"3573.57666016": {"color": "#ffffff","opacity": "1"},"1280.28942871": {"color": "#00fa00","opacity": "1"},"-3.40282346639e+38": {"color": "#000000","opacity": "0"}},"method": "ramp"},
                                "hsResId": "e3721f22fae84468a08528b0646ebdb7",
                                "attributes": "None",
                                "hide255": true,
                                "id": "hydroshare_gis:gis_e3721f22fae84468a08528b0646ebdb7"
                            },

                            "Logan River Stream Network": {

                                "geomType":"line",
                                "bandInfo":"None",
                                "displayName":"Logan River Stream Network",
                                "index":3,
                                "listOrder":2,
                                "resType":"GeographicFeatureResource",
                                "extents":[-12444895.349315424,5121273.925103564,-12410023.520253958,5171316.917336041],
                                "visible":true,
                                "cssStyles":{"stroke":"#ff0000","stroke-opacity":"1","stroke-width":"1","labels":false},
                                "hsResId":"93f49ab913fd4c639c98ab4a070d20e0",
                                "attributes":"LINKNO,DSLINKNO,USLINKNO1,USLINKNO2,DSNODEID,Order,Length,Magnitude,DSContArea,Drop,Slope,StraightL,USContArea,WSNO,DOUTEND,DOUTSTART,DOUTMID",
                                "hide255":false,
                                "id":"hydroshare_gis:gis_93f49ab913fd4c639c98ab4a070d20e0"
                            },
                        },
                        "center": [-12424991.82181197, 4942723.997032638],
                        "zoomLevel": 9,
                        "showInset": true,
                        "baseMap": "Aerial",
                        "geoserverUrl": "https://apps.hydroshare.org/geoserver"
                    },
                    "resId": "cbde6e16601141949fec55d98f92be72"
                })

*/

function HS_Layer(wms_url, Layer_ID, HS_Resource_config){

    // map resource config to expected layer config

    var layer_config = {
        //'id' :  HS_Resource_config.id,
        //'id' :  "layer"+(counter++).toString(),
        //'id': Layer_ID,
        'resource_id' :  HS_Resource_config.id,
        'display_name' : HS_Resource_config.displayName,
        'resource_type' : HS_Resource_config.resType,
        'geometry_type' : (HS_Resource_config.geomType == "None" && HS_Resource_config.resType == "RasterResource")? 'raster' : HS_Resource_config.geomType,
        'extents' : HS_Resource_config.extents,
        'style' : HS_Resource_config.cssStyles,
        //'layer_params' : HS_Resource_config.,
        'wms_url' : wms_url,
        'visible': HS_Resource_config.visible,

        // expected to be a csv string of attribute names
        'attributes': (typeof(HS_Resource_config.attributes) != "undefined" && HS_Resource_config.attributes != "None")? HS_Resource_config.attributes.split(','): null,
    }



    // provide mapped configuration to parent 'Layer' constructor
    Layer.call(this, layer_config);



}

HS_Layer.prototype = Object.create(Layer.prototype)

//  overwrite the get_ol_layer method to return the correct settings
//  for a hydroshare layer
HS_Layer.prototype.get_OL_layer = function(){

//    if(this.resource_type == "GenericResource"){
//        return new ol.layer.Vector({
//                source: new ol.source.Vector({
//                    features: [new ol.Feature(new ol.geom.Point(this.extent))]
//                }),
//                style: new ol.style.Style({
//                    image: new ol.style.Circle({
//                        radius: 6,
//                        fill: new ol.style.Fill({
//                            color: getRandomColor()
//                        })
//                    })
//                }),
//                visible: visible
//            });
//    }else

    var layer_params = {
                'LAYERS': this.resource_id,
                'TILED': true,
            }

    if(this.style != "Default"){
        layer_params['SLD_BODY'] = SLD_TEMPLATES.getSldString(
                        this.style,
                        (this.geometry_type == "raster")? "None": this.geometry_type,
                        this.resource_id,
                        true
                    )
    }

    return new ol.layer.Tile({
        //name: this.display_name,
        name: this.id,
        extent: this.extents,
        source: new ol.source.TileWMS({
            url: this.wms_url,
            params: layer_params,
            serverType: "geoserver",
            crossOrigin: "Anonomous",
        }),
        visible: this.visible,
    })
}

//HS_Layer.prototype.getStyle = function(){
//    return "custom getStyle"
//}

var HS_resource = (function(HS_Resource_Object) {
    "use strict";

        // layer config object definition

    /* ---------------------------
         private variables
    --------------------------- */
    var _data_loaded = false;
    var _data;
    var _map_config = {}

    // collection of layer configs (probably keep as dict similar to the JSON, for easy lookup)
    var _layers = []

    /* ---------------------------
         private methods
    --------------------------- */
    function init(JSON_Resource){

        // TODO: should probably add in checks to verify that this is a valid resource here
        //      also potentially need to do 'JSON.parse(JSON_Resource)'
        _data = JSON_Resource;

        _map_config.center = _data.map.center;
        _map_config.geoserverUrl = _data.map.geoserverUrl + '/wms';
        _map_config.zoom = _data.map.zoomLevel;

        // not sure if these are needed
        //_map_config.showInset = _data.map.showInset;
        //_map_config.baseMap = _data.map.baseMap;

        // Technically this isn't a map configuration, but not sure how else to handle it
        //_map_config.resId = _data.resId;

        collect_layers(_data.map.layers)

        _data_loaded = true;
    }

    function collect_layers(layers){
        // generate collection of layers for internal storage/manupulation
        // layers[lyr_id]( new Layer({config object}))

        $.each(layers, function(layer_id, config){
            //_layers[layer_id] = new HS_Layer(_map_config.geoserverUrl, layer_id, config)
            var new_layer = new HS_Layer(_map_config.geoserverUrl, layer_id, config)


            new_layer.meta.filterable = false;
            new_layer.meta.selectable = false;
            new_layer.meta.classifiable = false;

            _layers.push(new_layer)
        })

    }

    function wms_url(){
        return _map_config.geoserverUrl + '/wms'
    }



    /* ---------------------------------------
                Perform operations
    --------------------------------------- */
    init(HS_Resource_Object)


    /* ---------------------------
         return an object exposing public properties and methods
    --------------------------- */
    return {
        //data: _data,

        // return the specified map config for this resource
        map_config: _map_config,

        // return the layers collection for this resource
        layers: _layers,

        wms_url: wms_url(),
    }

});


// Example Usage:
//    var a = new HS_resource({'first':0,'One':1})
//    var b = new HS_resource({'second':0,'One':1})
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
// WMS_WORKSPACE = null;

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

// Reimplementing Legacy functions from OL2 for compatability of newer modules with existing system
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




$(document).ready(function () {

    //MAP_MGR.register_child_plugin(HIGHCHARTS_MGR.init);
    //MAP_MGR.Init_Map();
    //MAP_MGR.Resize()

});

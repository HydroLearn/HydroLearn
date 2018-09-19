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
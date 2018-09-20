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
        MAP_MGR.show_layer(layer_id);

        var enabler = INTERACTIVE_DIALOG_MGR._generated_dialogs[layer_id].find('.base_layer_enabler');
        var parent_label = enabler.closest('label.layer_control_input');

        // add necessary actions to highlight the root layer toggle
        enabler.prop('checked', true);
        parent_label.addClass('selected');
    },

    hide_base_layer: function (layer_id) {
        MAP_MGR.hide_layer(layer_id);

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
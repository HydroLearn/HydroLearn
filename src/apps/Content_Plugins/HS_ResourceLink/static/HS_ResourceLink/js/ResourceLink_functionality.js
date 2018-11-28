$(window).on('load',function(){
    /*
    * This process should do one of two things:
    *
    *  - do as it's currently implemented and generate
    *    the inputs for the user to load another dialog
    *    to browse for a specific hydroshare resource.
    *    Additionally, this should pass the required
    *    data to the hidden fields upon selection.
    *
    * - Alternatively, replace the 'Browse' button with
    *   the hydroshare listing itself within the form,
    *   via a jquery.load and upon selection tie an event
    *   to the field update method below.
    *
    */

    // generate button to trigger loading of hs dialog
    var hs_button = $(document.createElement('button'))
    $(hs_button).attr('id','HS_Browse_btn');
    $(hs_button).text('Browse HydroShare')

    // add a new wrapper to the form for a selected HS resource
    var hs_res_wrapper = $(document.createElement('div'))
    hs_res_wrapper.attr('id', 'hs_res_wrapper')

    // define the id's used by the extra
    // representations for later use
    var type_input_id = 'HS_res_type_rep';
    var link_input_id = 'HS_res_link_rep';

    // generate selected type representation/label
    var type_rep_label = $(document.createElement('label'))
    type_rep_label.attr('for',type_input_id)
    type_rep_label.text('Resource Type')

    var type_rep = $(document.createElement('div'))
    $(type_rep).attr('id',type_input_id);
    $(type_rep).text('None Selected');

    // generate selected link representation/label
    var link_rep_label = $(document.createElement('label'))
    link_rep_label.attr('for',link_input_id)
    link_rep_label.text('Resource Link')

    var link_rep = $(document.createElement('div'))
    $(link_rep).attr('id',link_input_id);
    $(link_rep).text('None Selected');

    // add the labels/representations to the hs_res_wrapper
    hs_res_wrapper.append(type_rep_label)
    hs_res_wrapper.append(type_rep)
    hs_res_wrapper.append(link_rep_label)
    hs_res_wrapper.append(link_rep)

    function update_field_values(resource_type, resource_link){
        $('input[data-field-name="resource_type"]').val(resource_type)
        $('input[data-field-name="resource_link"]').val(resource_link)

        $('#HS_res_type_rep').html(resource_type)
        $('#HS_res_link_rep').html(resource_link)
    }

    $(hs_button).click(function(evt){
        evt.preventDefault();
        debugger;

        alert('Listing required for adding HydroShare Resources. Please check back later.');

        // at this point a dialog for browsing hydroshare resources
        // should load, and upon making a selection call:

        //  update_field_values(SELECTED_TYPE, SELECTED_LINK);

        // which will update the hidden fields with the
        // values selected

    });


    $('#content-main').append(hs_res_wrapper);
    $('#content-main').append(hs_button);

})
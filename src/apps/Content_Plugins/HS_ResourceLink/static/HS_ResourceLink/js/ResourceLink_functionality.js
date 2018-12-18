$("div.dataTables_filter input").keyup( function (e) {
    if (e.keyCode == 13) {
        oTable.fnFilter( this.value );
    }
});

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

    // creating type filter drop down
    var type_filter = $(document.createElement('select'));
    $(type_filter).attr('id', 'type-filter');
    var options = ['All','Generic', 'Composite', 'Raster', 'HIS References Time Series', 'Time Series', 'Multidimentional', 'Model Program', 'Model Instance', 'Web App', 'SWAT Model Instance', 'Geographic Feature', 'Script Resource'];
    var options_values = ['All', 'GenericResource', 'CompositeResource', 'RasterResource', 'RefTimeSeriesResource', 'TimeSeriesResource', 'NetcdfResource', 'ModelProgramResource', 'ModelInstanceResource', 'ToolResource', 'SWATModelInstanceResource', 'GeographicFeatureResource', 'ScriptResource'];
    var filter_content;
    for (i=0; i < options.length; i++){
        let option = '<option value="' + options_values[i] + '">' + options[i] + '</option>';
        filter_content = filter_content + option;
    }
    $(type_filter).html('<span>Type Filter: </span>' + filter_content);

    var modelList;

    var generateModelList = function (numRequests) {
        $.ajax({
            type: 'GET',
            url: '/manage/hsreslist',
            dataType: 'json',
            error: function () {
                console.log('error');
                //showError();
            },
            success: function (response) {
                if (response.hasOwnProperty('success')) {
                    if (!response.success) {
                        //$modelRep.html('<div class="error">' + response.message + '</div>');
                        console.log('error');
                    }
                    else if (response.hasOwnProperty('model_list')) {
                        buildModelRepTable(response.model_list);
                    }
                    else
                    {
                        //showError();
                    }
                }
                else
                {
                    //showError();
                }
            }
        });
    }

    let buildModelRepTable = function (modelList) {
        console.log(modelList);
        let modelTableHtml;

        modelList = typeof modelList === 'string' ? JSON.parse(modelList) : modelList;
        modelTableHtml = '<table id="tbl-models"><thead><th></th><th>Title</th><th>Type</th><th>Info</th><th>Owner</th></thead><tbody>';

        modelList.forEach(function (model) {

            modelTableHtml += '<tr>' +
                '<td><input type="radio" name="model" class="rdo-model" value="' + model.resource_id + '"></td>' +
                '<td class="model_title">' + model.resource_title + '</td>' +
                '<td class="model_subjects">' + model.resource_type + '</td>'; // +
                //'<td class="model_subjects">' + model.resource_id + '</td>';

            let modelInfoHtml = "";

            if (model.public === true) {
                modelInfoHtml += '<img src="/static/manage/images/hydroshare/public.png" data-toggle="tooltip" data-placement="right" title="Public">';
            }
            else {
                modelInfoHtml += '<img src="/static/manage/images/hydroshare/private.png" data-toggle="tooltip" data-placement="right" title="Private">';
            }

            modelTableHtml += '<td class="model_info">' + modelInfoHtml + '</td>' +
                '<td class="model_owner">' + model.creator + '</td>' +
                '</tr>';
        });

        modelTableHtml += '</tbody></table>';
        container.html(modelTableHtml);


        container.append($btn);
        addListenersToModelRepTable();
        dataTableLoadModels = $('#tbl-models').DataTable({
            'order': [[1, 'asc']],
            'columnDefs': [{
                'orderable': false,
                'targets': 0
            }],
            "scrollY": '500px',
            "scrollCollapse": true,
            //"bFilter": true,
            fixedHeader: {
                header: true,
                footer: true
            }
        });
        
        // search bar only searches on enter key press
        $('div.dataTables_filter input').unbind();
        $('div.dataTables_filter input').bind('keyup', function(e) {
            if(e.keyCode == 13) {
                //resid = null;
                let keyword = $(this).val();
                console.log(keyword);
                $.ajax({
                    type: 'GET',
                    url: '/manage/hsreslist/?keyword=' + keyword + '&type=' + $("#type-filter").val(),
                    dataType: 'json',
                    error: function () {
                        //showError();
                        console.log('To err is human');
                    },
                    success: function (response) {
                        buildModelRepTable(response.model_list);
                    }
                });
            }
        });
    };

    addListenersToModelRepTable = function () {
        container.find('tbody tr').on('click', function (evt) {

            $(this)
                .dblclick(function (evt) {
                    evt.stopImmediatePropagation();
                })
                .css({
                    'background-color': '#1abc9c',
                    'color': 'white'
                })
                .find('input').prop('checked', true);
            $('tr').not($(this)).css({
                'background-color': '',
                'color': ''
            });

             let modelId = $('.rdo-model:checked').val();
             console.log('ID: ' + modelId);
             $.ajax({
                type: 'GET',
                url: '/manage/hsreslist/?resid=' + modelId,
                //dataType: 'json',
                //data: {"resid": resid},
                error: function () {
                    //showError();
                },
                success: function (response) {
                    if (response.hasOwnProperty('success')) {
                        if (!response.success) {
                            //showError();
                        }
                        else if (response.hasOwnProperty('file_list')) {
                            resource_type = $("#type-filter").val();
                            resource_link = 'https://www.hydroshare.org/resource/' + modelId;
                            update_field_values(resource_type, resource_link)
                        }
                        else
                        {
                            //showError();
                        }
                    }
                    else
                    {
                        //showError();
                    }
                }
            });
        });

    };

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

    //add container
    var container = $(document.createElement('div'));
    $(container).attr('id', 'container');
    generateModelList();



    function update_field_values(resource_type, resource_link){
        // Populate fields
        $("#id_resource_type").attr('value',resource_type);
        $("#id_resource_link").attr('value',resource_link)


        $('#HS_res_type_rep').html(resource_type)
        $('#HS_res_link_rep').html(resource_link)
    }


    $('#content-main').append(hs_res_wrapper);
    $('#content-main').append('<br><span><b>Type Filter: <b></span>')
    $('#content-main').append(type_filter);
    $('#content-main').append(container);

});
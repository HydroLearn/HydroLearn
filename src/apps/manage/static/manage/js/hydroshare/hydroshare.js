// adopted from https://github.com/tylorbayer/tethysapp-epanet_model_repository/blob/master/tethysapp/epanet_model_repository/public/js/main.js
$("div.dataTables_filter input").keyup( function (e) {
    if (e.keyCode == 13) {
        oTable.fnFilter( this.value );
    }
});

/* May want to use this later
$('#hydroshare-modal').on('hidden.bs.modal', function () {
    //Keep in case I need to perform an action
});
*/

$(document).ready(function(){

    // functions
    let generateModelList,
        buildModelRepTable,
        addListenersToModelRepTable,
        showError;

    // var
    let $modelRep;

    $modelRep = $('#model-rep');
    console.log($modelRep);
//
    showError = function($modelRep) {
        $modelRep.html('<div class="error">An unexpected error was encountered while attempting to load models.</div>');
    };

    generateModelList = function (numRequests) {
        $.ajax({
            type: 'GET',
            url: 'hsreslist/',
            dataType: 'json',
            error: function () {
                showError();
            },
            success: function (response) {
                if (response.hasOwnProperty('success')) {
                    if (!response.success) {
                        $modelRep.html('<div class="error">' + response.message + '</div>');
                    }
                    else if (response.hasOwnProperty('model_list')) {
                        buildModelRepTable(response.model_list);
                        console.log(response.model_list);
                    }
                    else
                    {
                        showError();
                    }
                }
                else
                {
                    showError();
                }
            }
        });
    };


    buildModelRepTable = function (modelList) {

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
        $modelRep.html(modelTableHtml);

         var $btn = $('<button/>', {
                type: 'button',
                text: 'Add Resource',
                id: 'btn_refresh',
                click: function (){
                    let resid = $('.rdo-model:checked').val();
                    if (resid != null) {
                        $.ajax({
                            type: 'GET',
                            url: 'hsreslist/?resid=' + resid,
                            //dataType: 'json',
                            //data: {"resid": resid},
                            error: function () {
                                showError();
                            },
                            success: function (response) {
                                if (response.hasOwnProperty('success')) {
                                    if (!response.success) {
                                        showError();
                                    }
                                    else if (response.hasOwnProperty('file_list')) {
                                        console.log(response.file_list);
                                        console.log('map_jason_url: ' + response.json_url);
                                    }
                                    else
                                    {
                                        showError();
                                    }
                                }
                                else
                                {
                                    showError();
                                }
                            }
                        });
                    }
                    else {
                            console.log('No Resource Selected');
                    }
                }
         });

        $modelRep.append($btn);
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
                    url: 'hsreslist/?keyword=' + keyword + '&type=' + $("#type_dropdown").val(),
                    dataType: 'json',
                    error: function () {
                        //showError();
                        console.log('To err is human');
                    },
                    success: function (response) {
                        console.log(response);
                        buildModelRepTable(response.model_list);
                    }
                });
            }
        });
    };

    addListenersToModelRepTable = function () {
        $modelRep.find('tbody tr').on('click', function (evt) {

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
        });

        $('[data-toggle="tooltip"]').tooltip();
    };
    generateModelList();
    $('tbl-models').dataTable({searching: false, paging: false, info: false});
});

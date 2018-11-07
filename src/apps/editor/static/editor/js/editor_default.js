// document ready override to run various tasks that are expected to be completed once the landing page has been loaded
$(document).ready(function() {


    // initialize the dialog box used when confirming navigating away from a page (used for quiz sections)
    $("#lesson-nav-denied-dialog").dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        resizable: false,
        width: '450px',
        open: function() {
                place_dialog_center($(this));
            }
    });

    $('#lesson-nav-denied-confirm').click(function(){
        $('#lesson-nav-denied-dialog').dialog('close')
    })

    // initialize the dialog box used when confirming navigating away from a page (used for quiz sections)
    $("#delete-confirmation-dialog").dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        resizable: false,
        width: '450px',
        open: function() {
                place_dialog_center($(this));
            }
    });

    $('#delete-confirmation-cancel').click(function(){
        $('#delete-confirmation-dialog').dialog('close')
    })

//    $('#lesson-nav-denied-confirm').click(function(){
//        $('#lesson-nav-denied-dialog').dialog('close')
//    })

});
//// Recreate 'String.Format' functionality in javascript.
//String.prototype.format = function () {
//    var args = arguments;
//    var str = this;
//    return str.replace(String.prototype.format.regex, function (item) {
//
//        var intVal = parseInt(item.substring(1, item.length - 1));
//        var replace;
//        if (intVal >= 0) {
//            replace = args[intVal];
//        } else if (intVal === -1) {
//            replace = "{";
//        } else if (intVal === -2) {
//            replace = "}";
//        } else {
//            replace = "";
//        }
//        return replace;
//    });
//};
//String.prototype.format.regex = new RegExp("{-?[0-9]+}", "g");


//add a max method to array
Array.prototype.max = function () {
    return Math.max.apply(null, this);

};

Array.prototype.min = function () {
    return Math.min.apply(null, this);

};



/* Global variables
*/


// document ready override to run various tasks that are expected to be completed once the landing page has been loaded
$(document).ready(function() {

    $(".collapsible_container .icon").click(collapse_event);


    // initialize the dialog box used when confirming navigating away from a page (used for quiz sections)
    $("#lesson-nav-warning-dialog").dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        resizable: false,
        width: '450px',
        open: function() {
                place_dialog_center($(this));
            }
    });

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

    //// keep warning dialog centered on screen when scrolling
    $(window).scroll(function() {
        if ($("#lesson-nav-warning-dialog").dialog("isOpen") === true) {
            place_dialog_center($("#lesson-nav-warning-dialog"));
        }

        if ($("#lesson-nav-denied-dialog").dialog("isOpen") === true) {
            place_dialog_center($("#lesson-nav-denied-dialog"));
        }
    });

    // highlight the active section in the table of contents
    //HighlightActiveSection_TOC(true);


});

// method to keep a given dialog box centered on screen based upon viewport size
function place_dialog_center(dialog_obj) {
    var window_height = $(window).height();
    var window_width = $(window).width();
    var scroll_top = $(window).scrollTop();
    var scroll_left = $(window).scrollLeft();

    $(dialog_obj).parent('.ui-dialog').css('top', window_height / 2 - $(dialog_obj).height() + scroll_top);
    $(dialog_obj).parent('.ui-dialog').css('left', window_width / 2 - $(dialog_obj).width() / 2 + scroll_left);
}

/* general functions
*/
function Guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
}

function getCookie(c_name) {
    var c_value = " " + document.cookie;
    var c_start = c_value.indexOf(" " + c_name + "=");
    if (c_start == -1) {
        c_value = null;
    }
    else {
        c_start = c_value.indexOf("=", c_start) + 1;
        var c_end = c_value.indexOf(";", c_start);
        if (c_end == -1) {
            c_end = c_value.length;
        }
        c_value = unescape(c_value.substring(c_start, c_end));
    }
    return c_value;
}

function collapse_event() {
    
    var collapse_container = $(arguments[0].target).closest(".collapsible_container");
    var icon = $(collapse_container).find(".icon");
    var content_container = $(collapse_container).find('.content_container');
    var contents = $(content_container).find('.content');

    //var box = content_container.find(".content");
    if (contents.is(':visible')) {
        $(contents).fadeOut(100, function () {
            $(content_container).addClass('collapsed');
        });

        setTimeout(function () {
            $(collapse_container).addClass('collapsed');
            $(icon).removeClass('selectedTab');
        }, 200);

    } else {
        $(icon).addClass('selectedTab');

        $(collapse_container).removeClass('collapsed');
        $(content_container).removeClass('collapsed').ready(function () {
            $(contents).delay(300).fadeIn(200);
        });



    }


}

// #region Accordion Interaction methods

function recursivly_expand_subAccords(subAccord) {

    var parentAccordion = subAccord.parent().closest('.subAccordion');

    subAccord.accordion({ active: 0 });

    // if there is a parent subaccordion recursivly call with parent
    if (parentAccordion.length > 0) {
        recursivly_expand_subAccords(parentAccordion);
    }
}

//function HighlightActiveSection_TOC() {
//    
//    $(".TOC_Title").removeClass('current_selected_section');
//
//    var section = URL_UTILS.getURLParameter('sectionID');
//
//    if (!!section) {
//        
//        var TOC_Item = $(".TOC_Title[value='" + section + "']");
//        var parent_accordion = TOC_Item.closest('.JUIaccordion');
//        TOC_Item.addClass('current_selected_section');
//
//        // expand any parent accordians to display current section on first load
//        parent_accordion.accordion({ active: parent_accordion.children('div').index(TOC_Item.closest('div.accord-content')) });
//        recursivly_expand_subAccords(TOC_Item.closest('.subAccordion'));
//            
//        
//    }
//}

// #endregion



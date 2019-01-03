function LearningObj_MGR(){

}

function updateABETSelection(checkbox, index){
    if (checkbox.checked){
        var aText = $("#abet_text_" + index).text();
        $("#abet_outcomes").append("<li id='abet_" + index + "'>" + aText + "</li>");
    }
    else{
        $("#abet_" + index).remove();
    }
};

function updateActionList(knowledge){
    if(!(typeof knowledge === 'string')) {
        knowledge = knowledge.value;
    }
    options = ["not found"];
    $('#actionList').empty();
    jQuery.each(verbsByKnowledge[knowledge], function(i, verb){
        $('#actionList').append(new Option(verb, verb, false, false));
    });
};

function selectAction(actionValue){
    $('.verbDisplay').each(function() {
        $(this).text(actionValue.value);
    });
};

function updateLearningObjective(form, values_dictionary){
    form.find('input[name$=condition]').val(values_dictionary['condition']);
    form.find('input[name$=task]').val(values_dictionary['task']);
    form.find('input[name$=degree]').val(values_dictionary['degree']);
    form.find('input[name$=level]').val(values_dictionary['level']);
    form.find('input[name$=verb]').val(values_dictionary['verb']);
    form.find('input[name$=outcomes]').val(values_dictionary['outcomes']);

    var learn = values_dictionary["condition"] + " " + values_dictionary["verb"] + " " + values_dictionary["task"] + " " + values_dictionary["degree"];
    form.find('div.LO_representation').last().html(learn);
}

function resetWizard(){
    // reset inputs
    $("#condition").val("");
    $("#task").val("");
    $("#degree").val("");
    $("#actionText").val("");
    updateActionList("Remembering");
    $("#outcomes_selection input:checked").map(function(){
                                  return $(this).prop('checked', false);
                                }).get();
    $("#knowledgeSelection").prop("selectedIndex", 0).change();

    // reset displays
    $('.conditionDisplay').each(function() {
        $(this).text("");
    });
    $('.taskDisplay').each(function() {
        $(this).text("");
    });
    $('.degreeDisplay').each(function() {
        $(this).text("");
    });
    $('.verbDisplay').each(function() {
        $(this).text("");
    });
    $("#abet_outcomes").empty();

    // TODO: not the best method... there should be a way to set current step
    //      without triggering click events on the nav buttons
    // click back to beginning
    $('a[href="#previous"]').click();
    $('a[href="#previous"]').click();
    $('a[href="#previous"]').click();
    $('a[href="#previous"]').click();
    $('a[href="#previous"]').click();

    // remove 'done' tags from each step tab
    $('#learning-objective-dialog .steps .done').each(function(index, tab){
        $(tab).removeClass('done')._enableAria(false);
    })
}


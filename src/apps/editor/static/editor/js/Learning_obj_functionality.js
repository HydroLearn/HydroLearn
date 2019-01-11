// populate the form listing for ABET outcomes
function populateOutcomes(outcomesList){

    var outcomes_table = $('#outcomes_selection');
    outcomes_table.empty()

    $.each(outcomesList, function(index, outcome_obj){

        var new_row = $('<div>', {
            class: 'outcome_row',
        })

        var input = $('<input>',{
            'id': 'abet_{0}'.format(outcome_obj.id),
            'type': 'checkbox',
            'value': outcome_obj.id,
            'class': 'outcome_checkbox'
        })

        var label = $('<label>', {
            'for': 'abet_{0}'.format(outcome_obj.id),
            'class': 'outcome_text',
            'text': outcome_obj.outcome,
        })

        //label.text(outcome_text);

        new_row.append(input, label);

        outcomes_table.append(new_row)

    })

}

// populate the knowledge level dropdown
function populateKnowledgeList(knowledgeOrder){
    var knowledge_select = $('#knowledgeSelection')

    knowledge_select.empty();

    knowledge_select.append(new Option("Select Level...", "", true, false));

    knowledgeOrder.map( function(knowledge){
        knowledge_select.append(new Option(knowledge.label, knowledge.id, false, false));

    });

}

function mapWizardInputEvents(){
    //  input for included fields
    $('#wizardLO').on('input','#condition',function () {
        var conditionText = $(this).val();
        $('.conditionDisplay').each(function() {
            $(this).text(conditionText);
        });
    });

    $('#wizardLO').on('input','#task',function () {
        var taskText = $(this).val();
        $('.taskDisplay').each(function() {
            $(this).text(taskText);
        });
    });

    $('#wizardLO').on('input','#degree',function () {
        var degreeText = $(this).val();
        $('.degreeDisplay').each(function() {
            $(this).text(degreeText);
        });
    });

    // set knowledge selection change event
    $('#wizardLO').on('change', '#knowledgeSelection', knowledge_select_changed_evt)

    // set action selection change event
    $('#wizardLO').on('change', '#actionSelection', action_selected_evt)
}

// update the Action list associated with a selected Knowledge level
function knowledge_select_changed_evt(evt){

    var action_selection = $('#wizardLO #actionSelection');

    // Setup knowledge dropdown
    action_selection.empty()

    // add a default none option
    action_selection.append(new Option("Select Action...", "", true, true));

    $.each(verbsByKnowledge[evt.currentTarget.value], function(i, verb){
        action_selection.append(new Option(verb.verb, verb.id, false, false));
    });

    // trigger the action selection change, since the options were updated
    action_selection.trigger('change');
};

//
function action_selected_evt(evt){
    var lo_string = ""

    if(!!evt.currentTarget.value){
        lo_string = $("option:selected", this).text();
    }
    // map the verb display in the learning objective strings
    $('.verbDisplay').each(function() {
        $(this).text(lo_string);
    });
};

// update the displayed learning objective text for all steps
function updateLearningObjective(form, values_dictionary){

    form.find('input[name$=condition]').val(values_dictionary['condition']);
    form.find('input[name$=task]').val(values_dictionary['task']);
    form.find('input[name$=degree]').val(values_dictionary['degree']);
    form.find('input[name$=level]').val(values_dictionary['level_id']);
    form.find('input[name$=verb]').val(values_dictionary['verb_id']);
    form.find('input[name$=outcomes]').val(values_dictionary['outcomes']);

    var learn = values_dictionary["condition"]
        + " " + values_dictionary["verb"]
        + " " + values_dictionary["task"]
        + " " + values_dictionary["degree"];

    form.find('div.LO_representation').last().html(learn);
}

// update the ABET listing based on checked items in outcomes_selection
function updateABETReview(){

    var outcomes_review_box = $("#abet_outcomes");

    $("#abet_outcomes").empty()

    $('.outcome_row input:checked').each(function(index, row){

        var aText = $(this).closest('.outcome_row').find('.outcome_text').text();
        var new_row = $("<li>", {
            'class': 'outcome_review',
            'data-value': this.value,
            'text': aText,
        })

        $("#abet_outcomes").append(new_row);
    });
};

// reset the wizard selections
function resetWizard(){
    // reset inputs
    $("#condition").val("");
    $("#task").val("");
    $("#degree").val("");


    $("#actionSelection").val("");

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


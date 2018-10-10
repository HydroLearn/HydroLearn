// var form = new FM_Form('id', 'LESSON', html)
function FM_Form(identifier, type){
    // the identifier for this form
    this.id = identifier;

    // the errors for this form
    this.errors = null;

    // the type of the form
    this.type = type;

    this.polymorphic_type = null;

    // the HTML representation of the form
    this.html = null;

}

FM_Form.prototype.update_form = function() {}
FM_Form.prototype.mark_error = function() {}
FM_Form.prototype.export = function() {}
FM_Form.prototype.generate_representation = function () {}


// var formset = new FM_Formset('LESSON', 'prefix', mgmt_form, empty_form)
function FM_Formset(form_type, base_prefix){

    // prefix for the formset (a base formset, this will be used to update children)
    this.prefix = base_prefix;

    // the management form for this formset
    //      potientially needs to store mgmt forms for multiple types
    //      this.management_forms = {"LESSON": ..., "SECTION":...}
    this.management_form = null;

    // the empty for forms in this formset
    //      potientially needs to store empty forms for multiple types
    //      this.empty_forms = {"LESSON": ..., "SECTION":...}
    this.empty_form = null;


    // potentially need this to be a Types list (for accepted input)
    //      i.e. this.form_types = ["LESSON","SECTION"]
    this.form_type = form_type;

    // errors for this formset
    this.errors = null;

    // collection of forms (defaults as empty)
    this.forms = [];


}


FM_Formset.prototype.add_form = function (){}
FM_Formset.prototype.remove_form = function (){}
FM_Formset.prototype.generate_representation = function () {}

// expected to be the json return for the formset (collection of prefixed forms)
FM_Formset.prototype.export = function (){}


// formset manager, used to maintain and interact a collection of formsets
//
var FM_Formset_Manager = new (function() {

    // a collection of formsets indexed by their parent form's identifier
    //
    this.formsets = {};
})


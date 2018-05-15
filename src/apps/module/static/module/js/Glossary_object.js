
/* defining the default functionality of the Glossary object, 
    used for storing/looking up terminology specific to a lesson

    attributes:
        - terms
            this is a dictionary of Term/definition pairs (interpreted as html)
            this is to be set per case study
    
    methods:
        - lookup - gets the definition associated with a specified key
        - sorted_keys - returns a case-insensitive array of glossary terms
        - get_html - returns an html object consisting of a bold glossary term and it's definition
        - list_all_terms - returns an html Unordered list object with a sorted listing of glossary terms/definitions generated via the get_html method
        - Init_Glossary_links - to be called once a lesson is loaded, adds a click event to populate the popover's with the glossary information
        - define_terms - accepts a dictionary (associated array {key:def, key def, ...}) and sets that as the terms referenced by the other methods of the object
        - terms - a dictionary mapping key terms to their definitions.

*/

// allow popovers to utilize a callback method 
var tmp = $.fn.popover.Constructor.prototype.show;
$.fn.popover.Constructor.prototype.show = function () {
    tmp.call(this);
    if (this.options.callback) {
        this.options.callback();
    }
}


var Lesson_Glossary =
    {
        lookup: function (lookup_term) {
            return this.terms[lookup_term];
        },

        sorted_keys: function () {
            // get a case-insensitive sorted list of terms in glossary
            var keys = Object.keys(this.terms).sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            return keys;
        },

        get_html: function (specified_key) {

            // container object
            var html_object = $(document.createElement('span'));

            // create span for bolded term
            var term = $(document.createElement('span'));
            term.css('font-weight', 'bold');
            term.css('text-decoration', 'underline');
            term.html(specified_key);

            // create regular span for definition html
            var definition = $(document.createElement('span'));
            $(definition).html(this.lookup(specified_key));


            // append the term and definintion to the container object
            html_object.append(term, ": ", definition);

            // return newly created object
            return html_object.html();

        },

        list_all_terms: function () {

            var new_list = $(document.createElement('ul'));

            var key_list = this.sorted_keys();

            for (var i = 0; i < key_list.length; i++) {
                var new_entry = $(document.createElement('li'));
                new_entry.html(this.get_html(key_list[i]));
                new_list.append(new_entry);
            }
            return new_list;
        },

        // enable glossary links this should take place once the current section is loaded
        Init_Glossary_links: function () {

            // popover settings (for displaying definitions on selecting embedded terms)


            var options = {
                title: "Click to see definition.",
                placement: "bottom",
                trigger: "click",
                container: '#main-content',
                html: true,
                callback: function () {
                    // any events that are to take place once the popover is opened.
                    // typically enabling any events from interacting with popover's contents (like click events)
                    
                    MathJax.Hub.Typeset();
                }
            };



            // for each glossary link, set the contents of its popover via the term dictionary.
            $('.glossary_link').each(function () {
                //this.load_glossary_popover_content;
                
                var link = $(this);
                var glossary_term = $(this).attr('val');

                // add some necessary attributes to the link
                $(this).attr('data-toggle', 'popover');
                
                link.attr('data-placement', "bottom");
                //link.attr('data-original-title', glossary_term);
                //link.attr('title', glossary_term);
                link.attr('data-template', "<div class='glossary_popover' role='tooltip'><div class='arrow'></div><div class='popover-content'></div></div>");

                link.attr('data-content', Lesson_Glossary.get_html(glossary_term));
                

            });



            $('.glossary_link[data-toggle="popover"]').popover(options);


            // close popovers if anywhere else is clicked
            $('body').on('click', function (e) {
                $('.glossary_link[data-toggle="popover"]').each(function () {
                    //the 'is' for buttons that trigger popups
                    //the 'has' for icons within a button that triggers a popup
                    if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                        $(this).popover('hide');
                    }
                });
            });
        },

        define_terms: function (term_mapping) {
            this.terms = term_mapping;
        },

        // this should be provided upon loading a case study and set using the define terms method
        terms: {}


    }




// when the document is ready initialize the popovers that are to appear when a glossary term is clicked
$(document).ready(function () {






})




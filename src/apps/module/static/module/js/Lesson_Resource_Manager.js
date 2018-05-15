

// object to handle the display of the resource documents and videos for a loaded case study 
//  (uses the Resource_mapping object defined for each lesson)
var Lesson_Resource_Manager = {

    list_all_documents: function () {
        
        // if there is no resource mapping for this case study defined return a message notifying the user.
        if (!!!Resource_mapping) {
            var not_defined_message = $(document.createElement('div'));
            not_defined_message.append("There are no resources mapped to this case study.");
            return not_defined_message;
        }

        var resource_mapping_display = $(document.createElement('div'));



        // for each of the defined sections in the resource mapping
        $.each(Resource_mapping, function (key, obj) {
            
            // if there are resources defined for this section
            if (!!obj['resources'] && obj['resources'].length > 0) {

                var section_header = $(document.createElement('h4'));
                var formatted_section_id = key.split("_").join('.');

                section_header.append("Section {0} Documents:".format(formatted_section_id));
                section_header.css({
                    'font-size': '16px',
                    'font-weight': 'bold',
                    
                    'padding': ' 10px 0 0 0',
                });
                var document_listing = $(document.createElement('ul'));

                $.each(obj['resources'], function(index, resource_obj) {
                    // SAMPLE OUT: 
                    //      <li class="excel-resource"><a href="/Content/data/TEMPLATE Alternating Block Method.xlsx" target="_blank">Template Alternating Block Method</a></li>
                    var resource_entry = $(document.createElement('li'));

                    if (!!resource_obj.resource_type) {
                        resource_entry.addClass(resource_obj.resource_type);
                    }


                    var resource_link = $(document.createElement('a'));
                    resource_link.attr('href', resource_obj.link);
                    resource_link.attr('target', '_blank');
                    resource_link.append(resource_obj.title);

                    resource_entry.append(resource_link);
                    document_listing.append(resource_entry);


                });


                resource_mapping_display.append(section_header);
                resource_mapping_display.append(document_listing);

            } 





        });

        return resource_mapping_display;

    },


    

}
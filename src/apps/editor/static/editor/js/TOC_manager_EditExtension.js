// object to extend functionality of TOC_manager to account for loading
// of forms and interface changes within editor

function EDITOR_TOC(target_container_selector, TOC_Listing){

    // provide mapped configuration to parent 'Editor' constructor
    TABLE_OF_CONTENTS_MANAGER.call(this, target_container_selector, TOC_Listing);
}

// extend this object's prototype to extend from TABLE_OF_CONTENTS_MANAGER's prototype
EDITOR_TOC.prototype = Object.create(TABLE_OF_CONTENTS_MANAGER.prototype)


/*----------------------------------------------------
    Override TOC_MGR methods for editor interface
----------------------------------------------------*/
    EDITOR_TOC.prototype.parse_listing = function(listing) {

                // perform the same action as default TOC
                TABLE_OF_CONTENTS_MANAGER.prototype.parse_listing.call(this, listing)

                if(listing.slug == 'new_lesson'){
                    $('#Base_Lesson_obj').addClass('TOC_NEW_OBJ')
                    $('#Base_Lesson_obj').find('.Lesson_Link').first().click();
                }

            }


//    EDITOR_TOC.prototype.populate_header = function(lesson) {
//
//            TABLE_OF_CONTENTS_MANAGER.prototype.populate_header.call(this, lesson)
//
//            // add toolbox to base lesson header
//            var toolbox = this.generate_toolbox(lesson.slug);
//            $('#TableOfContents_header').append(toolbox);
//
//        }

//
//    EDITOR_TOC.prototype.generate_toc_link = function(title,link, exclude_event){
//
//            // generate html for a clickable link for the table of contents
//            var TOC_link = $(document.createElement('div'));
//            TOC_link.addClass('TOC_Title');
//            TOC_link.addClass('Section_Link');
//
//
//            TOC_link.append(title);
//            TOC_link.attr('value', link);
//
//
//            if(!!!exclude_event){
//                TOC_link.click(this.section_link_click_evt.bind(this));
//            }
//
//            // append a control panel for editing form/content
//            //    var toolbox = this.generate_toolbox(link)
//            //    TOC_link.append(toolbox)
//
//
//            return TOC_link
//
//        }

    EDITOR_TOC.prototype.generate_toolbox = function(value){

            var toolbox = $(document.createElement('div'));
            toolbox.addClass('TOC_Toolbox');

            var edit_link = $(document.createElement('i'));
            edit_link.addClass('fas');
            edit_link.addClass('fa-cog');
            edit_link.attr('data-Tool-function', 'edit');
            edit_link.attr('value', value);
            edit_link.click(this.toolbox_link_click_evt.bind(this));
            toolbox.append(edit_link)

            return toolbox

        }


    EDITOR_TOC.prototype.generate_lesson_obj = function(lesson, start_expanded){

            // perform the default generate lesson operation
            var lesson_obj = TABLE_OF_CONTENTS_MANAGER.prototype.generate_lesson_obj.call(this, lesson, start_expanded)

            // if this is an instantiated lesson add the Add controls
            if(!!lesson.is_instanced){

                // grab the content container and add the 'Add New' buttons
                var accord_content = lesson_obj.find('.accord-content').first()

                var add_menu = $(document.createElement('div'));
                add_menu.addClass('TOC_add_menu')

                var add_menu_content = $(document.createElement('div'));
                add_menu_content.addClass('TOC_add_menu_content')

                var collapse_button = $(document.createElement('div'));
                collapse_button.addClass('TOC_add_menu_trigger_btn')

                var plus = $(document.createElement('i'));
                plus.addClass('fas')
                plus.addClass('fa-plus')
                collapse_button.append(plus)
                collapse_button.append("Add Child")

                collapse_button.click(function(event){
                    event.stopPropagation();

                    // get current content block
                    var current_content_block =$(this).parent('.TOC_add_menu').find('.TOC_add_menu_content').first();

                    // hide all other 'add menu' content blocks
                    $('.TOC_add_menu_content').not(current_content_block).hide()

                    // toggle visibility of this content block
                    $(this).parent('.TOC_add_menu').find('.TOC_add_menu_content').first().toggle(200);

                });

                add_menu_content.append("Add To, {0}:".format(lesson.short_name || lesson.name))

                var new_section_btn = this.generate_add_section_btn(lesson.slug);
                add_menu_content.append(new_section_btn);

                // if this lesson depth is less than 2 allow child lessons
                if(lesson.depth < 2){
                    var new_lesson_btn = this.generate_add_lesson_btn(lesson.slug);
                    add_menu_content.append(new_lesson_btn);
                }

                add_menu.append(collapse_button);
                add_menu_content.hide();
                add_menu.append(add_menu_content);


                accord_content.append(add_menu);
            }

            // return the updated lesson object
            return lesson_obj;


        }

    EDITOR_TOC.prototype.generate_section_obj = function(section) {
           return TABLE_OF_CONTENTS_MANAGER.prototype.generate_section_obj.call(this, section)

        }

/*----------------------------------------------------
    Add some additional functionality
----------------------------------------------------*/

    EDITOR_TOC.prototype.generate_add_lesson_btn = function (value) {

        var lesson_button_wrapper =  $(document.createElement('div'));
        lesson_button_wrapper.addClass('TOC_Add_Lesson_wrapper');

        // add an 'Add Section' button to the end of this accordion
        var new_lesson_btn = $(document.createElement('div'));
        //new_lesson_btn.addClass('TOC_new_lesson');
        new_lesson_btn.addClass('TOC_Add_Lesson_button');

        var plus = $(document.createElement('i'));
        plus.addClass('fas')
        plus.addClass('fa-plus')

        new_lesson_btn.attr('value', value);
        new_lesson_btn.append(plus)
        new_lesson_btn.append("Lesson")
        new_lesson_btn.click(this.add_new_lesson_click_evt.bind(this))

        lesson_button_wrapper.append(new_lesson_btn)



        return lesson_button_wrapper
    }

    EDITOR_TOC.prototype.generate_add_section_btn = function (value) {

        var poly_types = ['reading_section', 'activity_section', 'quiz_section']

        var section_button_wrapper =  $(document.createElement('div'));
        section_button_wrapper.addClass('TOC_Add_Section_wrapper');

        // for each of the polymorphic types, generate an add button
        $.each(poly_types, function(index,poly_type){
            // add an 'Add Section' button to the end of this accordion
            var new_section_btn = $(document.createElement('div'));
            //new_section_btn.addClass('TOC_new_section');

            var plus = $(document.createElement('i'));
            plus.addClass('fas')
            plus.addClass('fa-plus')

            var button_text = "Section";
            switch(poly_type){
                case "reading_section":
                        button_text = "Reading";
                    break;
                case "activity_section":
                        button_text = "Activity";
                    break;
                case "quiz_section":
                        button_text = "Quiz";
                    break;
                default:
                    break;
            }


            new_section_btn.addClass('TOC_Add_Section_button');
            new_section_btn.attr('value', value);
            new_section_btn.attr('data-poly-type', poly_type);
            new_section_btn.append(plus);
            new_section_btn.append(button_text);
            new_section_btn.click(this.add_new_section_click_evt.bind(this))


            //new_section_btn.append(add_button);

            section_button_wrapper.append(new_section_btn)

        }.bind(this))

        return section_button_wrapper
    }

    EDITOR_TOC.prototype.get_lesson_listing = function(value) {
        lesson_listing = $('.TOC_listing[data-lesson-slug="{0}"]'.format(value))

        if(lesson_listing.length){
            return lesson_listing
        }else{
            return null
        }

    }

    EDITOR_TOC.prototype.get_lesson_obj = function(value) {
            // method to get the lesson object (accordion) from a provided slug
            var found_lesson = $(this._target).find('.Lesson_obj[data-value="'+ value +'"]')
            if(found_lesson.length){
                return found_lesson
            }else{
                return null
            }
        }

    EDITOR_TOC.prototype.get_section_obj = function(value) {
            // method to get the lesson object (accordion) from a provided slug
            var found_section = $(this._target).find('.Section_obj[data-value="'+ value +'"]')
            if(found_section.length){
                return found_section
            }else{
                return null
            }
        }

    EDITOR_TOC.prototype.get_TOC_obj = function(value){
        // get the link associated with the passed value
        //debugger;
        var selection = $('.TOC_Title[data-value="{0}"]'.format(value))

        // if this is a lesson link return lesson object
        if($(selection).hasClass('Lesson_Link')){
            return this.get_lesson_obj(value)

        }else{
            // otherwise return section object
            return this.get_section_obj(value)

        }

    }

    EDITOR_TOC.prototype.generate_new_lesson_placeholder = function(parent_slug){

        // TODO: theoretically this representation needs to be passed in the lesson_listing
        var new_lesson_obj = {
            'obj_type': 'lesson',
            'is_instanced': false,
            'slug': parent_slug + '/new_lesson',
            'name': "New Lesson",
            'short_name': "New Lesson",
            'position': 0,
            'content_url': "",
            'children': [],
        }

        var new_lesson_ph = this.generate_lesson_obj(new_lesson_obj, true)
        new_lesson_ph.addClass('TOC_NEW_OBJ')
        new_lesson_ph.find('.Lesson_Link').addClass('TOC_NEW_OBJ')
        return new_lesson_ph

    }

    EDITOR_TOC.prototype.generate_new_section_placeholder = function(parent_slug, section_type){

        // TODO: theoretically this representation needs to be passed in the lesson_listing
        var new_section_obj = {
            'obj_type': 'section',
            'is_instanced': false,
            'slug': "{0}/new_section/{1}".format(parent_slug, section_type),
            'slug_trail': "{0}/new_section/{1}".format(parent_slug, section_type),
            'name': "New Section",
            'short_name': "New Section",
            'position': 0,
            'sectionType': section_type,
            'content_url': null,

        }

        // set the slug information to point to the correct section type
        switch(section_type){
            case 'reading_section':
                    new_section_obj['name'] = "New Reading"
                    new_section_obj['short_name'] = "New Reading"
                break;

            case 'activity_section':
                    new_section_obj['name'] = "New Activity"
                    new_section_obj['short_name'] = "New Activity"
                break;

            case 'quiz_section':
                    new_section_obj['name'] = "New Quiz"
                    new_section_obj['short_name'] = "New Quiz"
                break;

            case 'default':
                    throw Error('Failed to generate new-section placeholder! unrecognized type provided to Editor TOC')
                break;
        }


        var new_section_ph = this.generate_section_obj(new_section_obj)
        new_section_ph.addClass('TOC_NEW_OBJ')
        return new_section_ph


    }

    EDITOR_TOC.prototype.toolbox_link_click_evt = function (evt) {

            // cancel any click events from parent container
            evt.stopPropagation()

            var tool = $(evt.target).attr('data-Tool-function')
            var value = $(evt.target).attr('value')

            switch(tool){
                case 'edit':
                        console.log('edit: ' + value)


                    break;
                case 'content':
                        console.log('content: ' + value)


                    break;
                default:
                    throw new Error('TOC_MGR: Invalid Tool Type provided!')
            }




            //debugger;


        }

    EDITOR_TOC.prototype.add_new_lesson_click_evt = function (evt) {

            // check that we're currently not editing a form,
            //  or currently in another 'new' form

            if($('.TOC_EDITED_OBJ, .TOC_NEW_OBJ').length){
                $('#lesson-nav-denied-dialog').dialog("open");
                return;
            }

            // generate the new placeholder
            var new_placeholder = this.generate_new_lesson_placeholder($(evt.target).attr('value'))

            // add it to the parent lesson's listing
            this.get_lesson_listing($(evt.target).attr('value')).first().append(new_placeholder)

            new_placeholder.find('.Lesson_Link').click()

        }


    EDITOR_TOC.prototype.add_new_section_click_evt = function (evt) {

            if($('.TOC_EDITED_OBJ, .TOC_NEW_OBJ').length){
                $('#lesson-nav-denied-dialog').dialog("open");
                return;
            }

            // generate the new section placeholder of the associated type
            var section_type = $(evt.target).attr('data-poly-type')
            var new_placeholder = this.generate_new_section_placeholder($(evt.target).attr('value'), section_type)

            // append a new section placeholder to the end of it's lesson listing
            this.get_lesson_listing($(evt.target).attr('value')).first().append(new_placeholder)

            // auto focus new section form
            new_placeholder.click();

        }

    EDITOR_TOC.prototype.remove_lesson = function(lesson_slug){
        $('.Lesson_obj[data-value="{0}"]'.format(lesson_slug)).remove()
    }

    EDITOR_TOC.prototype.remove_section = function(section_slug){
        $('.Section_Link[value="{0}"]'.format(section_slug)).remove()
    }
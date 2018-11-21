// Manager for the table of contents
// depends upon lesson_mgr, so ensure that is initalized before TOC_MGR
function TABLE_OF_CONTENTS_MANAGER(target_container_selector, TOC_Listing) {

    if($(target_container_selector).length == 0)
            throw new Error("TABLE_OF_CONTENTS_MANAGER's Specified target container, '" + target_container_selector +"', could not be found.")


    this._target = target_container_selector;

    // a collection of sections in the order they were generated
    this._section_listing = [];

    // TODO: maintaining a reference to the current section should remove need for
    //  LESSON_MGR calls
    this._current_section = null;

    this._listeners = [];

    /* ---------------------------------
        Perform Initialization steps for new TABLE_OF_CONTENTS instances
    ---------------------------------*/
        this.parse_listing(TOC_Listing);

        // auto expand to loaded section
        //this.expand_to_section();

    // add triggerable event lookup for use by other components
    this.EVENT_TRIGGERS = {
        SELECT_OBJ: '_TOC_select_obj',
        HIGHLIGHT_OBJ: '_TOC_highlight_obj',
        FOCUS_OBJ: '_TOC_focus_obj',
    }

    // add bind triggers for events
    $(this._target).on(this.EVENT_TRIGGERS.SELECT_OBJ, this._select_obj_listener.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.HIGHLIGHT_OBJ, this._highlight_obj_listener.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.FOCUS_OBJ, this._focus_obj_listener.bind(this))

    //this.trigger_event(this.EVENT_TRIGGERS.HIGHLIGHT_OBJ)

}

/* ---------------------------------
        Events
    ---------------------------------*/
        TABLE_OF_CONTENTS_MANAGER.prototype.section_link_click_evt = function (evt) {

            var section_to_load = $(evt.target).attr('value');

            //VIEWPORT_MGR.Switch_View('Lessons');

            // TODO: remove this reference to the lesson manager and replace with event trigger
            LESSON_MGR.Show_Section(section_to_load);

            this.trigger_section_changed()

        }





    /* ---------------------------------
        Parse TOC_Listing
        - recursive methods to generate the TOC accordions
        - expects a listing object of the same structure of the lessons themselves
            - each lesson/section is expected to be passed with the slug to their content

            Lesson of the form:
            {
                slug: ...
                name: ...
                content_url: ...
                sub_lessons: [...]
                sections: [...]
            }

            sections of the form:
            {
                slug: ...
                name: ...
                content_url: ...
            }

    ---------------------------------*/
        TABLE_OF_CONTENTS_MANAGER.prototype.parse_listing = function(listing) {

                var base_lesson = this.generate_lesson_obj(listing)

                base_lesson.attr('id','Base_Lesson_obj')

                // replace base lesson's summary link to read 'Introduction
                base_lesson.find('.Lesson_Link').first().html('Introduction')

                // set accordion to be non-collapsible and active
                base_lesson.accordion("option", "active", 0);
                base_lesson.accordion("option", "collapsible", false);

                // add the generated lesson object to the target container
                $(this._target).html(base_lesson);

            }



        TABLE_OF_CONTENTS_MANAGER.prototype.parse_children = function(parent_slug, children) {

                var children_container = $(document.createElement('div'));
                children_container.addClass('TOC_listing');
                children_container.attr('data-lesson-slug', parent_slug);


                // TODO: need to add empty link if no children

                if(!!children && children.length){
                    $.each(children, function(index, child){

                        // create the child object representation for each of the children
                        //      these can be lessons or sections
                        var child_obj;

                        switch(child.obj_type){
                            case "lesson":
                                    child_obj = this.generate_lesson_obj(child);
                                break;

                            case "section":
                                    child_obj = this.generate_section_obj(child);
                                break;

                            default: break;

                        }

                        children_container.append(child_obj);

                    }.bind(this))
                }else{
//                    var section_obj = $(document.createElement('div'));
//                    var empty_link = this.generate_toc_link('No Content Added!', null)
//                    section_obj.append(empty_link);
//                    children_container.append(section_obj);
                }



                return children_container;
            }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_lesson_obj = function(lesson, start_expanded){

            //debugger;

            // generate html for a lesson representation in the table of contents
            var Lesson_accord = $(document.createElement('div'));


            Lesson_accord.addClass('JUIaccordion');
            Lesson_accord.addClass('Lesson_obj');
            Lesson_accord.attr('data-value', lesson.slug)
            Lesson_accord.attr('data-depth', lesson.depth)
            Lesson_accord.attr('data-TOC-obj-id', lesson.slug)

            var Lesson_title = $(document.createElement('h3'));
            Lesson_title.addClass('accord-title');
            Lesson_title.append((!!lesson.short_name)?lesson.short_name: lesson.name);

            Lesson_accord.append(Lesson_title);

            var Lesson_content = $(document.createElement('div'));
            Lesson_content.addClass('accord-content');

            if(!!lesson.slug){
                var Lesson_intro = this.generate_toc_link('Summary', lesson.slug)
                Lesson_intro.addClass("Lesson_Link")

                $(Lesson_content).append(Lesson_intro);
            }
//

            // pass the 'children' list to the parse_children method to generate the TOC_listing
            var children_obj = this.parse_children(lesson.slug, lesson.children);
            $(Lesson_content).append(children_obj);


            Lesson_accord.append(Lesson_content);

            if(typeof(start_expanded) == 'undefined'){
                start_expanded = false

            }else if(start_expanded == true){
                // expects index of active element or false, since 1 lesson per accordion, always 0 on true
                start_expanded = 0
            }

            Lesson_accord.accordion({
                collapsible: true,
                active: start_expanded,
                heightStyle: 'content',
            });

            return Lesson_accord;

        }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_section_obj = function(section) {

                // generate html for a section representation in the table of contents
                /* mockup
                    <div class="TOC_Title Section_Link" value="3_1" >3.1 Summary</div>
                */

                var section_link = this.generate_toc_link(
                        (!!section.short_name)? section.short_name: section.name,
                        section.slug_trail
                    )

                section_link.addClass('Section_obj')
                section_link.attr('data-value', section.slug_trail)
                section_link.attr('data-TOC-obj-id', section.slug_trail)

                // add an icon for each of the section types for visual identification

                switch(section.sectionType){
                    case "Quiz Section":
                        section_link.addClass('quiz_section');
                        section_link.prepend('<i class="fas fa-tasks tocIcon quizicon"></i> ');
                        break;

                    case "Activity Section":
                        section_link.addClass('activity_section');
                        section_link.prepend('<i class="fas fa-cog tocIcon activityicon"></i> ');
                        break;

                    case "Reading Section":
                        section_link.addClass('reading_section');
                        section_link.prepend('<i class="fas fa-bookmark tocIcon"></i> ');
                        break;

                    default: break;
                }
                return section_link;


            }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_toc_link = function(title,link){

                // generate html for a clickable link for the table of contents
                var TOC_link = $(document.createElement('div'));
                TOC_link.addClass('TOC_Title');
                TOC_link.addClass('Section_Link');

                //debugger;

                TOC_link.append(title);

                if(!!link){
                    TOC_link.attr('value', link);
                    TOC_link.attr('data-value', link)
                }else{
                    TOC_link.addClass('TOC_EmptyLink')

                }

                TOC_link.click(this.section_link_click_evt.bind(this));

                return TOC_link

            }


    /* ---------------------------------
        TOC Helper Methods
    ---------------------------------*/
        TABLE_OF_CONTENTS_MANAGER.prototype.get_TOC_obj = function(value){
            // get the TOC-object associated with the passed value and return it
            var obj = $(this._target).find('[data-TOC-obj-id="{0}"]'.format(value))
            return (obj.length)? obj : null;
        }

        TABLE_OF_CONTENTS_MANAGER.prototype._select_object = function(obj_id) {

                var obj = this.get_TOC_obj(obj_id);
                if(!!obj){
                    // if this object is a lesson, click it's summary link
                    if(obj.hasClass('Lesson_obj')) obj.find('.Lesson_Link:first').click();

                    // if this is a section link, click it
                    if(obj.hasClass('Section_obj')) obj.click();
                }


            }

        TABLE_OF_CONTENTS_MANAGER.prototype.get_next_section = function(section) {
                var section_index = this._section_listing.indexOf(section);

                return (section_index >= 0 && section_index < this._section_listing.length - 1 && this._section_listing[section_index + 1] != 'Glossary') ? this._section_listing[section_index + 1] : null;


            }

        TABLE_OF_CONTENTS_MANAGER.prototype.get_prev_section = function (section) {
                var section_index = this._section_listing.indexOf(section);
                return (section_index > 0 && section_index <= this._section_listing.length - 1) ? this._section_listing[section_index - 1] : null;
            }

        TABLE_OF_CONTENTS_MANAGER.prototype.get_current_section = function(){
            return this._current_section;

        }

        TABLE_OF_CONTENTS_MANAGER.prototype.set_current_section = function(new_section){
            this._current_section = new_section;

        }

    /* ---------------------------------
        LESSON Navigation methods
    ---------------------------------*/
        TABLE_OF_CONTENTS_MANAGER.prototype.update_lesson_nav = function () {

                // if the loaded section is not in the list of excluded sections and loaded section is not a quiz show container
                var excludes_bottom_nav = false; //$('#' + this.get_Loaded_Section()).hasClass('quiz_section');

                for (var i = 0; i < LESSON_MGR._bottom_nav_excluded.length; i++) {

                    // if there's no loaded section or the current loaded section has is in the 'exclude' list mark excludes_bottom_nav flag
                    if (LESSON_MGR.get_Loaded_Section() == null || $('.Section_Link[value="' + LESSON_MGR.get_Loaded_Section() + '"]').hasClass(LESSON_MGR._bottom_nav_excluded[i]))
                        excludes_bottom_nav = true;
                }



                // show container
                $('.lesson-nav-container').show();

                $('.prev_lesson_link').show();
                $('.next_lesson_link').show();
                $('.lesson_complete_message').hide();


                // if the loaded section is the first of the chapter disable the previous button
                if (!!this.get_prev_section(LESSON_MGR.get_Loaded_Section())) {
                    $('.prev_lesson_link').removeAttr('disabled');
                } else {
                    $('.prev_lesson_link').attr('disabled', true);
                }

                if (!!this.get_next_section(LESSON_MGR.get_Loaded_Section())) {
                    $('.next_lesson_link').removeAttr('disabled');
                } else {
                    $('.next_lesson_link').attr('disabled', true);
                    $('.next_lesson_link').hide();

                    $('.lesson_complete_message').show();

                }

                if (excludes_bottom_nav) {
                    $('.lesson-nav-container').hide();
                }

            }

        TABLE_OF_CONTENTS_MANAGER.prototype._highlight_section = function (section_slug) {

                $(".TOC_Title").removeClass('current_selected_section');
                $(".TOC_Title[value='" + section_slug +"']").addClass('current_selected_section');

                setTimeout(function(){ this._expand_to_section() }.bind(this), 500);
            }

        TABLE_OF_CONTENTS_MANAGER.prototype._expand_to_section = function(value) {
            // method to expand the table of contents to the section specified by 'value' parameter,
            //   or the current_selected_section by default
            var toc_title =(typeof(value) != 'undefined') ?
                    $('.Section_Link[data-value="{0}"]'.format(value)) :
                    $('.current_selected_section')

            // collect a list of parents for expansion
            var parent_list = [];

            // get the parent accordion to the currently selected/specified element
            var parent_accord = toc_title.closest('.JUIaccordion')

            //debugger;

            // traverse up parent tree grabbing parent accordions
            while($(parent_accord).length){
                // activate the accordion
                parent_list.unshift(parent_accord);

                // grab next parent
                parent_accord = $(parent_accord).parent().closest('.JUIaccordion');
            }

            // iterate the parent list activating the accordions
            $.each(parent_list, function(index, accordion){
                // activate the accordions in sequence after a
                // delay
                setTimeout(function(){
                    $(accordion).accordion('option', 'active', 0);
                }, index * 300)

            })



        }




    /* ---------------------------------
        TOC event listeners
            - Register other components to listen for the table of contents events
            - set up events for specific actions that notify the listeners

        TODO: flush this out
            need to decide:
                if better to pass events to other containers to deal with
                or if should just set others to listen for this target container's events
    ---------------------------------*/
        TABLE_OF_CONTENTS_MANAGER.prototype.trigger_event = function(event_trigger, args_array){
            /*
             * convenience method for triggering TOC events, accepts an event trigger,
             * and array of arguments to pass to the event (most support callbacks)
             */

            $(this._target).trigger(event_trigger, args_array);


        }

        TABLE_OF_CONTENTS_MANAGER.prototype.register_listener = function(listener_selector){
             if($(listener_selector).length == 0)
                throw new Error("LESSON_MANAGER Attempted to register, '" + listener_selector +"', as an event listener, but container cannot be found.")


            this._listeners.push(listener_selector);
        }

        // method to trigger '_section_changed' event to listening containers
        TABLE_OF_CONTENTS_MANAGER.prototype.trigger_section_changed = function(listener_selector){

            //console.log("TOC section changed event triggered")

            // for each listening container trigger the section changed event
            var current_section = this.get_current_section();

            $.each(this._listeners, function(i, value){
                $(value).trigger('_TOC_section_changed', [current_section])
            })

        }

        TABLE_OF_CONTENTS_MANAGER.prototype._select_obj_listener = function(evt, obj_id, callback_fn, callback_args_array){
            /* event to highlight a specified object in the table of contents
             * if no object id was provided defaults to the 'current_selected'
             * object
             */
            //this._expand_to_section(obj_id)

            this._select_object(obj_id)

            if(typeof(callback_fn) != undefined && typeof(callback_fn) == "function"){
                callback_fn.apply(null, callback_args_array)
            }
        }

        TABLE_OF_CONTENTS_MANAGER.prototype._highlight_obj_listener = function(evt, obj_id, callback_fn, callback_args_array){
            /* event to highlight a specified object in the table of contents
             * if no object id was provided defaults to the 'current_selected'
             * object
             */
            //this._expand_to_section(obj_id)
            this._highlight_section(obj_id)

            if(typeof(callback_fn) != undefined && typeof(callback_fn) == "function"){
                callback_fn.apply(null, callback_args_array)
            }
        }

        TABLE_OF_CONTENTS_MANAGER.prototype._focus_obj_listener = function(evt, obj_id, callback_fn, callback_args_array){
            /* event to expand child object in the table of contents to focus a specific object
             * if no object id was provided defaults to the 'current_selected'
             * object
             */
            this._expand_to_section(obj_id)

            if(typeof(callback_fn) != undefined && typeof(callback_fn) == "function"){
                callback_fn.apply(null, callback_args_array)
            }
        }
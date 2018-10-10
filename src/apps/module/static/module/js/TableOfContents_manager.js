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

                // set the header text for the table of contents
                var TOC_Title = (!!listing.short_name) ? listing.short_name : listing.name;
                $('#TableOfContents_header').html(TOC_Title);


                // add section link for module intro
                if(!!listing.content_url){
                    this._content_url = listing.content_url

                    var module_intro = this.generate_toc_link('Introduction', listing.slug)
                    $(this._target).append(module_intro);
                }

                // if there are chapters specified for this case study listing generate their accordion objects
                if (!!listing.children) {
                    var children_obj = this.parse_children(listing.children);
                    $(this._target).append(children_obj);
                }


            }

        TABLE_OF_CONTENTS_MANAGER.prototype.parse_children = function(children) {

                var children_container = $(document.createElement('div'));
                children_container.addClass('TOC_listing');

                // TODO: need to add section link for topic summary


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

                return children_container;
            }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_lesson_obj = function(lesson){

            // generate html for a lesson representation in the table of contents
            var Lesson_accord = $(document.createElement('div'));

            Lesson_accord.addClass('JUIaccordion');
            Lesson_accord.addClass('Topic_Accord');

            var Lesson_title = $(document.createElement('h3'));
            Lesson_title.addClass('accord-title');
            Lesson_title.append((!!lesson.short_name)?lesson.short_name: lesson.name);

            Lesson_accord.append(Lesson_title);

            var Lesson_content = $(document.createElement('div'));
            Lesson_content.addClass('accord-content');

            if(!!lesson.slug){
                var Lesson_intro = this.generate_toc_link('Summary', lesson.slug)
                $(Lesson_content).append(Lesson_intro);
            }

            var has_children = (!!lesson.children && lesson.children.length > 0)

            if(has_children){
                var children_obj = this.parse_children(lesson.children);
                $(Lesson_content).append(children_obj);

            }else {
                // if there are no child sections add a placeholder message for the user
                var section_obj = $(document.createElement('div'));
                var empty_link = this.generate_toc_link('No Content Added!', null)
                section_obj.append(empty_link);
                Lesson_content.append(section_obj);
            }

            Lesson_accord.append(Lesson_content);

            Lesson_accord.accordion({
                collapsible: true,
                active: false,
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


                TOC_link.append(title);
                TOC_link.attr('value', link);
                TOC_link.click(this.section_link_click_evt.bind(this));

                //TOC_MGR._section_listing.push(section.slug);

                return TOC_link

            }


    /* ---------------------------------
        TOC Helper Methods
    ---------------------------------*/
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
                //debugger;
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

        TABLE_OF_CONTENTS_MANAGER.prototype.highlight_section = function (section_slug) {

                $(".TOC_Title").removeClass('current_selected_section');
                $(".TOC_Title[value='" + section_slug +"']").addClass('current_selected_section');

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
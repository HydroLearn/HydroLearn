// Manager for the table of contents
// depends upon lesson_mgr, so ensure that is initalized before TOC_MGR
function TABLE_OF_CONTENTS_MANAGER(target_container_selector, TOC_Listing) {

    if($(target_container_selector).length == 0)
            throw new Error("TABLE_OF_CONTENTS_MANAGER's Specified target container, '" + target_container_selector +"', could not be found.")


    this._target = target_container_selector;
    this._content_url = "";
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
            LESSON_MGR.Show_Section(section_to_load);

            this.trigger_section_changed()

        }





    /* ---------------------------------
        Parse TOC_Listing
        - recursive methods to generate the TOC accordions
    ---------------------------------*/
        TABLE_OF_CONTENTS_MANAGER.prototype.parse_listing = function(listing) {
                // set the header text for this module
                var Header_text = (!!listing.module_name) ? listing.module_name : "HydroViz Module";
                $('#header-img-text-overlay').html(Header_text);


                var TOC_Title = (!!listing.module_name) ? listing.module_name : "Case Study";
                $('#TableOfContents_header').html(TOC_Title);


                // TODO: need to add section link for module intro
                //debugger;
                if(!!listing.content_url){
                    this._content_url = listing.content_url

                    var module_intro = this.generate_toc_link('Introduction', "")
                    $(this._target).append(module_intro);
                }



                // if there are chapters specified for this case study listing generate their accordion objects
                if (!!listing.topics) {
                    var chapter_accords = this.generate_topic_accords(listing.topics);
                    $(this._target).append(chapter_accords);
                }


            }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_topic_accords = function(topics) {

                var accords = $(document.createElement('div'));
                accords.addClass('TOC_listing');

                // TODO: need to add section link for topic summary

                var TOC_manager = this;

                $.each(topics, function (index, topic) {

                    var Topic_accord = $(document.createElement('div'));

                    Topic_accord.addClass('JUIaccordion');
                    Topic_accord.addClass('Topic_Accord');

                    var Topic_title = $(document.createElement('h3'));
                    Topic_title.addClass('accord-title');
                    Topic_title.append((!!topic.short_title)?topic.short_title: topic.title);

                    // if this is topic header is a direct link add it's functionality and map the section
                    if (!!topic.section) {
                        Topic_title.addClass('Section_Link');
                        Topic_title.addClass('linked_title');
                        Topic_title.attr('value', topic.section);
                        Topic_title.click(TOC_manager.section_link_click_evt.bind(TOC_manager));

                        this._section_listing.push(topic.section);

                    }

                    Topic_accord.append(Topic_title);

                    var Topic_content = $(document.createElement('div'));
                    Topic_content.addClass('accord-content');

                    if(!!topic.slug_trail){
                        var topic_intro = TOC_manager.generate_toc_link('Summary', topic.slug_trail)
                        $(Topic_content).append(topic_intro);
                    }


                    // if there are child sections for this topic genearte it's subsection object and append it to the topic
                    if (!!topic.child_lessons && topic.child_lessons.length > 0) {

                        var lessons_obj = TOC_manager.generate_lesson_accords(topic.child_lessons);
                        Topic_content.append(lessons_obj);

                        Topic_accord.append(Topic_content);

                    }else{ // if there are no child sections add a placeholder message for the user

                        var section_obj = $(document.createElement('div'));
                        section_obj.append('No Lessons added.');
                        Topic_content.append(section_obj);

                        Topic_accord.append(Topic_content);
                    }


                    Topic_accord.accordion({
                        collapsible: true,
                        active: false,
                        heightStyle: 'content',
                    });

                    accords.append(Topic_accord);

                });

                return accords;
            }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_lesson_accords = function(lessons) {

                var accords = $(document.createElement('div'));
                accords.addClass('TOC_listing');

                // TODO: need to add section link for lesson summary
                var TOC_manager = this;

                $.each(lessons, function (index, lesson) {

                    var Lesson_accord = $(document.createElement('div'));
                    Lesson_accord.addClass('JUIaccordion');
                    Lesson_accord.addClass('Lesson_Accord');

                    var Lesson_title = $(document.createElement('h3'));
                    Lesson_title.addClass('accord-title');
                    Lesson_title.append((!!lesson.short_title)?lesson.short_title: lesson.title);

                    // if this is lesson header is a direct link add it's functionality and map the section
                    if (!!lesson.section) {
                        Lesson_title.addClass('Section_Link');
                        Lesson_title.addClass('linked_title');
                        Lesson_title.attr('value', lesson.section);
                        Lesson_title.click(TOC_manager.section_link_click_evt.bind(TOC_manager));

                        this._section_listing.push(lesson.section);

                    }

                    Lesson_accord.append(Lesson_title);


                    var Lesson_content = $(document.createElement('div'));
                    Lesson_content.addClass('accord-content');


                    if(!!lesson.slug_trail){
                        var lesson_intro = TOC_manager.generate_toc_link('Summary', lesson.slug_trail)
                        $(Lesson_content).append(lesson_intro);
                    }

                    // if there are child sections for this lesson genearte it's subsection object and append it to the lesson
                    if (!!lesson.child_sections && lesson.child_sections.length > 0) {


                        $.each(lesson.child_sections, function(index, section) {
                            var section_obj = TOC_manager.generate_sections_obj(section);
                            Lesson_content.append(section_obj);
                        });


                        Lesson_accord.append(Lesson_content);

                    }else{ // if there are no child sections add a placeholder message for the user

                        var section_obj = $(document.createElement('div'));
                        section_obj.append('No sections added.');
                        Lesson_content.append(section_obj);

                        Lesson_accord.append(Lesson_content);
                    }


                    Lesson_accord.accordion({
                        collapsible: true,
                        active: false,
                        heightStyle: 'content',
                    });

                    accords.append(Lesson_accord);

                });


                return accords;

            }


        // takes list of sections and returns section listing html
        TABLE_OF_CONTENTS_MANAGER.prototype.generate_sections_obj = function(section) {

                // it is expected that a section will either be represeneted as a direct link,
                //  or an accordion of section links so if there is a section specified make a link
                if (!!section.slug) {

                    /* mockup
                        <div class="TOC_Title Section_Link" value="3_1" >3.1 Summary</div>
                    */


                    var section_link = this.generate_toc_link(
                            (!!section.short_title)? section.short_title: section.title,
                            section.slug_trail
                        )

                    if (section.sectionType == 'quiz section') {
                        section_link.addClass('quiz_section');
                        section_link.prepend('<i class="fas fa-tasks tocIcon quizicon"></i> ');

                    } else if (section.sectionType == 'activity section') {
                        section_link.addClass('activity_section');
                        section_link.prepend('<i class="fas fa-cog tocIcon activityicon"></i> ');
                    } else {
                        //section_link.addClass('activity_section');
                        section_link.prepend('<i class="fas fa-bookmark tocIcon"></i> ');
                    }

                    //section_link.append((!!section.short_title)? section.short_title: section.title);

                    return section_link;

                }
            }

        TABLE_OF_CONTENTS_MANAGER.prototype.generate_toc_link = function(title,link){

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
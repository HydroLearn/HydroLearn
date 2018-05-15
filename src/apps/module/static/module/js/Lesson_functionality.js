// object to control Loading/initialization of lessons and included functionality
//  dependancies to URL_UTILS, VIEWPORT_MGR
//  
// sample initialization to use LESSON_MGR('#lesson-content', '@ViewBag.region','@ViewBag.caseStudy','@ViewBag.subStudy','@ViewBag.sectionID')
var LESSON_MGR = {

    // #region Properties
        _target: null,
        _Loaded_Section: null,
        _Loaded_Module: null,

        _Module_Name: null,

        _bottom_nav_excluded: ['quiz_section', 'no_lesson_selected'],         // array of lesson classes that hide the bottom navigation buttons
        _nav_confirmation_required: ['quiz_section'],   // array of lesson classes that require confirmation to navigate from
        _Queued_Section: null, // the lesson queued for loading after confirming navigation with user
    
    // #endregion

    //init: function (target_container_selector, Loaded_Region, Loaded_CaseStudy, optional_SubStudy, Loaded_Section) {
    init: function (target_container_selector, Module_name, Loaded_Module, Loaded_Section) {

        // set the target container to use when displaying lesson content
        this._target = target_container_selector;

        // set the current loaded region/casestudy references
        this._Module_Name = Module_name;
        this._Loaded_Module = Loaded_Module;
        //this._Loaded_SubStudy = optional_SubStudy;

        // if loading in to a specific section set the loaded lesson/section references
        //this._Loaded_Section = Loaded_Section;
        
        
        $('.prev_lesson_link').click(this.Show_PrevLesson);
        $('.next_lesson_link').click(this.Show_NextLesson);
        $('#lesson-nav-confirm').click(this.Nav_confirmation_evt);
        $('#lesson-nav-cancel').click(this.Nav_denied_evt);

    },

    // #region Getters/Setters/Inquisitions
        get_Module_Name: function () {
            return this._Module_Name;
        },

        get_Loaded_Module: function () {
            return this._Loaded_Module;
        },

        get_Loaded_Section: function() {
            return this._Loaded_Section;
        },

        set_Loaded_Section: function(Section) {
            this._Loaded_Section = Section;
        },
    
        generate_help_box: function(video_links, resource_links) {
            /* MOCKUP of generated object

                <div class="help-inline-container">
		            <div class="help-header">
			            <span class="help-header-text">Help</span>
		            </div>
		            <div class="help-body">
			            <h4>Video </h4>
		                <ul>
                            <li>..</li>
                        </ul>
			            <h4>Resources</h4>
                        <ul>
                            <li>..</li>
                        </ul>
		 
		            </div>
	            </div> 
            */


            if (!!video_links || !!resource_links) {

                // generate the help header container and it's title
                var help_container = $(document.createElement('div'));
                help_container.addClass('help-inline-container');

                var help_header = $(document.createElement('div'));
                help_header.addClass('help-header');

                var help_header_text = $(document.createElement('span'));
                help_header_text.addClass('help-header-text');
                help_header_text.append("Help");

                help_header.append(help_header_text);
                help_container.append(help_header);

                var help_body = $(document.createElement('div'));
                help_body.addClass("help-body");


                if (!!video_links && video_links.length > 0) {
                    var video_header = $(document.createElement('h4'));
                    video_header.append('Video');

                    var video_listing = $(document.createElement('ul'));

                    $.each(video_links, function (index, video_obj) {
                        // SAMPLE OUT: 
                        //      <li><span class="video_link disabled_vid_link" val="Alternating Block Method">Screencast on Alternating Block Method</span></li>
                        var video_entry = $(document.createElement('li'));

                        var video_link = $(document.createElement('span'));
                        video_link.addClass('video_link');
                        video_link.addClass('disabled_vid_link');
                        video_link.attr('val', video_obj.link);
                        
                        // check if playlist or video
                        if (!!video_obj.playlist && video_obj.playlist == true) {
                            video_link.attr('playlist', true);
                        }

                        video_link.append(video_obj.title);

                        video_entry.append(video_link);
                        video_listing.append(video_entry);

                    });

                    help_body.append(video_header);
                    help_body.append(video_listing);
                }

                if (!!resource_links && resource_links.length > 0) {
                    var resource_header = $(document.createElement('h4'));
                    resource_header.append('Resources');

                    var resource_listing = $(document.createElement('ul'));


                    $.each(resource_links, function (index, resource_obj) {
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
                        resource_listing.append(resource_entry);


                    });

                    
                    help_body.append(resource_header);
                    help_body.append(resource_listing);
                }
                
                help_container.append(help_body);


                return help_container;

            }
        },
    // #endregion

    //#region TOC setup / Lesson Navigation

        // optional TOC setup
        Show_NextLesson: function () {
            var current_lesson = $('.lesson:visible');
            //var next_lesson = current_lesson.next('.lesson');

            var next_lesson_id = TOC_MGR.get_next_section(LESSON_MGR.get_Loaded_Section());

            if (!!next_lesson_id) {
                //var navTo_section = next_lesson.attr('id');

                //if (current_lesson.hasClass('quiz_section')) {
                //    LESSON_MGR._Queued_Section = navTo_section;
                //    $('#lesson-nav-warning-dialog').dialog("open");

                //} else {
                    LESSON_MGR.Show_Section(next_lesson_id);
                    
                //}
            }
        },

        Show_PrevLesson: function () {
            var current_lesson = $('.lesson:visible');
            //var prev_lesson = current_lesson.prev('.lesson');

            var prev_lesson_id = TOC_MGR.get_prev_section(LESSON_MGR.get_Loaded_Section());

            if (!!prev_lesson_id) {
                //var navTo_section = prev_lesson.attr('id');

                //if (current_lesson.hasClass('quiz_section')) {
                //    LESSON_MGR._Queued_Section = navTo_section;
                //    $('#lesson-nav-warning-dialog').dialog("open");

                //} else {
                LESSON_MGR.Show_Section(prev_lesson_id);
                //}

            }
        },

        // User did not Heed warning and abandoned quiz... quitter..
        Nav_confirmation_evt: function () {
            
            if (!!LESSON_MGR._Queued_Section) {
                $('#lesson-nav-warning-dialog').dialog("close");

                var goto = LESSON_MGR._Queued_Section;
                
                LESSON_MGR.Confirmed_Section_Nav(goto);
                LESSON_MGR._Queued_Section = "";

            }
    
    
        },
        
        Nav_denied_evt: function () {
            LESSON_MGR._Queued_Section = "";
            $('#lesson-nav-warning-dialog').dialog("close");
        },
    //#endregion

    // #region Lesson Navigation Methods (Dependant upon the URL_UTILS object)
    
        get_Section_SitePath: function (sectionID) {

            // Construct the URL
            var newURL = "module"
                //+ this.get_Loaded_Region()
                + "/" + this.get_Loaded_Module()
                //+ (!!this.has_SubStudy() ? "/" + this.get_Loaded_SubStudy() : "");

            // if a section id was specified append it's query var to the end of the url
            if (!!sectionID) {
               newURL += "/?v=" + sectionID;
            }

            return newURL;
        },
        
        get_Lesson_URL: function(sectionID) {
            return URL_UTILS.Base_URL() + this.get_Section_SitePath(sectionID);
        },

        Update_URL: function (sectionID) {
            //debugger;
            var newUrl = this.get_Section_SitePath(sectionID);


            // TODO: Revise this to get module/section NAMES instead of the slugs
            //          needs to happen for browser history so cant remove
            var title_str = 'HydroLearn - '
                //+ this.get_Loaded_Module()
                + this.get_Module_Name()
                //+ ((!!sectionID) ? '/' + sectionID : "");

            URL_UTILS.Update_URL(newUrl, title_str);

            // udpate the table of contents highlighting (possibly not best place for this)
            //HighlightActiveSection_TOC(false);
        },
        
        
    // #endregion

    // #region Viewport Manipulation methods
        Show_Section: function(sectionID) {
            //debugger;
            // if the section being shown is the currently loaded section,
            //  just trigger the viewport swap to the lessson tab
            if (this.get_Loaded_Section() == sectionID){

                //VIEWPORT_MGR.Load_View('Lessons');
                VIEWPORT_MGR.Switch_View('Lessons')
                $('#lesson-tab').tab('show') // Select lesson tab
                return; 
            }
            
            // if the currently loaded section requires confirmation to leave
            //  prompt the user for confirmation and wait for that dialog to complete
            var requires_confirmation = false;
            for (var i = 0; i < this._nav_confirmation_required.length; i++) {
                if ($('.Section_Link[value="' + this.get_Loaded_Section() + '"]').hasClass(this._nav_confirmation_required[i]))
                    requires_confirmation = true;
            }

            if (requires_confirmation) {
                LESSON_MGR._Queued_Section = sectionID;
                $('#lesson-nav-warning-dialog').dialog("open");
                return;
            }
            
            
                //this.set_Loaded_Section(null);
            VIEWPORT_MGR.Load_View('Lessons', [sectionID]);

            $('#lesson-tab').tab('show') // Select lesson tab

            return;
            
            

            //$('.lesson').hide();

            

            //if (sectionID != undefined ) {
            //    var selected_section_container = $('#' + sectionID);
            //    
            //    if (selected_section_container.length > 0) {
            //        selected_section_container.show();
            //        
            //        HighlightActiveSection_TOC();
            //        this.set_Loaded_Section(sectionID);
            //    } else {
            //        $("#lesson_404").show();
            //        
            //    }
            //    
            //
            //}


            //if (typeof(youtube_player) != "undefined" && !!youtube_player) {
            //    hidePlayer();
            //    Init_YoutubePlayer();
            //}

            //LESSON_MGR.Update_URL(sectionID);
            //LESSON_MGR.init_lesson_nav();
            
            if (!!TOC_MGR) {
                
                TOC_MGR.update_lesson_nav();
            }
            

            VIEWPORT_MGR.Scroll_To_Top();

        },
        
        // confirmed leave the section in dialog (triggers refresh to the queued section)
        Confirmed_Section_Nav: function() {
            
            if (!!LESSON_MGR._Queued_Section) {
                $('#lesson-nav-warning-dialog').dialog("close");

                var goto = LESSON_MGR._Queued_Section;
                LESSON_MGR._Queued_Section = "";
                
                
                this.set_Loaded_Section(null);
                
                VIEWPORT_MGR.Load_View('Lessons', [goto]);
                
            }
        },

        on_Hide: function () {

//            // Pause any open videos if the youtube player is open
//            if (typeof(youtube_player) != "undefined" && !!youtube_player) {
//                pauseVideo();
//            }

        },
        
        on_Show: function () {


        },

        pre_display: function (passed_section) {
            
            // close any open dialog boxes before continuing 
            //$(".ui-dialog-content").dialog("close");

            // hide the youtube player if it's open
//            if (typeof(youtube_player) != "undefined" && !!youtube_player) {
//                hidePlayer();
//                Init_YoutubePlayer();
//            }

            // hide the lesson container while loading to avoid showing background operations
            $(LESSON_MGR._target).hide();


            $('.lesson-nav-container').hide();


            
        },

        post_display: function (passed_section) {
            //debugger;

            //$('#lesson-content').prepend('@Html.Partial("~/Views/Shared/_VideoPlayer.cshtml")');
            
            // set up lesson for display
            
            // set the currently loaded section
            //if(!!passed_section)
            LESSON_MGR.set_Loaded_Section(passed_section);

            // if there are help containers mapped for this section generate them and insert them into the lesson
            // TODO: Find better way to do this. (will likely be easier when swapping to DB structure)
            //if (!!Resource_mapping) {
            //    $.each(Resource_mapping, function (key, obj) {
            //        var lesson = $('.lesson#' + key);
            //        var helpbox = LESSON_MGR.generate_help_box(obj.video, obj.resources);
            //
            //        helpbox.insertAfter(lesson.find('.headerSpacer'));
            //
            //    });
            //}

            //LESSON_MGR.Show_Section(passed_section);
            LESSON_MGR.Update_URL(passed_section);
            
            
            //TOC_MGR.update_lesson_nav();

            MathJax.Hub.Typeset(); // rerender any math equations in MathJax format on lesson load

            //Lesson_Glossary.Init_Glossary_links();
            
            

            $('.map_link').click(function (evt) {
                
                var layers_string = $(evt.target).attr('value');
                var layers_array = (!!layers_string)? layers_string.split(','): [];
                
                VIEWPORT_MGR.Switch_View('Map', layers_array);

            });


            $(".checkIn_submit_button").click(function () {

                var completed = true;
                var checkin_box = $(this).closest('.checking_in_box');

                // check any multi selects
                $(checkin_box).find('select').each(function () {
                    if ($(this).val() == 'null') {
                        completed = false;
                    }
                });

                // check any text inputs
                $(checkin_box).find('input[type=text]').each(function () {
                    if ($(this).val().trim() == "") {
                        completed = false;
                    }
                });

                // check any radio buttons for a selection
                if ($(checkin_box).find('input[type=radio]').length > 0) {
                    completed = $(checkin_box).find('input[type=radio]:checked').length > 0;
                }

                // check for answers in multi-select
                // check any radio buttons for a selection
                if ($(checkin_box).find('input[type=checkbox]').length > 0) {
                    completed = $(checkin_box).find('input[type=checkbox]:checked').length > 0;
                }

                if (completed) {
                    $(checkin_box).find('.checkIn_completion_warning').hide();
                    $(checkin_box).find('.checkingIn_answer').show();
                } else {
                    if ($(checkin_box).find('.checkingIn_answer').is(':hidden'))
                        $(checkin_box).find('.checkIn_completion_warning').show();

                }
            });

            $(".checkIn_hint_button").click(function () {
                var checkin_box = $(this).closest('.checking_in_box');
                $(checkin_box).find('.checkingIn_hint').toggle();
            });
            

            TOC_MGR.highlight_section(passed_section);


            // TODO: VERIFY THIS IS A VALID OPTION FOR AUTOMATING RESPONSIVE TABLES
            $('.responsive_table:not(.stacktable)').stacktable();
            
        },

        get_content_query_data: function(passed_section) {

            // if there is no passed section set it to empty string
            //      triggers loading of module's intro content
            if(typeof(passed_section) == 'undefined') return null;

            // load the content
            //  LoadLessonContent(passed_section);


            var query_data = {};

            query_data['url'] = TOC_MGR._content_url + passed_section

            return query_data;




            //ResizeEventHandler();
        },

    // #endregion

    // #region Utility Methods
        
    // #endregion Utility Methods

};

// Manager for the table of contents
// depends upon lesson_mgr, so ensure that is initalized before TOC_MGR
var TOC_MGR = {
    
    _target: "",
    _content_url: "",
    // a collection of sections in the order they were generated
    _section_listing: [],

    init: function (target_container_selector, TOC_Listing) {
        // Parse the TOC_Listing object specified for this case study   
        
        //debugger;
        //if (typeof(TOC_Listing) != "undefined" && !!TOC_Listing) {
            this._target = target_container_selector;
            this.parse_listing(TOC_Listing);
        //}

        //$('.Section_Link');

    },

    // #region Events
    section_link_click_evt: function (evt) {
        
        var section_to_load = $(evt.target).attr('value');
        
        //VIEWPORT_MGR.Switch_View('Lessons');
        LESSON_MGR.Show_Section(section_to_load);
        
    },

    subsection_select_change_evt: function () {
        LESSON_MGR.set_Loaded_SubStudy($('#CaseStudy_select').val());
        window.location.href = LESSON_MGR.get_Lesson_URL();
    },

    // #endregion Events


    // #region Parse TOC_Listing
        
        parse_listing: function(listing) {
            // set the header text for this module
            var Header_text = (!!listing.module_name) ? listing.module_name : "HydroViz Module";
            $('#header-img-text-overlay').html(Header_text);


            var TOC_Title = (!!listing.module_name) ? listing.module_name : "Case Study";
            $('#TableOfContents_header').html(TOC_Title);


            // TODO: need to add section link for module intro
            //debugger;
            if(!!listing.content_url){
                TOC_MGR._content_url = listing.content_url

                var module_intro = TOC_MGR.generate_toc_link('Introduction', "")
                $(this._target).append(module_intro);
            }



            // if there are chapters specified for this case study listing generate their accordion objects
            if (!!listing.topics) {
                var chapter_accords = this.generate_topic_accords(listing.topics);
                $(this._target).append(chapter_accords);
            }


        },
        
        // #region recursive methods to generate the TOC accordions

        // takes list of sections and returns Chapter accordion html

            generate_topic_accords: function(topics) {

                var accords = $(document.createElement('div'));
                accords.addClass('TOC_listing');

                // TODO: need to add section link for topic summary



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
                        Topic_title.click(TOC_MGR.section_link_click_evt);

                        TOC_MGR._section_listing.push(topic.section);

                    }

                    Topic_accord.append(Topic_title);

                    var Topic_content = $(document.createElement('div'));
                    Topic_content.addClass('accord-content');

                    if(!!topic.slug_trail){
                        var topic_intro = TOC_MGR.generate_toc_link('Summary', topic.slug_trail)
                        $(Topic_content).append(topic_intro);
                    }


                    // if there are child sections for this topic genearte it's subsection object and append it to the topic
                    if (!!topic.child_lessons && topic.child_lessons.length > 0) {

                        var lessons_obj = TOC_MGR.generate_lesson_accords(topic.child_lessons);
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
            },
            
            generate_lesson_accords: function(lessons) {

                var accords = $(document.createElement('div'));
                accords.addClass('TOC_listing');

                // TODO: need to add section link for lesson summary

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
                        Lesson_title.click(TOC_MGR.section_link_click_evt);

                        TOC_MGR._section_listing.push(lesson.section);

                    }

                    Lesson_accord.append(Lesson_title);


                    var Lesson_content = $(document.createElement('div'));
                    Lesson_content.addClass('accord-content');


                    if(!!lesson.slug_trail){
                        var lesson_intro = TOC_MGR.generate_toc_link('Summary', lesson.slug_trail)
                        $(Lesson_content).append(lesson_intro);
                    }

                    // if there are child sections for this lesson genearte it's subsection object and append it to the lesson
                    if (!!lesson.child_sections && lesson.child_sections.length > 0) {


                        $.each(lesson.child_sections, function(index, section) {
                            var section_obj = TOC_MGR.generate_sections_obj(section);
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

            },


            // takes list of sections and returns section listing html
            generate_sections_obj: function(section) {
                
                // it is expected that a section will either be represeneted as a direct link, 
                //  or an accordion of section links so if there is a section specified make a link
                if (!!section.slug) {

                    /* mockup
                        <div class="TOC_Title Section_Link" value="3_1" >3.1 Summary</div> 
                    */


                    var section_link = TOC_MGR.generate_toc_link(
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
            },

            generate_toc_link: function(title,link){

                var TOC_link = $(document.createElement('div'));
                TOC_link.addClass('TOC_Title');
                TOC_link.addClass('Section_Link');


                TOC_link.append(title);
                TOC_link.attr('value', link);
                TOC_link.click(TOC_MGR.section_link_click_evt);

                //TOC_MGR._section_listing.push(section.slug);

                return TOC_link

            },
        // #endregion recursive methods to generate the TOC accordions


    // #endregion Parse TOC_Listing
    
    // #region TOC Helper Methods
    get_next_section: function(section) {
        var section_index = this._section_listing.indexOf(section);

        return (section_index >= 0 && section_index < this._section_listing.length - 1 && this._section_listing[section_index + 1] != 'Glossary') ? this._section_listing[section_index + 1] : null;
        

    },

    get_prev_section: function (section) {
        var section_index = this._section_listing.indexOf(section);
        return (section_index > 0 && section_index <= this._section_listing.length - 1) ? this._section_listing[section_index - 1] : null;
    },
    // #endregion TOC Helper Methods


    // #region LESSON Navigation methods

    update_lesson_nav: function () {

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

    },

    highlight_section: function (section_slug) {
        
        $(".TOC_Title").removeClass('current_selected_section');
        $(".TOC_Title[value='" + section_slug +"']").addClass('current_selected_section');
        
    },
    // #endregion

}

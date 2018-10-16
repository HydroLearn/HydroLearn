// object to control Loading/initialization of lessons and included functionality
//  dependancies to URL_UTILS, VIEWPORT_MGR
//
// sample initialization to use LESSON_MGR('#lesson-content', '@ViewBag.region','@ViewBag.caseStudy','@ViewBag.subStudy','@ViewBag.sectionID')


// define a custom view object for use by the Viewport manager
function LESSON_VIEW(ViewName, target_container_selector, Lesson_Manager){
    View.call(this, ViewName, target_container_selector)

    this.manager = Lesson_Manager;
}
LESSON_VIEW.prototype = Object.create(View.prototype)

/* -----------------------------------------
    Override 'View' prototype methods
-----------------------------------------*/
    LESSON_VIEW.prototype.get_content_query_data = function(passed_section) {

                // if there is no passed section set it to empty string
                //      triggers loading of module's intro content
                if(typeof(passed_section) == 'undefined') return null;

                // load the content
                //  LoadLessonContent(passed_section);


                var query_data = {};

                // TOC_MGR._content_url was previously '/module/content/[slug] (this has been depreciated)
                //query_data['url'] = TOC_MGR._content_url + passed_section

                query_data['url'] = '/module/content/' + passed_section


                return query_data;

            }

    LESSON_VIEW.prototype.pre_display = function (passed_section) {

                // close any open dialog boxes before continuing
                //$(".ui-dialog-content").dialog("close");

                // hide the youtube player if it's open
    //            if (typeof(youtube_player) != "undefined" && !!youtube_player) {
    //                hidePlayer();
    //                Init_YoutubePlayer();
    //            }

                // hide the lesson container while loading to avoid showing background operations
                $(this.manager._target).hide();


                $('.lesson-nav-container').hide();



            }

    LESSON_VIEW.prototype.post_display = function (passed_section) {
                //debugger;

                //$('#lesson-content').prepend('@Html.Partial("~/Views/Shared/_VideoPlayer.cshtml")');

                // set up lesson for display

                // set the currently loaded section
                //if(!!passed_section)
                this.manager.set_Loaded_Section(passed_section);

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
                this.manager.Update_URL(passed_section);


                //TOC_MGR.update_lesson_nav();

                MathJax.Hub.Typeset(); // rerender any math equations in MathJax format on lesson load

                //Lesson_Glossary.Init_Glossary_links();

                var lesson_manager = this.manager;

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

            }

    LESSON_VIEW.prototype.on_show = function () {}

    LESSON_VIEW.prototype.on_hide = function () {

//            // Pause any open videos if the youtube player is open
//            if (typeof(youtube_player) != "undefined" && !!youtube_player) {
//                pauseVideo();
//            }

        }




function LESSON_MANAGER(target_container_selector, Module_name, Loaded_Module, Loaded_Section) {


    /* ---------------------------------
        Properties
    ---------------------------------*/
        if($(target_container_selector).length == 0)
            throw new Error("LESSON_MANAGER's Specified target container, '" + target_container_selector +"', could not be found.")


        // set the target container to use when displaying lesson content
        this._target = target_container_selector;

        // set the current loaded region/casestudy references
        this._Module_Name = Module_name;
        this._Loaded_Module = Loaded_Module;
        this._Loaded_Section = Loaded_Section;

        // containers listening for events
        this._listening = [];

        // array of lesson classes that hide the bottom navigation buttons
        this._bottom_nav_excluded = ['quiz_section', 'no_lesson_selected'];

        // array of lesson classes that require confirmation to navigate from
        this._nav_confirmation_required = ['quiz_section'];

        // the lesson queued for loading after confirming navigation with user
        this._Queued_Section = null;

    /* ---------------------------------
        Perform initialization
    ---------------------------------*/

    // TODO: these would probably be better served somewhere's else... (like at adding to DOM)
    $('.prev_lesson_link').click(this.Show_PrevLesson.bind(this));
    $('.next_lesson_link').click(this.Show_NextLesson.bind(this));
    $('#lesson-nav-confirm').click(this.Nav_confirmation_evt.bind(this));
    $('#lesson-nav-cancel').click(this.Nav_denied_evt.bind(this));

}


/* -----------------------------------------
    define prototype methods for LESSON manager
-----------------------------------------*/

    /* ---------------------------------
        Getters/Setters/Inquisitions
    ---------------------------------*/

        LESSON_MANAGER.prototype.get_Module_Name = function () {
            return this._Module_Name;

        }

        LESSON_MANAGER.prototype.get_Loaded_Module = function () {
            return this._Loaded_Module;

        }

        LESSON_MANAGER.prototype.get_Loaded_Section = function() {
            return this._Loaded_Section;

        }

        LESSON_MANAGER.prototype.set_Loaded_Section = function(Section) {
            this._Loaded_Section = Section;

            // notify listeners that section changed
            this.trigger_section_changed();
        }

        LESSON_MANAGER.prototype.generate_help_box = function(video_links, resource_links) {
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
        }

    /* ---------------------------------
        TOC setup / Lesson Navigation
    ---------------------------------*/


        // optional TOC setup
        LESSON_MANAGER.prototype.Show_NextLesson = function () {
            var current_lesson = $('.lesson:visible');
            //var next_lesson = current_lesson.next('.lesson');

            var next_lesson_id = TOC_MGR.get_next_section(this.get_Loaded_Section());

            if (!!next_lesson_id) {
                //var navTo_section = next_lesson.attr('id');

                //if (current_lesson.hasClass('quiz_section')) {
                //    LESSON_MGR._Queued_Section = navTo_section;
                //    $('#lesson-nav-warning-dialog').dialog("open");

                //} else {
                    this.Show_Section(next_lesson_id);

                //}
            }
        }

        LESSON_MANAGER.prototype.Show_PrevLesson = function () {
            var current_lesson = $('.lesson:visible');
            //var prev_lesson = current_lesson.prev('.lesson');

            var prev_lesson_id = TOC_MGR.get_prev_section(this.get_Loaded_Section());

            if (!!prev_lesson_id) {
                //var navTo_section = prev_lesson.attr('id');

                //if (current_lesson.hasClass('quiz_section')) {
                //    LESSON_MGR._Queued_Section = navTo_section;
                //    $('#lesson-nav-warning-dialog').dialog("open");

                //} else {
                this.Show_Section(prev_lesson_id);
                //}

            }
        }

        // User did not Heed warning and abandoned quiz... quitter..
        LESSON_MANAGER.prototype.Nav_confirmation_evt = function () {

            if (!!this._Queued_Section) {
                $('#lesson-nav-warning-dialog').dialog("close");

                var goto = this._Queued_Section;

                this.Confirmed_Section_Nav(goto);
                this._Queued_Section = "";

            }


        }

        LESSON_MANAGER.prototype.Nav_denied_evt = function () {
            this._Queued_Section = "";
            $('#lesson-nav-warning-dialog').dialog("close");
        }

    /* ---------------------------------
        Lesson Navigation Methods (Dependant upon the URL_UTILS object)
    ---------------------------------*/

        LESSON_MANAGER.prototype.get_Section_SitePath = function (sectionID) {

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
        }

        LESSON_MANAGER.prototype.get_Lesson_URL = function(sectionID) {
            return URL_UTILS.Base_URL() + this.get_Section_SitePath(sectionID);

        }

        LESSON_MANAGER.prototype.Update_URL = function (sectionID) {

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
        }


    /* ---------------------------------
        Viewport Manipulation methods
    ---------------------------------*/

        LESSON_MANAGER.prototype.Show_Section = function(sectionID) {

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
                this._Queued_Section = sectionID;
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

        }

        // confirmed leave the section in dialog (triggers refresh to the queued section)
        LESSON_MANAGER.prototype.Confirmed_Section_Nav = function() {

            if (!!this._Queued_Section) {
                $('#lesson-nav-warning-dialog').dialog("close");

                var goto = this._Queued_Section;
                this._Queued_Section = "";


                this.set_Loaded_Section(null);

                VIEWPORT_MGR.Load_View('Lessons', [goto]);


            }
        }


        /* ---------------------------------
            Lesson Manager event registration
                - TODO: needs to be better thought out, before flushing out functionality
        ---------------------------------*/
        LESSON_MANAGER.prototype.register_listener = function(listening_container, callback_fn){
             if($(listener_selector).length == 0)
                throw new Error("LESSON_MANAGER Attempted to register, '" + listener_selector +"', as an event listener, but container cannot be found.")

            this._listening.push(listener_selector);

            //$(listener_selector).on()

        }

        // method to trigger '_section_changed' event to listening containers
        LESSON_MANAGER.prototype.trigger_section_changed = function(listener_selector){

            // for each listening container trigger the section changed event
            var current_section = this.get_Loaded_Section()
            $.each(this._listening, function(i, value){
                $(value).trigger('_LM_section_changed', [current_section])
            })

        }

        LESSON_MANAGER.prototype.section_changed_event_listener = function(new_section){


        }

        /* ---------------------------------
            Lesson Manager event reactions
                - methods that react to events from other components
                - will need to implement for TABLE_OF_CONTENTS_MANAGER and potentially VIEWPORT_MANAGER
        ---------------------------------*/


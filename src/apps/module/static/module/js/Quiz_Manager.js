/******************************************************
    Object to handle display mechanisms of quiz sections
        - iterates through quiz questions one at a time, and upon
            reaching end of list provides a 'summary' view marking correct/incorrect answers
******************************************************/

function QUIZ_MANAGER(target){
    this._target = target;

    this.questions = [];
    this.current_question = null;
    this.total_questions = null;

    // add triggerable event lookup for use by other components
    this.EVENT_TRIGGERS = {
        NEXT_QUESTION: '_QM_next',
        PREV_QUESTION: '_QM_prev',
        SUBMIT_QUIZ: '_QM_summary',
    }

    $(this._target).on(this.EVENT_TRIGGERS.NEXT_QUESTION, this._next_selection.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.PREV_QUESTION, this._prev_selection.bind(this))
    $(this._target).on(this.EVENT_TRIGGERS.SUBMIT_QUIZ, this._submit_quiz.bind(this))

    this.init()

}

/******************************************************
    Init methods
******************************************************/
    QUIZ_MANAGER.prototype.init = function(){
        // iterate questions and generate any additional elements

        var total_questions = $(this._target).find('.quiz_question').length


        if(total_questions > 0){
            $(this._target).find('.quiz_question').hide();
            $(this._target).find('.quiz_question').first().show();

            this.total_questions = total_questions
            this.current_question = 1


        }

            // populate the questions array

            // populate 'this.total_questions'

            // set current question to 0

        // add header
        this.generate_header()

        // add nav
        this.generate_nav()

        this._update_nav()
    }

/******************************************************
    Element Generation methods
******************************************************/
    QUIZ_MANAGER.prototype.generate_header = function(){
        var header_wrapper = $('<h4>', {class: 'quiz_header_wrapper'});

        var header_text1 = "Question: "
        var header_text2 = "/"

        var counter = $('<span>', {class:'quiz_current_question'})
        var total = $('<span>', {class:'quiz_question_total'})

        counter.text(this.current_question)
        total.text(this.total_questions)

        header_wrapper.append(header_text1, counter, header_text2, total);

        $(this._target).prepend(header_wrapper);

    }

    QUIZ_MANAGER.prototype.generate_nav = function(){

        var nav_wrapper = $('<div>', {class: 'quiz_nav_wrapper'});


        var next = $('<button>', {class: 'quiz_nav_button next_button'});

        next.text("Next ");
        next.append($('<i>', {class:'fas fa-arrow-right'}))
        next.click(function(){
            this.trigger_event(this.EVENT_TRIGGERS.NEXT_QUESTION)
        }.bind(this))


        var prev = $('<button>', {class: 'quiz_nav_button  prev_button'});
        prev.text(" Previous");
        prev.prepend($('<i>', {class:'fas fa-arrow-left'}))
        prev.click(function(){
            this.trigger_event(this.EVENT_TRIGGERS.PREV_QUESTION)
        }.bind(this));

        var submit = $('<button>', {class: 'quiz_nav_button  submit_button disabled'});
        submit.text(' Submit')
        submit.prepend($('<i>', {class:'fas fa-check'}))
        submit.click(function(){
            this.trigger_event(this.EVENT_TRIGGERS.SUBMIT_QUIZ)
        }.bind(this))

        nav_wrapper.append(prev);
        nav_wrapper.append(next);
        nav_wrapper.append(submit);

        $(this._target).append(nav_wrapper);


    }

/******************************************************
     action methods
******************************************************/
    QUIZ_MANAGER.prototype.trigger_event = function(event_trigger, args_array){
            /*
             * convenience method for triggering TOC events, accepts an event trigger,
             * and array of arguments to pass to the event (most support callbacks)
             */

            $(this._target).trigger(event_trigger, args_array);


        }


    QUIZ_MANAGER.prototype.get_current_question_index = function(){
        return this.current_question

    }


    QUIZ_MANAGER.prototype.next_question = function(){

        if(!$(this._target).find('.next_button').hasClass('disabled')){

            // hide questions, show next question
            $(this._target).children('.quiz_question').eq(this.current_question - 1).fadeOut(function(){
                //debugger;
                $(this).next('.quiz_question').fadeIn();
            })


            // update current index
            this.current_question += 1;

            // update navigation
            this._update_nav()
        }
    }

    QUIZ_MANAGER.prototype.prev_question = function(){


        if(!$(this._target).find('.prev_button').hasClass('disabled')){

            // hide questions, show next question
            $(this._target).children('.quiz_question').eq(this.current_question - 1).fadeOut(function(){
                //debugger;
                $(this).prev('.quiz_question').fadeIn();
            })


            // update current index
            this.current_question -= 1;

            // update navigation
            this._update_nav()

        }
    }

    QUIZ_MANAGER.prototype.show_summary = function(){

        // check each question comparing input with correct value
        //  to start assume the best, and let their answers disappoint you
        var num_correct = this.total_questions;

        // disable all inputs
        $(this._target).find('input').each(function(index,raw_element){
            var input_elem = $(raw_element)
            input_elem.attr('disabled', true);

        })

        $(this._target).find('.answers_wrapper').each(function(){
            var correct = true

            $(this).find('input').each(function(index,raw_element){

                var input_elem = $(raw_element)

                if((input_elem.val() == 'True' && !input_elem.is(':checked'))
                    || (input_elem.val() == 'False' && input_elem.is(':checked'))){
                    correct=false;

                }


            });


            // if all good mark set background to green
            if(correct){
                $(this).closest('.quiz_question').css('background', 'rgba(0, 255, 0, 0.15)');
            }else{
                $(this).closest('.quiz_question').css('background', 'rgba(255, 0, 0, 0.05)');
                num_correct -= 1;
            }

            // otherwise set backtround to red


            // update display of input items themselves
             $(this).find('input').each(function(index,raw_element){

                var input_elem = $(raw_element)
                input_elem.attr('disabled', true);

                if(input_elem.val() == 'True' && input_elem.is(':checked')){
                    input_elem.next('label').css({'font-weight': 'bold', 'color': '#62c562'})

                }

                if(input_elem.val() == 'True' && !input_elem.is(':checked')){
                    input_elem.next('label').css({'font-weight': 'bold', 'color': '#62c562'})
                }

                if(input_elem.val() == 'False' && input_elem.is(':checked')){
                    input_elem.next('label').css({'font-weight': 'bold', 'color': '#b1213c'})
                }

            })

        });





        // show all of the questions
        $(this._target).find('.quiz_question').fadeIn()

        var header = $(this._target).find('.quiz_header_wrapper')

        // update header text
        header.fadeOut(function(){

            header.text('Quiz Summary: {0}/{1}'.format(num_correct, this.total_questions))
            header.fadeIn();

        }.bind(this))

        // hide navigation
        $(this._target).find('.quiz_nav_wrapper').fadeOut()


    }

/******************************************************
     Internal methods
******************************************************/
    QUIZ_MANAGER.prototype._update_nav = function(){

        //debugger;
        // if this is the first question disable 'prev' button
        if(this.current_question == 1){
            $(this._target).find('.prev_button').addClass('disabled')
        }else{
            $(this._target).find('.prev_button').removeClass('disabled')
        }

        if(this.current_question < this.total_questions){
            $(this._target).find('.next_button').removeClass('disabled')
        }else{
            $(this._target).find('.next_button').addClass('disabled')
        }


        // if this is the last question
        if(this.current_question == this.total_questions){
            // upon reaching the last question submit button should be available
            $(this._target).find('.submit_button').removeClass('disabled')

        }


        // update question counter in header
        $(this._target).find('.quiz_current_question').text(this.current_question)



    }


    QUIZ_MANAGER.prototype.toggle_list_view = function(){

        $(this._target).toggle_class('list_view');


    }




/******************************************************
     Event trigger methods
******************************************************/


    QUIZ_MANAGER.prototype._next_selection = function(evt){

        // if on the last question trigger submit
        this.next_question();

    }

    QUIZ_MANAGER.prototype._prev_selection = function(evt){

        this.prev_question();

    }

    QUIZ_MANAGER.prototype._submit_quiz = function(evt){

        this.show_summary();

    }
function init_menu_animation() {
    (function () {
       'use strict';


        /*====================================
        Show Menu on Book
        ======================================*/
        $(window).bind('scroll', function() {
            var navHeight = $(window).height() - 500;
            if ($(window).scrollTop() > navHeight) {
                $('.navbar-default').addClass('on');
            } else {
                $('.navbar-default').removeClass('on');
            }
        });

        $('body').scrollspy({
            target: '.navbar-default',
            offset: 80
        });

    }());

}
init_menu_animation();

//attempting to convert FormManager to jquery plugin

// widget API reference url: https://api.jqueryui.com/jquery.widget/#jQuery-Widget2

(function( $ ) {

    $.widget( "forms.DynamicNestedFormset", {

        options: {
            // add custom options here
            //      maybe include:
            //          "form-type"
            //          "is-polymorphic" (will allow multiple indexed empty forms)



            // callbacks
            init_callback: null,
            addForm_callback: null,

        },

        _create: function() {
            this.element.addClass("DynamicFormset-widget");

            // storing private data to this widget,
            //      expected to be templates for replicable form headers/empty-form templates
            //      initially null
            this._header: null
            this._emptyForms: null

            this._update();
        },

        _setOption: function( key, value ) {
            // set the option and perform the update event
            this.options[ key ] = value;
            this._update();
        },

        _update: function() {
            // have access to the following in here
            //      this.options    -- the options for the widget
            //      this.element    -- the element being handled (defined by jquery selector)

            // perform any actions expected to happen

            //var progress = this.options.value + "%";
            //this.element.text( progress );

            // triggering a custom event
            //if ( this.options.value === 100 ) {
            //    this._trigger( "complete", null, { value: 100 } );
            //}
        },

        _destroy: function() {
            this.element
                .removeClass( "DynamicFormset-widget" )
                .text( "" );
        }

        init_callback: function( event ) {
            // do what needs to be done after initializing a formset



            // Trigger an event, check if it's canceled
            if ( this._trigger( "init_callback", event ) !== false ) {
              this.option( colors );
            }

        };



    });


}( jQuery ));
function EDITOR_MANAGER(csrf_token, upload_path){
    this.initialized = false;
    this.editors = {};
    this.csrf_token = csrf_token;
    this.upload_path = upload_path;

}
    EDITOR_MANAGER.prototype.register_editor = function(selector, field_name){

        if(typeof(HL_CKEDITOR) != 'undefined'){

            var manager = this;
            $(selector).each(function(){

                HL_CKEDITOR.default.classic_editor.create(this,{
                        csrf_token: manager.csrf_token,
                        imageUploadUrl: manager.upload_path,
                    }).then(editor => {
                        manager.editors[field_name] = editor

                        editor.model.document.on( 'change:data', () => {
                            TOC_MGR.trigger_event(TOC_MGR.EVENT_TRIGGERS.EDITED_CURRENT)
                        } );

                    })
                    .catch(err => {
                        console.log(err.stack)
                    });
                })

            this.initialized = true;

        }else{
            alert('HL_CKEDITOR is undefined! Please ensure that the script has loaded and try again.')
        }



    }

    EDITOR_MANAGER.prototype.getData = function(field_name){
        if(!!this.editors){
            return this.editors[field_name].getData();
        }
        return;

    }

    EDITOR_MANAGER.prototype.clear_editor = function(){
        if(this.initialized){

            $.each(this.editors, function(key,value){
                this.editors[key].destroy();
            });


            //  delete window.CKEDITOR_VERSION;
            //  delete window.CKEDITOR_TRANSLATIONS;
            this.initialized = false;
            this.editors = {};
        }

    }


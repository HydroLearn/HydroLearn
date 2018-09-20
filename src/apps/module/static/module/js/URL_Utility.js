// object to hold generic URL manupulation functionality and handle Google Analytics calls
var URL_UTILS = {
    _Base_Url: window.location.protocol + "//" + window.location.host,
    _language: "",

    init: function (language) {
        this._language = language;
    },

    Base_URL: function () {
        if(this._language != ""){
            return this._Base_Url + '/'+  this._language ;
        }else{
            return this._Base_Url;
        }


    },

    // get the value of a current url parameter 
    getURLParameter: function (ParamName) {
        return decodeURIComponent((new RegExp('[?|&]' + ParamName + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;

    },


    // updates url to include the passed site-path off of the Base url, 
    // and make an updated entry in browser history
    Update_URL: function (updated_path, History_Title) {
        
        if (!!updated_path && !!History_Title) {
            var newURL = this.Base_URL() + '/' + updated_path;
            History.pushState('', History_Title, newURL);

            // TODO: GOOGLE ANALYTICS sent new url to google analytics
            //ga('send', 'pageview', { page: newURL });

        }



        
    }


};

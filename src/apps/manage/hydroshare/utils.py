import logging
import time
import hs_restclient as hs_r
from django.conf import settings
## tethys 1.4
#from social.apps.django_app.utils import load_strategy
# tethys 2.0
from social_django.utils import load_strategy
import tempfile
import pandas as pd
import json

logger = logging.getLogger(__name__)


class HydroShareUtils(object):

    _PROVIDER_NAME = "hydroshare"

    def __init__(self, request):
        self._hs_obj = self._get_oauth_hs(request)


    # This method is not being used, but could be in the future so I'll keep it here
    def get_json_file_content_by_resid(self, resid):
        temp_folder = tempfile.mktemp()

        fpath = self._hs_obj.getResourceFile(resid, filename="mapProject.json", destination=temp_folder)

        with open(fpath) as f:
             s = f.read()
             print(s)

        return s


    def get_json_url_by_resid(self, resid):

        url = 'https://www.hydroshare.org/resource/{0}/data/contents/mapProject.json'

        return url.format(resid)

    def get_file_list_by_resid(self, resid, return_type="list", **kwargs):

        files = self._hs_obj.resource(resid).files.all()

        print(files)

        df = pd.DataFrame(json.loads(files.text)['results'])

        return df


    def get_resource_list(self, return_type="list", **kwargs):
        res_list = list(self._hs_obj.resources(**kwargs))

        if return_type.lower() == "dataframe":
            return pd.DataFrame(res_list)
        elif return_type.lower() == "list":
            return res_list
        elif return_type.lower() == "json":
            return json.dumps(res_list)
        else:
            return res_list

    def _get_oauth_hs(self, request):

        hs_social_auth_obj = request.user.social_auth.get(provider=self._PROVIDER_NAME)
        strategy = load_strategy()
        backend_instance = hs_social_auth_obj.get_backend_instance(strategy)
        auth_server_hostname = backend_instance.auth_server_hostname

        client_id = getattr(settings, "SOCIAL_AUTH_{0}_KEY".format(self._PROVIDER_NAME.upper()), 'None')
        client_secret = getattr(settings, "SOCIAL_AUTH_{0}_SECRET".format(self._PROVIDER_NAME.upper()), 'None')

        self._refresh_user_token(hs_social_auth_obj)
        auth = hs_r.HydroShareAuthOAuth2(client_id, client_secret, token=hs_social_auth_obj.extra_data)
        return hs_r.HydroShare(auth=auth, hostname=auth_server_hostname)


    def _send_refresh_request(self, user_social):
        """
        Private function that refresh an user access token
        """
        logger.debug("------------------refresh token-----------------")
        logger.debug("------------------old token---------------------")
        logger.debug(user_social.extra_data)

        strategy = load_strategy()
        user_social.refresh_token(strategy)

        # update token_dict for backward compatible
        data = user_social.extra_data
        token_dict = {
           'access_token': data['access_token'],
           'token_type': data['token_type'],
           'expires_in': data['expires_in'],
           'expires_at': data['expires_at'],
           'refresh_token': data['refresh_token'],
           'scope': data['scope']
           }
        data["token_dict"] = token_dict
        user_social.set_extra_data(extra_data=data)
        user_social.save()

        logger.debug("------------------new token-----------------")
        logger.debug(user_social.extra_data)


    def _refresh_user_token(self, user_social):
        """
        Utility function to refresh the access token if is (almost) expired
        Args:
            user_social (UserSocialAuth): a user social auth instance
        """
        try:
            try:
                expires_at = user_social.extra_data.get('expires_at')
            except Exception as ex:
                self._send_refresh_request(user_social)
                return

            current_time = int(time.time())
            if current_time >= expires_at:
                self._send_refresh_request(user_social)
        except Exception as ex:
            logger.error("Failed to refresh token: " + ex.message)
            raise ex

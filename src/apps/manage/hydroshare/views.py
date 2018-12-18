###############################################################################
### HydroShare resource list
###############################################################################

from src.apps.manage.hydroshare import HydroShareUtils
from django.http import JsonResponse
import numpy as np

def get_hs_res_list(request):

    return_obj = {
        'success': False,
        'message': None,
        'model_list': None,
        'file_list': None,
        'json_url': 'No Json URL'
    }

    resid = request.GET.get('resid')
    keyword = request.GET.get('keyword')
    type = request.GET.get('type')

    if request.method == 'GET' and request.is_ajax():

        hsu = HydroShareUtils(request)

        try:
            if resid != None:

                #files = hsu.get_file_list_by_resid(resid)
                #print(files.head())

                url = hsu.get_json_url_by_resid(resid)

                #return_obj['file_list'] = files.to_dict('records')
                return_obj['json_url'] = url

            else:
                if keyword == None:
                    res_list = hsu.get_resource_list(return_type="dataframe", full_text_search="HydroShare Map Project")
                    print(res_list.shape[0])
                    print(res_list.shape[1])
                else:# Actual search
                    if type == "All":
                        res_list = hsu.get_resource_list(return_type="dataframe", full_text_search=keyword)
                    else:
                        res_list = hsu.get_resource_list(return_type="dataframe", full_text_search=keyword, type=type)
                return_obj['model_list'] = res_list.to_dict('records')
            return_obj['success'] = True

        except Exception as ex:
            return_obj['message'] = 'The HydroShare server appears to be down.'

    return JsonResponse(return_obj)

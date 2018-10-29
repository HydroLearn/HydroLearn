from django.contrib.auth.mixins import (
    UserPassesTestMixin,
    LoginRequiredMixin,
)
from django.core.exceptions import ImproperlyConfigured
import json
from django.http import HttpResponse
from django.utils.encoding import force_text
from djangocms_installer.compat import unicode
from django.utils.translation import gettext as _


class OwnershipRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """
        Mixin to adds in test function that checks that the user has permission
        to view the requested object,
            - Users can only access the manage view if they are the owner of the object (created_by)
                or if it has been shared with them

        if the tests defined in test_func are not passed, return a 403 error (permission exception)
    """
    raise_exception = True  # raise 403 exception if user fails permission test

    def test_func(self):
        object = self.get_object()
        has_permission = self.request.user.is_admin or (object and object.created_by == self.request.user)
        return has_permission

class AjaxableResponseMixin(object):
    """
        Custom View Mixin for processing forms via ajax
        No form processing is handled in this mixin, only creation of json responses to be
        passed to the success method of an Ajax post to a FormView

        supplies additional view settings:
            - (var) ajax_return_data         - a dictionary containing any errors encountered during processing of the form
            - (var) ajax_success_redirect   - the success url to redirect to if submitted form was valid and processed
            - (method) get_ajax_success_url - method to return the 'ajax_success_redirect' modeled after default FormView's 'get_success_url' method

        provides a super methods to return 'response.success' response if the form was processed as expected
            -   if processed form had errors a response is returned flagging 'response.success'
                as false and provides supplied  'ajax_return_data' in 'response.data'

            -   if the processed form was valid, returns response with 'response.success'
                flagged as true, and provides the result of 'get_ajax_success_url' method in
                'response.data'

        Notes:
            -   No actual redirection is triggered in this mixin, it only supplies the redirection url
                back to the view. redirection is expected to be handled in the 'Ajax.success' method

            -   Assuming processing went as expected (whether valid or invalid),
                'Ajax.success' will be triggered and the appropriate json response will be supplied

            -   the only time 'Ajax.error' will be returned is if there is a server side error,
                or if the supplied 'ajax_return_data' or 'ajax_success_redirect' are invalid.

    """

    ajax_return_data = {}
    ajax_success_redirect = None

    def get_ajax_success_url(self):
        """
            method modeled after FormView's 'get_success_url' method, but to return
            the ajax redirect url

            :return: url for view to redirect to on successful form submission
        """
        if self.ajax_success_redirect:
            # Forcing possible reverse_lazy evaluation
            url = force_text(self.ajax_success_redirect)
        else:
            #raise ImproperlyConfigured("No URL to redirect to. Provide a ajax_success_redirect.")
            url = None
        return url

    def get_success_return_data(self, form):
        return {}

    def get_failed_return_data(self, form):
        return {
            'errors': form.errors.as_json(),
        }
    """
        Mixin to add AJAX support to a form.
        Must be used with an object-based FormView (e.g. CreateView, UpdateView)
    """

    def form_valid(self, form, *args, **kwargs):
        """
        :param form: the posted valid form
        :return: an HttpResponse containing a json object flagging success as true, provide a message,
                    and return the 'ajax_return_data' under the 'data' attribute
        """
        # We make sure to call the parent's form_valid() method because
        # it might do some processing (in the case of CreateView, it will
        # call form.save() for example).
        response = super(AjaxableResponseMixin, self).form_valid(form, *args, **kwargs)
        if self.request.is_ajax():

            self.message = _("Validation passed! The Form has been Saved.")

            #return_data = self.ajax_return_data
            return_data = self.get_success_return_data(form)

            if self.ajax_success_redirect and "redirect_url" not in return_data.keys():
                return_data["redirect_url"] = self.get_ajax_success_url()

            payload = {
                'success': True,
                'message': _("Success! The form was saved."),
                'data': return_data,
            }

            return HttpResponse(json.dumps(payload), content_type='application/json')

        else:
            return response


    def form_invalid(self, form, *args, **kwargs):
        """
        :param form: the posted invalid form
        :return: an HttpResponse containing a json object flagging success as false, provide a message,
                    and return the 'ajax_return_data' under the 'data' attribute
        """

        response = super(AjaxableResponseMixin, self).form_invalid(form, *args, **kwargs)
        if self.request.is_ajax():

            payload = {
                'success': False,
                'message': _("Submission failed! The form was not saved."),
                #'data': self.ajax_return_data
                'data': self.get_failed_return_data(form),
            }

            return HttpResponse(json.dumps(payload), content_type='application/json')

        else:
            return response



def errors_to_json(errors):
    """
    Convert a Form error list to JSON::
    """
    return dict(
            (k, list(map(unicode, v)))
            for (k,v) in errors.items()
        )
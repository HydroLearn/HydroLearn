from django.http import Http404


class PublicationViewMixin(object):
    '''
        mixin to restrict access to publication objects based on module
        defined 'user_has_access' result

        if a user does not have access to an object, a 404 error will be raised
    '''

    def get_object(self, queryset=None):
        object = super(PublicationViewMixin, self).get_object(queryset)

        #   check if the requesting user has access, if not return None
        if not object.user_has_access(self.request.user):
            raise Http404

        return object


class PublicationChildViewMixin(object):
    '''
        mixin to restrict access to publication objects based on module
        defined 'user_has_access' result

        if a user does not have access to an object, a 404 error will be raised
    '''

    def get_object(self, queryset=None):
        object = super(PublicationChildViewMixin, self).get_object(queryset)

        #   check if the requesting user has access, if not return None
        if not object.get_Publishable_parent().user_has_access(self.request.user):
            raise Http404

        return object
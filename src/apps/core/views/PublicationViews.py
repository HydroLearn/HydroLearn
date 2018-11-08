from django.http import Http404

from src.apps.core.models.PublicationModels import Publication


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

class DraftOnlyViewMixin(object):
    '''
        mixin to restrict access of a particular view to Draft versions of publications
    '''
    def get_object(self, queryset=None):
        object = super(DraftOnlyViewMixin, self).get_object(queryset)
        accepted_statuses = [Publication.DRAFT_ONLY, Publication.PUBLISHED]
        #   check if this object's publishable parent is the Current Publication
        if not object.get_Publishable_parent().get_publish_status() in accepted_statuses:
            raise Http404

        return object

class PublicOnlyViewMixin(object):
    '''
        mixin to restrict access of a particular view to Published versions of publications
    '''
    def get_object(self, queryset=None):
        object = super(PublicOnlyViewMixin, self).get_object(queryset)

        accepted_statuses = [Publication.PUBLICATION_OBJECT, Publication.PAST_PUBLICATION]

        #   check if this object's publishable parent is the Current Publication
        if not object.get_Publishable_parent().get_publish_status() in accepted_statuses:
            raise Http404

        return object
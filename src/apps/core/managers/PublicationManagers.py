from src.apps.core.managers.IterativeDeletionManagers import (
    IterativeDeletion_QuerySet,
    IterativeDeletion_Manager,

    PolyIterativeDeletion_QuerySet,
    PolyIterativeDeletion_Manager,
)


'''
    QUERYSETS ***********************************
'''

class PublicationQuerysetMixin(object):
    """
     add publication specific filters to queryset.
    """
    def drafts(self):
        return self.filter(is_draft=True)

    def public(self):
        return self.filter(is_draft=False)

# queryset for publishable models
#   inherit the iterative deletion queryset to enforce placeholder deletion on delete
class PublicationQuerySet(PublicationQuerysetMixin, IterativeDeletion_QuerySet):
    # def get(self, *args, **kwargs):
    #     get_result = super(PublicationQuerySet, self).get(*args,**kwargs)
    #
    #     return get_result
    pass



# queryset for publishable models
#   inherit the iterative deletion queryset to enforce placeholder deletion on delete
class PolyPublicationQuerySet(PublicationQuerysetMixin, PolyIterativeDeletion_QuerySet): pass


'''
    MANGERS ***********************************
'''
class PublicationManagerMixin(object):
    """
       custom methods for a Publication manager
    """
    def drafts(self):
        return self.get_queryset().drafts()

    def public(self):
        return self.get_queryset().public()

class PublicationManager(PublicationManagerMixin, IterativeDeletion_Manager):
    """
        publication manager with calls to publication queryset.
    """

    def get_queryset(self):
        return PublicationQuerySet(self.model)

class PolyPublicationManager(PublicationManagerMixin, PolyIterativeDeletion_Manager):
    """
        publication manager with calls to publication queryset.
    """
    def get_queryset(self):
        return PolyPublicationQuerySet(self.model)

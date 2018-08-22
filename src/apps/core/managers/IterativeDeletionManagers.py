from django.db import models, transaction
from polymorphic.managers import PolymorphicManager
from polymorphic.query import PolymorphicQuerySet

'''
    TODO:   This is a temporary solution for the deletion of placeholders upon
            deletion of core objects. This will eventually be phased out, and replaced
            with a post-delete Signal solution
'''


'''
    QUERYSETS ***********************************
'''
class IterativeDeletion_QuerySet(models.QuerySet):

    def delete(self, *args, **kwargs):
        #print("in custom queryset delete")
        with transaction.atomic():
            #self.clear_placeholders()

            # attempting to prevent 'bulk delete'
            for obj in self:
                obj.delete()

            #super(IterativeDeletion_QuerySet, self).delete(*args, **kwargs)

class PolyIterativeDeletion_QuerySet(PolymorphicQuerySet):

    def delete(self, *args, **kwargs):
        print("in custom poly-queryset delete")
        with transaction.atomic():
            for obj in self:
                obj.delete()

        #super(PolyIterativeDeletion_QuerySet, self).delete(*args, **kwargs)



'''
    MANAGERS ***********************************
'''
class IterativeDeletion_Manager(models.Manager):
    def get_queryset(self):
        return IterativeDeletion_QuerySet(self.model, using=self._db)

    def delete(self, *args, **kwargs):
        return self.get_queryset().delete(*args, **kwargs)


class PolyIterativeDeletion_Manager(PolymorphicManager):
    def get_queryset(self):
        return PolyIterativeDeletion_QuerySet(self.model, using=self._db)

    def delete(self, *args, **kwargs):
        return self.get_queryset().delete(*args, **kwargs)
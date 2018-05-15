from django.db import models, transaction

from polymorphic.managers import PolymorphicManager
from polymorphic.query import PolymorphicQuerySet

#import warnings

class IterativeDeletion_Manager(models.Manager):
    def get_queryset(self):
        return IterativeDeletion_QuerySet(self.model, using=self._db)

    def delete(self, *args, **kwargs):
        return self.get_queryset().delete(*args, **kwargs)

class IterativeDeletion_QuerySet(models.QuerySet):

    def delete(self, *args, **kwargs):
        print("in custom queryset delete")
        with transaction.atomic():
            #self.clear_placeholders()

            # attempting to prevent 'bulk delete'
            for obj in self:
                obj.delete()

            #super(IterativeDeletion_QuerySet, self).delete(*args, **kwargs)



class PolyIterativeDeletion_Manager(PolymorphicManager):
    def get_queryset(self):
        return PolyIterativeDeletion_QuerySet(self.model, using=self._db)

    def delete(self, *args, **kwargs):
        return self.get_queryset().delete(*args, **kwargs)

class PolyIterativeDeletion_QuerySet(PolymorphicQuerySet):

    def delete(self, *args, **kwargs):
        print("in custom poly-queryset delete")
        with transaction.atomic():
            for obj in self:
                obj.delete()

        #super(PolyIterativeDeletion_QuerySet, self).delete(*args, **kwargs)


'''
    # legacy (never functioning... ) method of clearing placeholders for queryset.
    # potentially useful in the future, though it wasn't at the time...
    #       (I'm a little resentful...)


    # in manager
    def clear_placeholders(self, *args, **kwargs):
        return self.get_queryset().clear_placeholders(*args,**kwargs)

    # in queryset
   def clear_placeholders(self, *args, **kwargs):
        print("in queryset clear placeholders")
        with transaction.atomic():
            for obj in self:
                print(f"--- attempting clean with {obj}")
                cleanup_method = getattr(obj, "cleanup_placeholders", None)
                if callable(cleanup_method):
                    print(f"----- found method")
                    obj.cleanup_placeholders()


                else:
                    #raise NotImplementedError(f"Missing Implementation for cleanup_placeholders in {obj}")
                    warnings.warn(f"*** Missing method Implementation for cleanup_placeholders in '{obj}' of type '{type(obj)}' *** If this object contains a PlaceholderField, this method must be implemented to avoid a orphaned Placeholders.")
        print("FINISHED queryset clear placeholders")



'''
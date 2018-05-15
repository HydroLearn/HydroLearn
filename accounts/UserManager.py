from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, is_active=True, is_staff=False, is_admin=False):
        #ensure user being created provided an email
        if not email:
            raise ValueError("Users must provide a unique email address")

        if not password:
            raise ValueError("Users must provide a password")

        # Normalize and set the user email
        user_obj = self.model(
            email = self.normalize_email(email)
        )

        user_obj.set_password(password) # change user password

        user_obj.is_staff = is_staff
        user_obj.is_superuser = is_admin
        user_obj.is_active = is_active

        user_obj.save(using=self._db)   # save


        return user_obj

    def create_staffuser(self, email, password=None):
        user = self.create_user(email, password=password, is_staff=True)
        return user

    def create_superuser(self, email, password=None):
        user = self.create_user(email, password=password, is_staff=True, is_admin=True)
        return user
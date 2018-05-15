from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


from accounts.forms import UserAdminCreationForm, UserAdminChangeForm

# Register your models here.

# get our custom user model
User = get_user_model()

# create user model admin
class UserAdmin(BaseUserAdmin):
    # The forms to add and change user instances
    form = UserAdminChangeForm
    add_form = UserAdminCreationForm

    # The fields to be used in displaying the User model.
    # These override the definitions on the base UserAdmin
    # that reference specific fields on auth.User.
    list_display = ('email', 'is_staff', 'is_superuser', 'date_joined')
    list_filter = ('is_superuser','is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        #('Personal info', {'fields': ()}),
        ('Permissions', {'fields': ('is_superuser','is_staff','is_active', 'groups')}),
    )
    # add_fieldsets is not a standard ModelAdmin attribute. UserAdmin
    # overrides get_fieldsets to use this attribute when creating a user.
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2')}
        ),
    )
    search_fields = ('email',)
    ordering = ('email',)
    filter_horizontal = ()



'''
    tutorial suggested removing group admin,
     but i'm not 100% sure we wont be using it so i'll leave below, commented
'''
#admin.site.unregister(Group)

#admin.site.unregister(User)
# register custom user model with admin site
admin.site.register(User, UserAdmin)
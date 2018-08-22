#from django import forms
from django.contrib import admin
#from django.utils.translation import ugettext as _

from cms.admin.placeholderadmin import PlaceholderAdminMixin
#from cms.admin.placeholderadmin import FrontendEditableAdminMixin


#from djangocms_text_ckeditor.widgets import TextEditorWidget

#from src.apps.core.admin_actions import *

from src.apps.core.forms import (
    ModuleForm,
    add_TopicForm,
    Edit_TopicForm,
    add_LessonForm,
    Edit_LessonForm,
    #SectionForm,
    ReadingSectionForm,
    ActivitySectionForm,
)


from src.apps.core.models.ModuleModels import (
    Module,
    Topic,
    Lesson,
    Section,

)
from src.apps.core.models.SectionTypeModels import (
    ReadingSection,
    ActivitySection,
    QuizSection,

)

from src.apps.core.models.QuizQuestionModels import (
    QuizQuestion,
    MultiChoice_question,
    MultiChoice_answer,
    MultiSelect_question,
    MultiSelect_answer
)

#from src.apps.core.QuerysetManagers import *


from adminsortable2.admin import SortableAdminMixin, SortableInlineAdminMixin
from polymorphic.admin import PolymorphicParentModelAdmin,PolymorphicChildModelAdmin,PolymorphicChildModelFilter,StackedPolymorphicInline, PolymorphicInlineSupportMixin


#from easy_select2 import select2_modelform
# form = select2_modelform( MODEL_NAME, attrs={'width': '250px'})

#from pprint import pprint

    # can add list of fields that are editable within the admin from the list view
    
    # can provide group actions for admin listing (makes calls to local methods)
    # actions = ['publish']
    # def publish(self, modeladmin, request, queryset):
    #   queryset.update(publication_status=Post.PUB_STATUS_PUBLISHED)   


class CreationTrackingMixin(object):
    def save_model(self, request, obj, form, change):
        #print('***************** IN CUSTOM SAVE MODEL')
        # if this is the first save of the model set 'created_by' to the current user
        if not obj.pk:
            #print("*** changing created by for '{obj.name}'")
            obj.created_by = request.user
            obj.updated_by = request.user

        # if the object exists and there are changes
        #   store the current user as the most recent updator
        if obj.pk and change:
            #print("*** updating 'last updator' for '{obj.name}'")
            obj.updated_by = request.user

        obj.save()


class PublicationChangeTrackingMixin(object):
    def save_model(self, request, obj, form, change):
        #print('***************** IN CUSTOM PUBLICATION SAVE MODEL')
        # if this is the first save of the model set 'created_by' to the current user
        if not obj.pk:
            #print("*** changing created by for '{obj.name}'")
            obj.created_by = request.user
            obj.changed_by = request.user

        # if the object exists and there are changes
        #   store the current user as the most recent updator
        if obj.pk and change:
            #print("*** updating 'last updator' for '{obj.name}'")
            obj.changed_by = request.user

        obj.save()


# ============================================================
#   Inline Admin interfaces
# ============================================================

#class ReadingInline(SortableTabularInline):
class ReadingInline(admin.TabularInline):
    model = ReadingSection
    fk_name = 'readingsection'
    readonly_fields = ['section_ptr']

#class ActivityInline(SortableTabularInline):    
class ActivityInline(admin.TabularInline):
    model = ActivitySection
    fk_name = 'activitysection'
    readonly_fields = ['section_ptr']
    
#class QuizInline(SortableTabularInline):
class QuizInline(admin.TabularInline):
    model = QuizSection
    fk_name = 'quizsection'
    readonly_fields = ['section_ptr']
    

class QuizQuestionInline(SortableInlineAdminMixin, admin.TabularInline):
#class SectionInline(StackedPolymorphicInline):
#class SectionInline(SortableTabularInline, StackedPolymorphicInline):
    
    model = QuizQuestion
    base_model = QuizQuestion
    #form = SectionForm
    extra = 0
    sortable_field_name = "position"
    show_change_link = True
    
    def has_add_permission(self, request):
        return False


class SectionInline(SortableInlineAdminMixin, admin.TabularInline):
#class SectionInline(StackedPolymorphicInline):
#class SectionInline(SortableTabularInline, StackedPolymorphicInline):
    
    model = Section
    base_model  = Section
    #form = SectionForm
    extra = 0
    sortable_field_name = "position"
    show_change_link = True
    
    def has_add_permission(self, request):
        return False


class LessonInline(SortableInlineAdminMixin, admin.TabularInline):
    model = Lesson
    # form = TopicForm
    extra = 0  # number of extra empty fields to generate (makes things confusing, so ZERO)
    show_change_link = True
    sortable_field_name = "position"

    pass

    
#class TopicInline(SortableTabularInline, PolymorphicInlineSupportMixin, admin.TabularInline ):
class TopicInline(SortableInlineAdminMixin, admin.TabularInline ):
    model = Topic
    #form = TopicForm
    extra = 0 #number of extra empty fields to generate (makes things confusing, so ZERO)
    show_change_link = True
    #inlines = [SectionInline,]
    
    #inline_classes = ("collapse", "open", "grp-collapse", "grp-open",)
    #classes = ['collapse']
    sortable_field_name = "position"
    
    # list_display = ('name', 'changed_date','creation_date',)



    #readonly_fields = ('position',)
    
    
    pass
    
    
# ============================================================
#   Regular Admin interfaces
# ============================================================   

class SectionChildAdmin(PublicationChangeTrackingMixin, PolymorphicChildModelAdmin, SortableAdminMixin):
    #model = Section
    base_model  = Section
    show_in_index = False
    #base_form = SectionForm
    #sortable_field_name = "position"

    exclude = ['position']
    list_display = [
                    'name',
                    'lesson',
                    'creation_date',
                    'changed_date',
                    ]

    list_select_related = (
        'lesson',
    )



class ReadingSectionAdmin(PlaceholderAdminMixin, SectionChildAdmin):
    model = ReadingSection
    base_model  = ReadingSection
    #show_in_index = False
    base_form = ReadingSectionForm

    
    sortable_field_name = "position"
    exclude = ['position', 'created_by', 'changed_by']
    list_display = [
                    'lesson',
                    'name',                    
                    'creation_date',
                    'changed_date',
                    'tag_list',
                    ]

    list_select_related = (
        'lesson',
    )

    list_display_links = ['name']
    
    def tag_list(self, obj):
        return u", ".join(o.name for o in obj.tags.all())



class ActivitySectionAdmin(PlaceholderAdminMixin, SectionChildAdmin):
    model = ActivitySection
    base_model  = ActivitySection
    #show_in_index = False
    sortable_field_name = "position"
    base_form = ActivitySectionForm

    exclude = ['position', 'created_by', 'changed_by']
    list_display = [
        'lesson',
        'name',
        'creation_date',
        'changed_date',
        'tag_list',
    ]

    list_select_related = (
        'lesson',
    )

    list_display_links = ['name']

    def tag_list(self, obj):
        return u", ".join(o.name for o in obj.tags.all())
    

class QuizSectionAdmin(PlaceholderAdminMixin, SectionChildAdmin, SortableAdminMixin):
    base_model = QuizSection
    #show_in_index = False
    sortable_field_name = "position"

    exclude = ['position', 'created_by', 'changed_by']

    list_display = [
                    'lesson',
                    'name',                    
                    'creation_date',
                    'changed_date',
                    ]

    list_select_related = (
        'lesson',
    )

    list_display_links = ['name']
    
    frontend_editable_fields = ("content")
    
    inlines = [QuizQuestionInline,]

#@admin.register(Section)
class SectionParentAdmin(PlaceholderAdminMixin, PolymorphicParentModelAdmin):
    """ The parent model admin """
    base_model = Section
    show_in_index = True
    ordering = ('lesson','name',)

    exclude = ['created_by', 'changed_by']
    child_models = (
        ReadingSection,
        ActivitySection,
        QuizSection
    )

    list_display = [
        'lesson',
        'name',
        'creation_date',
        'changed_date',
        #'tag_list',
    ]

    list_select_related = (
        'lesson',
    )
    
    search_fields = ['name', 'short_name']
    list_filter = (PolymorphicChildModelFilter, 'creation_date', 'tags')
    list_display_links = ['name']
    frontend_editable_fields = ("content")


    
    def get_queryset(self, request):
        return super(SectionParentAdmin, self).get_queryset(request).prefetch_related('tags')

    def tag_list(self, obj):
        return u", ".join(o.name for o in obj.tags.all())
    

class QuizQuestionChildAdmin(PublicationChangeTrackingMixin, PolymorphicChildModelAdmin, SortableAdminMixin, PlaceholderAdminMixin):
    base_model = QuizQuestion
    exclude = ["position", 'created_by', 'changed_by']


class MultiChoice_QuestionAdmin(QuizQuestionChildAdmin, SortableAdminMixin):
    model = MultiChoice_question
    base_model = MultiChoice_question

    sortable_field_name = "position"
    # exclude = ['position']

class MultiSelect_QuestionAdmin(QuizQuestionChildAdmin, SortableAdminMixin):
    model = MultiSelect_question
    base_model = MultiSelect_question

    sortable_field_name = "position"
    # exclude = ['position']

class QuizQuestionParentAdmin(PlaceholderAdminMixin, PolymorphicParentModelAdmin):
    model = QuizQuestion
    base_model = QuizQuestion
    extra = 0
    sortable_field_name = "position"

    child_models = (
        MultiChoice_question,
        MultiSelect_question,
    )


class MultiChoice_AnswerAdmin(PlaceholderAdminMixin, PublicationChangeTrackingMixin, admin.ModelAdmin):
    model = MultiChoice_answer

    sortable_field_name = "position"
    exclude = ['position', 'created_by', 'changed_by']

class MultiSelect_AnswerAdmin(PlaceholderAdminMixin, PublicationChangeTrackingMixin, admin.ModelAdmin):
    model = MultiSelect_answer

    sortable_field_name = "position"
    exclude = ['position', 'created_by', 'changed_by']


class LessonAdmin(PolymorphicInlineSupportMixin, PublicationChangeTrackingMixin, PlaceholderAdminMixin, admin.ModelAdmin):
    model = Lesson
    form = Edit_LessonForm
    ordering = ('topic', 'name',)

    # sortable_field_name = "position"
    list_display = [
        'topic',
        'name',
        'creation_date',
        'changed_date',

    ]

    list_select_related = (
        'topic',
    )

    list_display_links = ['name']

    search_fields = ['name', 'short_name']
    list_filter = ('creation_date',)

    inlines = [SectionInline,]


    # override 'get_form' to have a separate form for adding a new topic
    #       additionally, this may be editable to be contextually aware and
    #       provide different forms between 'Admin' and 'Wizard' views etc.
    def get_form(self, request, obj=None, **kwargs):

        # if this is a new lesson
        if obj is None:
            # check for a passed module id
            curr_module_id = request.GET.get('topic', '')

            # otherwise return the full add topic form
            return add_LessonForm
        else:
            return super(LessonAdmin, self).get_form(request, obj, **kwargs)

#class TopicAdmin(NonSortableParentAdmin, PolymorphicInlineSupportMixin, admin.ModelAdmin):
class TopicAdmin(PolymorphicInlineSupportMixin, PublicationChangeTrackingMixin, PlaceholderAdminMixin, admin.ModelAdmin):
    model = Topic
    form = Edit_TopicForm
    ordering = ('module','name',)

    #sortable_field_name = "position"
    list_display = [
            'module',
            'name',
            'creation_date',
            'changed_date',

        ]

    list_select_related = (
        'module',
    )

    list_display_links = ['name']

    search_fields = ['name', 'short_name']
    list_filter = ('creation_date', )

    # inlines = [SectionInline,]
    inlines = [LessonInline, ]

    # override 'get_form' to have a separate form for adding a new topic
    #       additionally, this may be editable to be contextually aware and
    #       provide different forms between 'Admin' and 'Wizard' views etc.
    def get_form(self, request, obj=None, **kwargs):

        # if this is a new topic
        if obj is None:
            # check for a passed module id
            curr_module_id = request.GET.get('module', '')

            # if there is a module id passed use it as the module_id fk and return the simplified add form

            # otherwise return the full add topic form
            return add_TopicForm
        else:
            return super(TopicAdmin, self).get_form(request, obj, **kwargs)

    # # custom actions for this admin
    # actions = ['delete_with_placeholders']
    #
    # def delete_with_placeholders(self, request, queryset):
    #     print("in delete with placeholders.")
    #     queryset.clear_placeholders()
    #     deleted, deleted_count = queryset.delete()
    #
    #     if deleted_count == 1:
    #         message_bit = "1 story was"
    #     else:
    #         message_bit = "%s stories were" % deleted_count
    #     self.message_user(request, "%s successfully marked as published." % message_bit)
    #
    # # remove the default delete action as it does not account for placeholder clearing
    # # in children
    # def get_actions(self, request):
    #     actions = super(TopicAdmin, self).get_actions(request)
    #
    #     if 'delete_selected' in actions:
    #         del actions['delete_selected']
    #
    #     return actions
    


#class ModuleAdmin(PolymorphicInlineSupportMixin, NonSortableParentAdmin, admin.ModelAdmin):
class ModuleAdmin(PolymorphicInlineSupportMixin, PublicationChangeTrackingMixin, PlaceholderAdminMixin, admin.ModelAdmin):
    model = Module
    form = ModuleForm
    
    # fields to show in the admin interface when viewing all modules list    
    list_display = [
        'name',
        'creation_date',
        'changed_date',
    ]
    
    # filtering functionality on the date fields in admin
    list_filter = [
        'creation_date',
        'changed_date',
        'publish_status'
    ]
    
    # search modules by name in admin
    search_fields = ['name']
    
    inlines = [
            TopicInline,            
        ]


    # # custom actions for this admin
    # actions = ['delete_with_placeholders']
    #
    # def delete_with_placeholders(self, request, queryset):
    #     print("in delete with placeholders.")
    #     #queryset.clear_placeholders()
    #     deleted, deleted_count = queryset.delete()
    #
    #     if deleted_count == 1:
    #         message_bit = "1 story was"
    #     else:
    #         message_bit = "%s stories were" % deleted_count
    #     self.message_user(request, "%s successfully marked as published." % message_bit)



    # # remove the default delete action as it does not account for placeholder clearing
    # # in children
    # def get_actions(self, request):
    #     actions = super(ModuleAdmin, self).get_actions(request)
    #
    #     if 'delete_selected' in actions:
    #         del actions['delete_selected']
    #
    #     return actions





# REGISTER THE ABOVE DEFINED ADMIN OBJECTS
admin.site.register(Topic, TopicAdmin)
admin.site.register(Lesson, LessonAdmin)
admin.site.register(Section, SectionParentAdmin)
admin.site.register(ReadingSection, ReadingSectionAdmin)
admin.site.register(ActivitySection, ActivitySectionAdmin)
admin.site.register(QuizSection, QuizSectionAdmin)

#admin.site.register(LayerRef, LayerRefAdmin)
admin.site.register(Module, ModuleAdmin)


admin.site.register(QuizQuestion, QuizQuestionParentAdmin)
admin.site.register(MultiChoice_answer, MultiChoice_AnswerAdmin)
admin.site.register(MultiSelect_answer, MultiSelect_AnswerAdmin)

# admin.site.register(QuizAnswer, QuizAnswerParentAdmin)

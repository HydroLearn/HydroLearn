from django.forms import ModelChoiceField
from django.contrib import admin
from django.forms import ModelForm, ModelChoiceField, ModelMultipleChoiceField
#from django.utils.translation import ugettext as _

# from cms.admin.placeholderadmin import PlaceholderAdminMixin
#from cms.admin.placeholderadmin import FrontendEditableAdminMixin
#from djangocms_text_ckeditor.widgets import TextEditorWidget
#from src.apps.core.admin_actions import *

from .models.LearningObjModels import Learning_Level, Learning_Verb, Learning_Outcome, \
    Learning_Objective

from src.apps.core.forms import (
    add_LessonForm,
    Edit_LessonForm,
    #SectionForm,
    ReadingSectionForm,
    ActivitySectionForm,
)


from src.apps.core.models.ModuleModels import (
    # Module,
    # Topic,
    Lesson,
    Section,
    Collaboration,

)

from src.apps.core.models.SectionTypeModels import (
    ReadingSection,
    ActivitySection,
    QuizSection,

)

from src.apps.core.models.QuizQuestionModels import (
    QuizQuestion,
    # MultiChoice_question,
    # MultiChoice_answer,
    # MultiSelect_question,
    # MultiSelect_answer
    QuizAnswer,
)

from src.apps.core.models.ResourceModels import (
    Resource,
)

from src.apps.core.models.HS_AppFrameModels import (
    AppReference,
)

from src.apps.uploads.admin import (
    Uploads_ImageAdmin,
)

from src.apps.uploads.models import (
    Image,
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
    '''
        mixin to automate the updating of 'CreationTrackingModel's
        created_by and changed by fields for forms saved in the admin

        stores references to the current user based on if the
        submitted form is a new instance or a changed existing instance
    '''
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

class ReadingInline(admin.TabularInline):
    model = ReadingSection
    fk_name = 'readingsection'
    readonly_fields = ['section_ptr']

class ActivityInline(admin.TabularInline):
    model = ActivitySection
    fk_name = 'activitysection'
    readonly_fields = ['section_ptr']
    
class QuizInline(admin.TabularInline):
    model = QuizSection
    fk_name = 'quizsection'
    readonly_fields = ['section_ptr']
    
# class QuizQuestionInline(SortableInlineAdminMixin, admin.TabularInline):
#     model = QuizQuestion
#     base_model = QuizQuestion
#     #form = SectionForm
#     extra = 0
#     sortable_field_name = "position"
#     show_change_link = True
#
#     def has_add_permission(self, request):
#         return False

class SectionInline(SortableInlineAdminMixin, admin.TabularInline):

    model = Section
    base_model  = Section
    #form = SectionForm
    #fk_name = 'parent_lesson'
    extra = 0
    sortable_field_name = "position"
    show_change_link = True

    # fields = (
    #     'position',
    #     'name',
    #     'short_name',
    #     'duration',
    #     'tags',
    # )

    # must overwrite this method as polymorphic models aren't handled appropriately
    def has_add_permission(self, request):
        return False

class LessonInline(SortableInlineAdminMixin, admin.TabularInline):
    model = Lesson
    fk_name = "parent_lesson"

    verbose_name = "Sub-Lesson"
    verbose_name_plural = "Sub-Lessons"
    # form = Lesson_form
    extra = 0  # number of extra empty fields to generate (makes things confusing, so ZERO)
    show_change_link = True
    sortable_field_name = "position"

    fields = (
        'position',
        'name',
        'short_name',
        'tags',
    )
    # exclude = [
    #      'depth',
    #      'depth_label',
    #      'created_by',
    #      'changed_by',
    # #     'position',
    #  ]


class CollaboratorInline(admin.TabularInline):
    model = Collaboration

    verbose_name = "Collaboration"
    verbose_name_plural = "Collaborations"

    extra = 0

    fields = (
        'collaborator',
        'can_edit',
    )


class AppRefInline(admin.TabularInline):
    model = AppReference

    verbose_name = "Application Reference"
    verbose_name_plural = "Application References"

    extra = 0

    fields = (
        'app_name',
        'app_link',
    )

class QuizQuestionInline(SortableInlineAdminMixin, admin.TabularInline):
    model = QuizQuestion
    fields = ['quiz', 'question_text', 'position']
    verbose_name = "Question"
    verbose_name_plural = "Questions"
    extra = 0

class QuizAnswerInline(SortableInlineAdminMixin, admin.TabularInline):
    model = QuizAnswer
    fields = ['question', 'answer_text', 'is_correct', 'position']
    verbose_name = "Answer"
    verbose_name_plural = "Answers"
    extra = 0



# ============================================================
#   Regular Admin interfaces
# ============================================================   

class SectionChildAdmin(CreationTrackingMixin, PolymorphicChildModelAdmin, SortableAdminMixin):
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

class ReadingSectionAdmin(SectionChildAdmin):
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

class ActivitySectionAdmin(SectionChildAdmin):
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

class QuizSectionAdmin(SectionChildAdmin, SortableAdminMixin):
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

class SectionParentAdmin(PolymorphicParentModelAdmin):
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

class LessonAdmin(PolymorphicInlineSupportMixin, CreationTrackingMixin, admin.ModelAdmin):
    model = Lesson
    form = Edit_LessonForm
    # ordering = ('topic', 'name',)
    ordering = ('name',)
    # sortable_field_name = "position"
    list_display = [
        'parent_lesson',
        'name',
        'creation_date',
        'changed_date',
        #'collaborators',

    ]

    list_select_related = (
        'parent_lesson',
    )

    list_display_links = ['name']

    search_fields = ['name', 'short_name']
    list_filter = ('creation_date',)

    #filter_horizontal = ('collaborators',)

    inlines = [AppRefInline, CollaboratorInline, SectionInline, LessonInline]


    # override 'get_form' to have a separate form for adding a new topic
    #       additionally, this may be editable to be contextually aware and
    #       provide different forms between 'Admin' and 'Wizard' views etc.
    def get_form(self, request, obj=None, **kwargs):

        # if this is a new lesson
        if obj is None:
            # check for a passed module id
            curr_module_id = request.GET.get('parent_lesson', '')

            # otherwise return the full add topic form
            return add_LessonForm
        else:
            return super(LessonAdmin, self).get_form(request, obj, **kwargs)


##############################################
#       Quiz Question admin
##############################################

class QuizQuestionAdmin(SortableInlineAdminMixin, admin.ModelAdmin):
    model = QuizQuestion
    fields = ['quiz', 'question_text', 'position']


##############################################
#       (activity) Resource admin
##############################################
class ResourceAdmin(admin.ModelAdmin):
    model = Resource


##############################################
#       Learning Objective admin forms
##############################################

class Learning_OutcomeAdmin(admin.ModelAdmin):
    model = Learning_Outcome

    sortable_field_name = "outcome"
    list_display = ['outcome']

class Learning_LevelAdmin(admin.ModelAdmin):
    model = Learning_Level

    sortable_field_name = "label"
    list_display = ['label']

class Learning_LevelChoiceField(ModelChoiceField):
     def label_from_instance(self, obj):
         return "%s" % (obj.label)

class Learning_VerbAdminForm(ModelForm):
    level = Learning_LevelChoiceField(queryset=Learning_Level.objects.all())
    class Meta:
        model = Learning_Verb
        fields = ['verb', 'level']

class Learning_VerbAdmin(admin.ModelAdmin):
    form = Learning_VerbAdminForm

    sortable_field_name = "verb"
    list_display = ['verb']

class Learning_VerbChoiceField(ModelChoiceField):
     def label_from_instance(self, obj):
         return "%s" % (obj.verb)

class Learning_OutcomeChoiceField(ModelMultipleChoiceField):
     def label_from_instance(self, obj):
         return "%s" % (obj.outcome)

class Learning_ObjectiveAdminForm(ModelForm):
    verb = Learning_VerbChoiceField(queryset=Learning_Verb.objects.all())
    outcomes = Learning_OutcomeChoiceField(queryset=Learning_Outcome.objects.all())
    class Meta:
        model = Learning_Objective
        fields = ['condition', 'task', 'degree', 'verb', 'outcomes']

class Learning_ObjectiveAdmin(admin.ModelAdmin):
    form = Learning_ObjectiveAdminForm

    list_display = ['condition', 'task', 'degree']




admin.site.register(Image, Uploads_ImageAdmin)

# REGISTER THE ABOVE DEFINED ADMIN OBJECTS
admin.site.register(Lesson, LessonAdmin)
admin.site.register(Section, SectionParentAdmin)
admin.site.register(ReadingSection, ReadingSectionAdmin)
admin.site.register(ActivitySection, ActivitySectionAdmin)
admin.site.register(QuizSection, QuizSectionAdmin)

#admin.site.register(Collaboration)
#admin.site.register(LayerRef, LayerRefAdmin)

admin.site.register(QuizQuestion, QuizQuestionAdmin)
admin.site.register(QuizAnswer)

# admin.site.register(QuizQuestion, QuizQuestionParentAdmin)
# admin.site.register(MultiChoice_answer, MultiChoice_AnswerAdmin)
# admin.site.register(MultiSelect_answer, MultiSelect_AnswerAdmin)

admin.site.register(Resource, ResourceAdmin)

admin.site.register(Learning_Outcome, Learning_OutcomeAdmin)
admin.site.register(Learning_Level, Learning_LevelAdmin)
admin.site.register(Learning_Verb, Learning_VerbAdmin)
admin.site.register(Learning_Objective, Learning_ObjectiveAdmin)
# admin.site.register(QuizAnswer, QuizAnswerParentAdmin)

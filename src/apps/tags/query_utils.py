from src.apps.core.models.ModuleModels import (
    Module,
    Topic,
    Lesson,
    Section,
)

# querymethods for tagging implementation
#context['tagged_modules'] = Module.objects.filter(tags__slug=self.kwargs.get('slug'))
#context['tagged_topics'] = Topic.objects.filter(tags__slug=self.kwargs.get('slug'))
#context['tagged_sections'] =Section.objects.filter(tags__slug=self.kwargs.get('slug'))

# get objects with a specified tag
def get_Modules_With_Tag(tag_slug):
    return Module.objects.filter(tags__slug=tag_slug)
    

def get_Topics_With_Tag(tag_slug):
    return Topic.objects.filter(tags__slug=tag_slug)


def get_Lessons_With_Tag(tag_slug):
    return Lesson.objects.filter(tags__slug=tag_slug)


def get_Sections_With_Tag(tag_slug):
    return Section.objects.filter(tags__slug=tag_slug)
    
    
# get tags for specified objects
def get_Module_Tags(module_slug):
    found_module = Module.objects.filter(slug=module_slug)
    
    if found_module:
        return found_module.tags.all()
    else:
        return None
        
    pass

def get_Topic_Tags(topic_slug):
    
    found_topic = Module.objects.filter(slug=topic_slug)
    
    if found_topic:
        return found_topic.tags.all()
    else:
        return None
    
    
    pass

def get_Section_Tags(section_slug):
    
    found_section = Module.objects.filter(slug=section_slug)
    
    if found_section:
        return found_section.tags.all()
    else:
        return None
    
    pass

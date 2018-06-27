

# def create_initial_text_placeholder(sender, **kwargs):
#     if kwargs['created']:
#         print(f'--> created a new ')
#
#         # # create a new text plugin and add it to the newly created instance
#         # add_plugin(
#         #     placeholder = kwargs['instance'].content,
#         #     plugin_type = 'TextPlugin',
#         #     language = kwargs['instance'].language_code,
#         #     body = '<p>New Section Created</p>'
#         # )
#         # print(f'----> created a new plugin for new instance')
#         #
#

'''
    reciever to trigger clearing of placeholder fields for any sender model that requires it

    model sending signal must contain a 'clear_placeholderfields' method which calls 'clear()' on
    each of it's required placeholderfields
'''
#from cms.models import PlaceholderField


# def module_pre_save_handler(sender, instance, *args, **kwargs):
#     print("in module PRE_SAVE")
#     # some case
#     if instance.is_draft:
#
#         raise Exception('OMG')

# def clear_placeholderfields(sender, instance, **kwargs):
#     # instance_fields = instance._meta.get_fields()
#     #
#     #
#     # for field in instance_fields:
#     #     if type(field) == PlaceholderField:
#     #         print('i found one?')
#     #         #print(dir(field))
#     #         print(field.model)
#     #
#     #         field.clear()
#     #         field.delete()
#     #
#     #         print('and i deleted it?!?')
#     #
#     # raise NotImplementedError('please dont break anything')
#
#     cleanup_method = getattr(instance, "cleanup_placeholders", None)
#     if callable(cleanup_method):
#         instance.cleanup_placeholders()

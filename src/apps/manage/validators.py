from django.core.exceptions import ValidationError

def validate_name(value):
    if value == "":
        raise ValidationError("Name is a required field!")
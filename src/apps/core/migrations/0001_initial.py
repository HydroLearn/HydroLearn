# -*- coding: utf-8 -*-
# Generated by Django 1.11.15 on 2019-01-17 22:40
from __future__ import unicode_literals

import datetime
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django_extensions.db.fields
import taggit.managers
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('taggit', '0002_auto_20150616_2121'),
        ('contenttypes', '0002_remove_content_type_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AppReference',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('changed_date', models.DateTimeField(auto_now=True)),
                ('app_name', models.CharField(default='', help_text='Display Text for Application in your module (Tab Text)', max_length=255, verbose_name='App Name')),
                ('app_link', models.URLField(default='', help_text='Please supply a URL to a valid HydroShare Hosted Application', verbose_name='Application URL')),
            ],
            options={
                'verbose_name': 'Application Reference',
                'verbose_name_plural': 'Application Reference',
            },
        ),
        migrations.CreateModel(
            name='Collaboration',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('can_edit', models.BooleanField(default=True, help_text='Allow this person edit the Lesson? if not checked, user will only be given view permissions to the Draft.')),
                ('collaboration_date', models.DateField(auto_now_add=True)),
                ('collaborator', models.ForeignKey(help_text='User being given Draft-View Permissions.', on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Collaboration',
                'verbose_name_plural': 'Collaborations',
            },
        ),
        migrations.CreateModel(
            name='Learning_Level',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=64)),
                ('definition', models.CharField(max_length=256)),
            ],
        ),
        migrations.CreateModel(
            name='Learning_Objective',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('changed_date', models.DateTimeField(auto_now=True)),
                ('condition', models.TextField()),
                ('task', models.TextField()),
                ('degree', models.TextField()),
                ('changed_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='changed_learning_objectives', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_learning_objectives', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Learning_Outcome',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('outcome', models.CharField(max_length=256)),
            ],
        ),
        migrations.CreateModel(
            name='Learning_Verb',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('verb', models.CharField(max_length=64)),
                ('default', models.BooleanField(default=False)),
                ('level', models.ForeignKey(help_text='Specify the learning level for this verb.', on_delete=django.db.models.deletion.CASCADE, related_name='verbs', to='core.Learning_Level')),
            ],
        ),
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('changed_date', models.DateTimeField(auto_now=True)),
                ('pub_id', models.UUIDField(default=uuid.uuid4, editable=False)),
                ('is_draft', models.BooleanField(db_index=True, default=True, editable=False)),
                ('publish_status', models.CharField(choices=[('draft_only', 'Draft Only'), ('draft_published', 'Published Draft'), ('current_publication', 'Current Publication'), ('past_publication', 'Previously Published Copy')], default='draft_only', editable=False, max_length=25)),
                ('published_date', models.DateTimeField(blank=True, default=None, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('ref_id', models.UUIDField(default=uuid.uuid4, editable=False)),
                ('position', models.PositiveIntegerField(default=0)),
                ('depth', models.PositiveIntegerField(default=0)),
                ('depth_label', models.CharField(default='Module', help_text='The depth-level label for this lesson', max_length=10, verbose_name='Depth Label')),
                ('name', models.CharField(default='', help_text='Please enter a name for this Lesson', max_length=250, verbose_name='Lesson Name')),
                ('short_name', models.CharField(blank=True, default='', help_text="(OPTIONAL) A shortened version of this lesson's name for use in lesson listings", max_length=250, verbose_name='Lesson Short Name')),
                ('slug', django_extensions.db.fields.AutoSlugField(blank=True, default='', editable=False, help_text='Please enter a unique slug for this Lesson (can autogenerate from name field)', max_length=8, populate_from=('ref_id',), unique=True, verbose_name='slug')),
                ('summary', models.TextField(blank=True, default='', help_text='Enter the content for this lesson summary', verbose_name='Lesson Summary')),
                ('derived_date', models.DateTimeField(null=True)),
                ('derived_lesson_slug', models.CharField(default=None, editable=False, max_length=8, null=True)),
                ('changed_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='changed_lessons', to=settings.AUTH_USER_MODEL)),
                ('collaborators', models.ManyToManyField(related_name='collaborations', through='core.Collaboration', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_lessons', to=settings.AUTH_USER_MODEL)),
                ('derived_lesson_creator', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='inspired_lessons', to=settings.AUTH_USER_MODEL)),
                ('parent_lesson', models.ForeignKey(blank=True, default=None, help_text='Specify a Parent Lesson for this Sub-Lesson.', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sub_lessons', to='core.Lesson')),
                ('published_copy', models.OneToOneField(editable=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='draft_copy', to='core.Lesson')),
                ('tags', taggit.managers.TaggableManager(blank=True, help_text='A comma-separated list of tags.', through='taggit.TaggedItem', to='taggit.Tag', verbose_name='Tags')),
            ],
            options={
                'ordering': ('position',),
                'verbose_name_plural': 'Lessons',
            },
        ),
        migrations.CreateModel(
            name='QuizAnswer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ref_id', models.UUIDField(default=uuid.uuid4, editable=False)),
                ('position', models.PositiveIntegerField(default=0)),
                ('answer_text', models.TextField(default='')),
                ('is_correct', models.BooleanField()),
            ],
            options={
                'verbose_name': 'Quiz-Answer',
                'verbose_name_plural': 'Quiz-Answers',
            },
        ),
        migrations.CreateModel(
            name='QuizQuestion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_type', models.CharField(choices=[('multi-choice', 'Multiple Choice'), ('multi-select', 'Multiple Selection')], default='multi-choice', max_length=25)),
                ('ref_id', models.UUIDField(default=uuid.uuid4, editable=False)),
                ('position', models.PositiveIntegerField(default=0)),
                ('question_text', models.TextField(default='')),
            ],
            options={
                'verbose_name': 'Quiz-Question',
                'ordering': ('position',),
                'verbose_name_plural': 'Quiz-Questions',
            },
        ),
        migrations.CreateModel(
            name='Resource',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('display_text', models.CharField(blank=True, default='', help_text="Display Text for resource link (defaults to 'Resource Link url')", max_length=255, verbose_name='Resource Display Text')),
                ('resource_type', models.CharField(default='', help_text='Please supply a HydroShare Resource type', max_length=64, verbose_name='Resource Type')),
                ('resource_link', models.URLField(default='', help_text='Please supply a Resource URL', verbose_name='Resource Link')),
            ],
            options={
                'verbose_name': 'Resource',
                'verbose_name_plural': 'Resources',
            },
        ),
        migrations.CreateModel(
            name='Section',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('changed_date', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('ref_id', models.UUIDField(default=uuid.uuid4, editable=False)),
                ('position', models.PositiveIntegerField(default=0)),
                ('name', models.CharField(default='', help_text='Please enter a name for this Section', max_length=250, verbose_name='Section Name')),
                ('short_name', models.CharField(blank=True, default='', help_text="(OPTIONAL) A shortened version of this section's name for use in section listings", max_length=250, verbose_name='Section Short Name')),
                ('slug', django_extensions.db.fields.AutoSlugField(blank=True, default='', editable=False, help_text='Please enter a unique slug for this Section (can autogenerate from name field)', max_length=8, populate_from=('ref_id',), unique=True, verbose_name='slug')),
                ('duration', models.DurationField(default=datetime.timedelta(0), help_text='Please specify the Expected Duration of this section. (format: HH:MM:SS)')),
            ],
            options={
                'manager_inheritance_from_future': True,
                'ordering': ('position',),
                'verbose_name_plural': 'Sections',
            },
        ),
        migrations.CreateModel(
            name='ActivitySection',
            fields=[
                ('section_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='core.Section')),
                ('content', models.TextField(blank=True, default='', help_text='Enter the content for this section.', verbose_name='Activity Content')),
            ],
            options={
                'manager_inheritance_from_future': True,
                'verbose_name': 'Activity Section',
                'verbose_name_plural': 'Activity Sections',
            },
            bases=('core.section',),
        ),
        migrations.CreateModel(
            name='QuizSection',
            fields=[
                ('section_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='core.Section')),
            ],
            options={
                'manager_inheritance_from_future': True,
                'verbose_name': 'Quiz Section',
                'verbose_name_plural': 'Quiz Sections',
            },
            bases=('core.section',),
        ),
        migrations.CreateModel(
            name='ReadingSection',
            fields=[
                ('section_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='core.Section')),
                ('content', models.TextField(blank=True, default='', help_text='Enter the content for this section.', verbose_name='Reading Content')),
            ],
            options={
                'manager_inheritance_from_future': True,
                'verbose_name': 'Reading Section',
                'verbose_name_plural': 'Reading Sections',
            },
            bases=('core.section',),
        ),
        migrations.AddField(
            model_name='section',
            name='changed_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='changed_sections', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='section',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_sections', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='section',
            name='lesson',
            field=models.ForeignKey(default=None, help_text='Please specify the Lesson for this section.', on_delete=django.db.models.deletion.CASCADE, related_name='sections', to='core.Lesson'),
        ),
        migrations.AddField(
            model_name='section',
            name='polymorphic_ctype',
            field=models.ForeignKey(editable=False, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='polymorphic_core.section_set+', to='contenttypes.ContentType'),
        ),
        migrations.AddField(
            model_name='section',
            name='tags',
            field=taggit.managers.TaggableManager(blank=True, help_text='A comma-separated list of tags.', through='taggit.TaggedItem', to='taggit.Tag', verbose_name='Tags'),
        ),
        migrations.AddField(
            model_name='quizanswer',
            name='question',
            field=models.ForeignKey(default=None, help_text='Please specify a Quiz Question to map this answer to.', on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='core.QuizQuestion'),
        ),
        migrations.AddField(
            model_name='learning_objective',
            name='lesson',
            field=models.ForeignKey(help_text='Specify a lesson for this Learning Objective.', on_delete=django.db.models.deletion.CASCADE, related_name='learning_objectives', to='core.Lesson'),
        ),
        migrations.AddField(
            model_name='learning_objective',
            name='outcomes',
            field=models.ManyToManyField(blank=True, to='core.Learning_Outcome'),
        ),
        migrations.AddField(
            model_name='learning_objective',
            name='verb',
            field=models.ForeignKey(help_text='Specify a verb for this Learning Objective', on_delete=django.db.models.deletion.CASCADE, to='core.Learning_Verb'),
        ),
        migrations.AddField(
            model_name='collaboration',
            name='publication',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.Lesson'),
        ),
        migrations.AddField(
            model_name='appreference',
            name='lesson',
            field=models.ForeignKey(default=None, help_text='Please specify the parent Lesson for this Application.', on_delete=django.db.models.deletion.CASCADE, related_name='app_refs', to='core.Lesson'),
        ),
        migrations.AddField(
            model_name='resource',
            name='activity',
            field=models.ForeignKey(default=None, help_text='Please specify the Activity Section for this Resource.', on_delete=django.db.models.deletion.CASCADE, related_name='resources', to='core.ActivitySection'),
        ),
        migrations.AddField(
            model_name='quizquestion',
            name='quiz',
            field=models.ForeignKey(default=None, help_text='Please specify a Quiz Section to map this question to.', on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='core.QuizSection'),
        ),
        migrations.AlterUniqueTogether(
            name='collaboration',
            unique_together=set([('publication', 'collaborator')]),
        ),
    ]

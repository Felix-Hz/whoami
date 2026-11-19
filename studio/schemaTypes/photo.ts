import {defineArrayMember, defineField, defineType} from 'sanity'

// Created by scripts/photos.py, which uploads the image files to S3 and fills the file fields.
// The image itself never lives in Sanity, so no full-resolution copy is reachable from its CDN.
export default defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  fieldsets: [
    {name: 'file', title: 'Published file', options: {collapsible: true, collapsed: true}},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Also the alt text.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'display',
      title: 'Show in gallery',
      type: 'boolean',
      description: 'Off hides the photo from the site on the next rebuild; its files and details stay.',
      initialValue: true,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description:
        'Lower numbers come first in the gallery. Unique; decimals slot a photo between two others (2.5).',
      validation: (rule) =>
        rule
          .required()
          .positive()
          .custom(async (value, context) => {
            if (typeof value !== 'number') return true
            const id = (context.document?._id ?? '').replace(/^drafts\./, '')
            const taken = await context
              .getClient({apiVersion: '2025-02-06'})
              .fetch<number>(
                'count(*[_type == "photo" && sortOrder == $value && !(_id in [$id, "drafts." + $id])])',
                {value, id},
              )
            return taken === 0 || `Another photo already uses ${value}`
          }),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Shown as "@ location"; left empty, the site says "@ unknown".',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'Felix Hernandez Vieyra',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'camera', title: 'Camera', type: 'string'}),
    defineField({name: 'lens', title: 'Lens', type: 'string'}),
    defineField({
      name: 'exposure',
      title: 'Exposure',
      type: 'string',
      description: 'Focal length · shutter · aperture · ISO',
    }),
    defineField({
      name: 'imageId',
      title: 'Image ID',
      type: 'string',
      fieldset: 'file',
      readOnly: true,
      validation: (rule) => rule.required().regex(/^[0-9a-f]{32}$/),
    }),
    defineField({
      name: 'width',
      title: 'Width of the largest file',
      type: 'number',
      fieldset: 'file',
      readOnly: true,
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'height',
      title: 'Height of the largest file',
      type: 'number',
      fieldset: 'file',
      readOnly: true,
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'edges',
      title: 'Published long edges',
      type: 'array',
      of: [defineArrayMember({type: 'number'})],
      fieldset: 'file',
      readOnly: true,
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'color',
      title: 'Average colour',
      type: 'string',
      fieldset: 'file',
      readOnly: true,
      validation: (rule) => rule.required().regex(/^#[0-9a-f]{6}$/),
    }),
  ],
  orderings: [
    {title: 'Gallery order', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]},
    {title: 'Newest', name: 'createdDesc', by: [{field: '_createdAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', sortOrder: 'sortOrder', location: 'location', display: 'display'},
    prepare({title, sortOrder, location, display}) {
      const hidden = display === false ? 'hidden · ' : ''
      return {title, subtitle: `${hidden}${sortOrder ?? '-'} · ${location || 'unknown'}`}
    },
  },
})

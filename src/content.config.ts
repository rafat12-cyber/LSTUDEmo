import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const notices = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notices' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['Admission', 'Exam', 'General', 'Tender', 'Recruitment']),
    pdf: z.string().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    type: z.enum(['News', 'Event']).default('News'),
  }),
});

const departments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/departments' }),
  schema: z.object({
    name: z.string(),
    short: z.string(),
    faculty: z.string(),
    order: z.number().default(0),
    programs: z.array(z.string()),
    seats: z.number(),
  }),
});

export const collections = { notices, news, departments };

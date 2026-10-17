import { z } from 'zod';

export const contactInquirySchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  phone: z
    .string()
    .trim()
    .max(25, { message: 'Phone number cannot exceed 25 characters' })
    .optional()
    .nullable(),
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(3, { message: 'Subject must be at least 3 characters long' })
    .max(200, { message: 'Subject cannot exceed 200 characters' }),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(10, { message: 'Message must be at least 10 characters long' })
    .max(3000, { message: 'Message cannot exceed 3000 characters' }),
});

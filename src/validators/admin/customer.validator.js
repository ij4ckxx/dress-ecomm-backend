import { z } from 'zod';

const optionalAvatarUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url('Avatar URL must be a valid URL').optional().nullable()
);

const coerceBoolean = (defaultVal) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      if (v.toLowerCase() === 'true') return true;
      if (v.toLowerCase() === 'false') return false;
    }
    return v;
  }, defaultVal !== undefined ? z.boolean().default(defaultVal) : z.boolean().optional());

export const customerParamIdSchema = z.object({
  id: z.string({ required_error: 'Customer ID is required' }).uuid('Invalid Customer ID format'),
});

export const queryAdminCustomersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'totalSpent', 'orderCount', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export const createAdminCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters')
    .optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  avatarUrl: optionalAvatarUrl,
  address: z
    .object({
      firstName: z.string().trim().min(1).max(50),
      lastName: z.string().trim().min(1).max(50),
      company: z.string().trim().max(100).optional().nullable(),
      address1: z.string().trim().min(3).max(255),
      address2: z.string().trim().max(255).optional().nullable(),
      city: z.string().trim().min(2).max(100),
      state: z.string().trim().min(2).max(100),
      postalCode: z.string().trim().min(3).max(20),
      country: z.string().trim().min(2).max(100).default('India'),
      phoneNumber: z.string().trim().max(20).optional().nullable(),
    })
    .optional(),
});

export const updateAdminCustomerSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  password: z.string().min(8).max(100).optional(),
  avatarUrl: optionalAvatarUrl,
  isActive: coerceBoolean(),
});

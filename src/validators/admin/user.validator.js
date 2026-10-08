import { z } from 'zod';
import { ROLES } from '../../constants/roles.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const allPermissionValues = Object.values(PERMISSIONS);

export const createAdminUserSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z
    .nativeEnum(ROLES, {
      required_error: 'Role is required',
      invalid_type_error: 'Invalid role specified',
    }),
  phone: z
    .string()
    .trim()
    .optional(),
  permissions: z
    .array(z.string().refine((val) => allPermissionValues.includes(val), {
      message: 'Invalid permission code supplied',
    }))
    .optional()
    .default([]),
});

export const updateAdminUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().optional(),
  permissions: z
    .array(z.string().refine((val) => allPermissionValues.includes(val), {
      message: 'Invalid permission code supplied',
    }))
    .optional(),
  isActive: z.boolean().optional(),
});

export const queryAdminUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.nativeEnum(ROLES).optional(),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

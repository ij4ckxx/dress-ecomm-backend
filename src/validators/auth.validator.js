import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

export const registerSchema = z.object({
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
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password cannot exceed 100 characters' })
    .regex(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  phone: z
    .string()
    .trim()
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .url({ message: 'Avatar must be a valid URL' })
    .optional()
    .nullable(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password is required' }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  token: z
    .string({ required_error: 'Reset token is required' })
    .trim()
    .min(10, { message: 'A valid reset token is required' }),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password cannot exceed 100 characters' })
    .regex(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
});

export const socialLoginSchema = z
  .object({
    provider: z.enum(['google', 'facebook', 'github', 'apple'], {
      required_error: 'Provider is required (google, facebook, github, apple)',
    }),
    token: z.string().trim().optional(),
    providerAccountId: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: 'Please provide a valid email address' })
      .optional(),
    name: z.string().trim().max(100).optional(),
    avatarUrl: z.string().trim().url({ message: 'Avatar must be a valid URL' }).optional().nullable(),
  })
  .refine(
    (data) => Boolean(data.token || (data.providerAccountId && data.email)),
    {
      message: 'Either an OAuth token OR both providerAccountId and email must be provided',
      path: ['token'],
    }
  );


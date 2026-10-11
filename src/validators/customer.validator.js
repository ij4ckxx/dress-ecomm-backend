import { z } from 'zod';

/**
 * Default field configuration rules for Customer Account Details.
 * Designed to be extensible so the admin panel can dynamically configure
 * required/optional status in future iterations without refactoring controllers.
 */
export const ACCOUNT_FIELD_CONFIG = {
  firstName: {
    required: true,
    minLength: 1,
    maxLength: 50,
  },
  lastName: {
    required: true,
    minLength: 1,
    maxLength: 50,
  },
  email: {
    required: true,
    maxLength: 255,
  },
  phoneNumber: {
    required: false,
    minLength: 7,
    maxLength: 20,
    pattern: /^[+]?[0-9\s\-()]{7,20}$/,
  },
};

/**
 * Schema for updating Customer Account Details
 * Supports both `phoneNumber` and `phone` for frontend flexibility.
 */
export const updateAccountDetailsSchema = z
  .object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(ACCOUNT_FIELD_CONFIG.firstName.minLength, { message: 'First name is required' })
      .max(ACCOUNT_FIELD_CONFIG.firstName.maxLength, {
        message: `First name cannot exceed ${ACCOUNT_FIELD_CONFIG.firstName.maxLength} characters`,
      }),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(ACCOUNT_FIELD_CONFIG.lastName.minLength, { message: 'Last name is required' })
      .max(ACCOUNT_FIELD_CONFIG.lastName.maxLength, {
        message: `Last name cannot exceed ${ACCOUNT_FIELD_CONFIG.lastName.maxLength} characters`,
      }),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email({ message: 'Please provide a valid email address' })
      .max(ACCOUNT_FIELD_CONFIG.email.maxLength, { message: 'Email is too long' }),
    phoneNumber: z
      .string()
      .trim()
      .regex(ACCOUNT_FIELD_CONFIG.phoneNumber.pattern, {
        message: 'Please provide a valid phone number (7-20 digits)',
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .regex(ACCOUNT_FIELD_CONFIG.phoneNumber.pattern, {
        message: 'Please provide a valid phone number (7-20 digits)',
      })
      .optional()
      .nullable()
      .or(z.literal('')),
  });

/**
 * Schema for Changing Customer Password
 * Enforces strong password rules and verifies that the new password differs from the current one.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, { message: 'Current password is required' }),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, { message: 'New password must be at least 8 characters long' })
      .max(100, { message: 'New password cannot exceed 100 characters' })
      .regex(/[A-Za-z]/, { message: 'New password must contain at least one letter' })
      .regex(/[0-9]/, { message: 'New password must contain at least one number' }),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

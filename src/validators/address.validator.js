import { z } from 'zod';

/**
 * Default field configuration rules for Customer Addresses.
 * Extensible for future Admin Panel dynamic configurability (e.g. required vs optional).
 */
export const ADDRESS_FIELD_CONFIG = {
  firstName: { required: true, minLength: 1, maxLength: 50 },
  lastName: { required: true, minLength: 1, maxLength: 50 },
  company: { required: false, maxLength: 100 },
  address1: { required: true, minLength: 1, maxLength: 255 },
  address2: { required: false, maxLength: 255 },
  city: { required: true, minLength: 1, maxLength: 100 },
  state: { required: true, minLength: 1, maxLength: 100 },
  postalCode: { required: true, minLength: 2, maxLength: 20 },
  country: { required: true, minLength: 1, maxLength: 100 },
  phoneNumber: {
    required: false,
    minLength: 7,
    maxLength: 20,
    pattern: /^[+]?[0-9\s\-()]{7,20}$/,
  },
};

/**
 * Schema for Creating a new Customer Address
 */
export const createAddressSchema = z
  .object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(ADDRESS_FIELD_CONFIG.firstName.minLength, { message: 'First name is required' })
      .max(ADDRESS_FIELD_CONFIG.firstName.maxLength, {
        message: `First name cannot exceed ${ADDRESS_FIELD_CONFIG.firstName.maxLength} characters`,
      }),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(ADDRESS_FIELD_CONFIG.lastName.minLength, { message: 'Last name is required' })
      .max(ADDRESS_FIELD_CONFIG.lastName.maxLength, {
        message: `Last name cannot exceed ${ADDRESS_FIELD_CONFIG.lastName.maxLength} characters`,
      }),
    company: z
      .string()
      .trim()
      .max(ADDRESS_FIELD_CONFIG.company.maxLength, {
        message: `Company cannot exceed ${ADDRESS_FIELD_CONFIG.company.maxLength} characters`,
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    address1: z
      .string({ required_error: 'Address line 1 is required' })
      .trim()
      .min(ADDRESS_FIELD_CONFIG.address1.minLength, { message: 'Address line 1 is required' })
      .max(ADDRESS_FIELD_CONFIG.address1.maxLength, {
        message: `Address line 1 cannot exceed ${ADDRESS_FIELD_CONFIG.address1.maxLength} characters`,
      }),
    address2: z
      .string()
      .trim()
      .max(ADDRESS_FIELD_CONFIG.address2.maxLength, {
        message: `Address line 2 cannot exceed ${ADDRESS_FIELD_CONFIG.address2.maxLength} characters`,
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(ADDRESS_FIELD_CONFIG.city.minLength, { message: 'City is required' })
      .max(ADDRESS_FIELD_CONFIG.city.maxLength, {
        message: `City cannot exceed ${ADDRESS_FIELD_CONFIG.city.maxLength} characters`,
      }),
    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(ADDRESS_FIELD_CONFIG.state.minLength, { message: 'State is required' })
      .max(ADDRESS_FIELD_CONFIG.state.maxLength, {
        message: `State cannot exceed ${ADDRESS_FIELD_CONFIG.state.maxLength} characters`,
      }),
    postalCode: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.postalCode.minLength, { message: 'Postal code / pincode is required' })
      .max(ADDRESS_FIELD_CONFIG.postalCode.maxLength, {
        message: `Postal code cannot exceed ${ADDRESS_FIELD_CONFIG.postalCode.maxLength} characters`,
      })
      .optional(),
    pincode: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.postalCode.minLength)
      .max(ADDRESS_FIELD_CONFIG.postalCode.maxLength)
      .optional(),
    country: z
      .string({ required_error: 'Country is required' })
      .trim()
      .min(ADDRESS_FIELD_CONFIG.country.minLength, { message: 'Country is required' })
      .max(ADDRESS_FIELD_CONFIG.country.maxLength, {
        message: `Country cannot exceed ${ADDRESS_FIELD_CONFIG.country.maxLength} characters`,
      }),
    phoneNumber: z
      .string()
      .trim()
      .regex(ADDRESS_FIELD_CONFIG.phoneNumber.pattern, {
        message: 'Please provide a valid phone number (7-20 digits)',
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .regex(ADDRESS_FIELD_CONFIG.phoneNumber.pattern, {
        message: 'Please provide a valid phone number (7-20 digits)',
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    isDefault: z.boolean().optional().default(false),
  })
  .refine((data) => Boolean(data.postalCode || data.pincode), {
    message: 'Postal code / pincode is required',
    path: ['postalCode'],
  });

/**
 * Schema for Updating an existing Customer Address (Partial updates allowed)
 */
export const updateAddressSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.firstName.minLength, { message: 'First name cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.firstName.maxLength, {
        message: `First name cannot exceed ${ADDRESS_FIELD_CONFIG.firstName.maxLength} characters`,
      })
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.lastName.minLength, { message: 'Last name cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.lastName.maxLength, {
        message: `Last name cannot exceed ${ADDRESS_FIELD_CONFIG.lastName.maxLength} characters`,
      })
      .optional(),
    company: z
      .string()
      .trim()
      .max(ADDRESS_FIELD_CONFIG.company.maxLength, {
        message: `Company cannot exceed ${ADDRESS_FIELD_CONFIG.company.maxLength} characters`,
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    address1: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.address1.minLength, { message: 'Address line 1 cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.address1.maxLength, {
        message: `Address line 1 cannot exceed ${ADDRESS_FIELD_CONFIG.address1.maxLength} characters`,
      })
      .optional(),
    address2: z
      .string()
      .trim()
      .max(ADDRESS_FIELD_CONFIG.address2.maxLength, {
        message: `Address line 2 cannot exceed ${ADDRESS_FIELD_CONFIG.address2.maxLength} characters`,
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    city: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.city.minLength, { message: 'City cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.city.maxLength, {
        message: `City cannot exceed ${ADDRESS_FIELD_CONFIG.city.maxLength} characters`,
      })
      .optional(),
    state: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.state.minLength, { message: 'State cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.state.maxLength, {
        message: `State cannot exceed ${ADDRESS_FIELD_CONFIG.state.maxLength} characters`,
      })
      .optional(),
    postalCode: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.postalCode.minLength, { message: 'Postal code cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.postalCode.maxLength, {
        message: `Postal code cannot exceed ${ADDRESS_FIELD_CONFIG.postalCode.maxLength} characters`,
      })
      .optional(),
    pincode: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.postalCode.minLength)
      .max(ADDRESS_FIELD_CONFIG.postalCode.maxLength)
      .optional(),
    country: z
      .string()
      .trim()
      .min(ADDRESS_FIELD_CONFIG.country.minLength, { message: 'Country cannot be empty' })
      .max(ADDRESS_FIELD_CONFIG.country.maxLength, {
        message: `Country cannot exceed ${ADDRESS_FIELD_CONFIG.country.maxLength} characters`,
      })
      .optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(ADDRESS_FIELD_CONFIG.phoneNumber.pattern, {
        message: 'Please provide a valid phone number (7-20 digits)',
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .regex(ADDRESS_FIELD_CONFIG.phoneNumber.pattern, {
        message: 'Please provide a valid phone number (7-20 digits)',
      })
      .optional()
      .nullable()
      .or(z.literal('')),
    isDefault: z.boolean().optional(),
  });

/**
 * Route parameter validation schema for addressId
 */
export const addressIdParamSchema = z.object({
  addressId: z
    .string({ required_error: 'Address ID is required' })
    .uuid({ message: 'Invalid address ID format' }),
});

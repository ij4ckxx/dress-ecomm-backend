import { z } from 'zod';

export const updateStoreSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(100).optional(),
  tagline: z.string().trim().max(200).optional().nullable(),
  currency: z.string().trim().length(3).default('INR').optional(),
  currencySymbol: z.string().trim().max(5).default('₹').optional(),
  supportEmail: z.string().trim().email('Invalid email address').optional(),
  supportPhone: z.string().trim().max(30).optional().nullable(),
  freeShippingThreshold: z.coerce.number().min(0).optional(),
  flatShippingRate: z.coerce.number().min(0).optional(),
  policiesJson: z.record(z.any()).optional().nullable(),
});

export const updateThemeSchema = z.object({
  themeId: z
    .string({ required_error: 'Theme ID is required' })
    .trim()
    .min(3, 'Theme ID must be at least 3 characters')
    .max(50, 'Theme ID cannot exceed 50 characters'),
});

export const updateFeatureFlagsSchema = z.object({
  features: z.record(z.boolean(), {
    required_error: 'Features dictionary is required',
  }),
});

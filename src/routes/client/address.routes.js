import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateParams } from '../../middlewares/validate.js';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from '../../validators/address.validator.js';
import {
  createAddress,
  getAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
} from '../../controllers/client/address.controller.js';

const router = Router();

// All address routes require customer authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/customer/addresses (or /api/customer/addresses)
 * @desc    Create a new address for the authenticated customer
 * @access  Private (Authenticated Customer)
 */
router.post('/', validate(createAddressSchema), createAddress);

/**
 * @route   GET /api/v1/customer/addresses (or /api/customer/addresses)
 * @desc    Get all saved addresses for the authenticated customer
 * @access  Private (Authenticated Customer)
 */
router.get('/', getAddresses);

/**
 * @route   GET /api/v1/customer/addresses/:addressId (or /api/customer/addresses/:addressId)
 * @desc    Get a single address by ID (must belong to customer)
 * @access  Private (Authenticated Customer)
 */
router.get('/:addressId', validateParams(addressIdParamSchema), getAddressById);

/**
 * @route   PATCH /api/v1/customer/addresses/:addressId (or /api/customer/addresses/:addressId)
 * @desc    Partially update an existing address
 * @access  Private (Authenticated Customer)
 */
router.patch(
  '/:addressId',
  validateParams(addressIdParamSchema),
  validate(updateAddressSchema),
  updateAddress
);
router.put(
  '/:addressId',
  validateParams(addressIdParamSchema),
  validate(updateAddressSchema),
  updateAddress
);

/**
 * @route   DELETE /api/v1/customer/addresses/:addressId (or /api/customer/addresses/:addressId)
 * @desc    Delete an existing address
 * @access  Private (Authenticated Customer)
 */
router.delete('/:addressId', validateParams(addressIdParamSchema), deleteAddress);

export default router;

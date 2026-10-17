import { Router } from 'express';
import { submitContactInquiry } from '../../controllers/client/contact.controller.js';
import { validate } from '../../middlewares/validate.js';
import { contactInquirySchema } from '../../validators/contact.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/contact (or /api/contact)
 * @desc    Submit a customer concierge inquiry or support message
 * @access  Public
 */
router.post('/', validate(contactInquirySchema), submitContactInquiry);

export default router;

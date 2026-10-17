import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { createContactInquiryService } from '../../services/client/contact.service.js';

/**
 * Controller to handle customer contact / concierge inquiry submission
 * POST /api/v1/contact
 */
export const submitContactInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const inquiry = await createContactInquiryService({
      name,
      email,
      phone,
      subject,
      message,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Thank you for reaching out. Our concierge team has received your message and will respond shortly.',
      data: { inquiry },
    });
  } catch (error) {
    next(error);
  }
};

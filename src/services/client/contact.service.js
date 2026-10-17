import prisma from '../../config/db.js';
import { sendContactInquiryEmails } from '../notification/email.service.js';

/**
 * Creates a customer inquiry record and dispatches email notifications
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string|null} [params.phone]
 * @param {string} params.subject
 * @param {string} params.message
 * @returns {Promise<object>}
 */
export const createContactInquiryService = async ({
  name,
  email,
  phone = null,
  subject,
  message,
}) => {
  const inquiry = await prisma.customerInquiry.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      createdAt: true,
    },
  });

  // Asynchronously dispatch email alerts (store support + customer acknowledgment)
  sendContactInquiryEmails({
    inquiry: {
      id: inquiry.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
    },
  }).catch((err) => console.error('[CONTACT INQUIRY EMAIL ERROR]:', err));

  return inquiry;
};

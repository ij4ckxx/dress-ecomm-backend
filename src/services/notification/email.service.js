import { ENV } from '../../config/env.js';

let transporter = null;
let nodemailerMod = null;

/**
 * Initializes or returns the cached Nodemailer transporter
 * @returns {Promise<object|null>}
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
    try {
      if (!nodemailerMod) {
        const mod = await import('nodemailer').catch(() => null);
        nodemailerMod = mod?.default || mod;
      }
      if (nodemailerMod) {
        transporter = nodemailerMod.createTransport({
          host: ENV.SMTP_HOST,
          port: ENV.SMTP_PORT,
          secure: ENV.SMTP_PORT === 465,
          auth: {
            user: ENV.SMTP_USER,
            pass: ENV.SMTP_PASS,
          },
        });
      }
    } catch (err) {
      console.warn('[NODEMAILER INIT WARN]:', err.message);
    }
  }

  return transporter;
};

/**
 * Safely dispatches an email or falls back to server logging
 * @param {object} mailOptions
 * @returns {Promise<boolean>}
 */
const sendMailSafe = async ({ to, subject, html, text }) => {
  try {
    const activeTransporter = await getTransporter();

    if (activeTransporter) {
      await activeTransporter.sendMail({
        from: `"${ENV.SUPPORT_EMAIL}" <${ENV.SMTP_USER || ENV.SUPPORT_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });
      console.log(`[EMAIL DISPATCHED] To: ${to} | Subject: "${subject}"`);
      return true;
    }

    // Development/Fallback Logging
    console.log(`\n======================================================`);
    console.log(`[MOCK EMAIL NOTICE - SMTP not configured in .env]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Snippet: ${text ? text.slice(0, 160) : 'HTML Template'}`);
    console.log(`======================================================\n`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Sends order confirmation invoice email to customer
 * @param {object} params
 * @param {object} params.order
 */
export const sendOrderConfirmationEmail = async ({ order }) => {
  const itemsListText = (order.items || [])
    .map((item) => `- ${item.title} (x${item.quantity}) - ₹${item.totalPrice}`)
    .join('\n');

  const itemsListHtml = (order.items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 0;"><strong>${item.title}</strong>${item.size ? ` (Size: ${item.size})` : ''}</td>
        <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right;">₹${item.totalPrice}</td>
      </tr>`
    )
    .join('');

  const subject = `Order Confirmed #${order.orderNumber} — Maison De Élégance`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #1a1a1a; margin-top: 0;">Thank you for your order, ${order.customerName}!</h2>
      <p style="color: #666; font-size: 15px;">We have received your order <strong>#${order.orderNumber}</strong> and it is being prepared with bespoke care.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="border-bottom: 2px solid #ddd; text-align: left; color: #555;">
            <th style="padding: 8px 0;">Item</th>
            <th style="padding: 8px 0; text-align: center;">Qty</th>
            <th style="padding: 8px 0; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>

      <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 4px 0; display: flex; justify-content: space-between;"><span>Subtotal:</span> <strong>₹${order.subtotal}</strong></p>
        ${Number(order.discountAmount) > 0 ? `<p style="margin: 4px 0; color: #2e7d32;"><span>Discount:</span> <strong>-₹${order.discountAmount}</strong></p>` : ''}
        <p style="margin: 4px 0; display: flex; justify-content: space-between;"><span>Shipping:</span> <strong>₹${order.shippingAmount}</strong></p>
        <p style="margin: 4px 0; display: flex; justify-content: space-between;"><span>Tax (GST):</span> <strong>₹${order.taxAmount}</strong></p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 8px 0;" />
        <p style="margin: 4px 0; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between;"><span>Total Amount:</span> <strong>₹${order.totalAmount}</strong></p>
      </div>

      <p style="color: #888; font-size: 13px;">Payment Method: <strong>${order.paymentMethod}</strong> | Status: <strong>${order.status}</strong></p>
      <p style="color: #888; font-size: 13px;">If you have any questions, contact our concierge at <a href="mailto:${ENV.SUPPORT_EMAIL}">${ENV.SUPPORT_EMAIL}</a>.</p>
    </div>
  `;

  const text = `Thank you for your order, ${order.customerName}!\n\nOrder #${order.orderNumber}\n\nItems:\n${itemsListText}\n\nTotal: ₹${order.totalAmount}\nPayment Method: ${order.paymentMethod}`;

  await sendMailSafe({
    to: order.customerEmail,
    subject,
    html,
    text,
  });
};

/**
 * Sends COD new order alert email to store operations admin
 * @param {object} params
 * @param {object} params.order
 */
export const sendCodAdminAlertEmail = async ({ order }) => {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || ENV.SUPPORT_EMAIL;
  const adminUrl = `${ENV.CLIENT_URL}/admin/orders/${order.id}`;

  const subject = `⚠️ [Action Required] New COD Order #${order.orderNumber} Awaiting Review`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #c25e00; margin-top: 0;">New Cash on Delivery Order Received</h2>
      <p style="color: #444; font-size: 15px;">A new COD order has been placed by <strong>${order.customerName}</strong> and requires staff review & confirmation.</p>
      
      <div style="background: #fdf6ec; border: 1px solid #faecd8; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p style="margin: 4px 0;"><strong>Customer Phone:</strong> ${order.customerPhone || 'Not provided'}</p>
        <p style="margin: 4px 0;"><strong>Customer Email:</strong> ${order.customerEmail}</p>
        <p style="margin: 4px 0;"><strong>Total Value:</strong> ₹${order.totalAmount}</p>
      </div>

      <div style="margin: 25px 0;">
        <a href="${adminUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
          Review Order in Admin Portal
        </a>
      </div>

      <p style="color: #888; font-size: 13px;">Please verify customer contact details and confirm or reject fulfillment in the dashboard.</p>
    </div>
  `;

  const text = `New COD Order #${order.orderNumber} awaiting review.\nCustomer: ${order.customerName} (${order.customerPhone})\nTotal: ₹${order.totalAmount}\nReview at: ${adminUrl}`;

  await sendMailSafe({
    to: adminEmail,
    subject,
    html,
    text,
  });
};

/**
 * Sends COD order approval or cancellation update email to customer
 * @param {object} params
 * @param {object} params.order
 * @param {boolean} params.approved
 * @param {string} [params.reason]
 */
export const sendCodStatusUpdateEmail = async ({ order, approved, reason = '' }) => {
  const subject = approved
    ? `Your COD Order #${order.orderNumber} is Confirmed! — Maison De Élégance`
    : `Update on Order #${order.orderNumber} — Maison De Élégance`;

  const html = approved
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #2e7d32; margin-top: 0;">Your Cash on Delivery Order is Approved!</h2>
        <p style="color: #444; font-size: 15px;">Dear ${order.customerName}, your COD order <strong>#${order.orderNumber}</strong> has been verified and approved by our team.</p>
        <p style="color: #444;">It has entered fulfillment and will be dispatched shortly. Please keep ₹${order.totalAmount} ready upon delivery.</p>
      </div>`
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #c62828; margin-top: 0;">Order #${order.orderNumber} Update</h2>
        <p style="color: #444; font-size: 15px;">Dear ${order.customerName}, we regret to inform you that your COD order <strong>#${order.orderNumber}</strong> could not be verified and has been cancelled.</p>
        ${reason ? `<p style="color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;"><strong>Reason:</strong> ${reason}</p>` : ''}
        <p style="color: #666;">If you believe this is an error, please contact our concierge at <a href="mailto:${ENV.SUPPORT_EMAIL}">${ENV.SUPPORT_EMAIL}</a>.</p>
      </div>`;

  const text = approved
    ? `Your COD Order #${order.orderNumber} has been verified and approved. Total to pay on delivery: ₹${order.totalAmount}.`
    : `Your COD Order #${order.orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`;

  await sendMailSafe({
    to: order.customerEmail,
    subject,
    html,
    text,
  });
};

/**
 * Sends order cancellation notification email to customer and store operations
 * @param {object} params
 * @param {object} params.order
 * @param {string} [params.reason]
 */
export const sendCustomerOrderCancellationEmail = async ({ order, reason = '' }) => {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || ENV.SUPPORT_EMAIL;
  const subject = `Order #${order.orderNumber} Cancelled — Maison De Élégance`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #c62828; margin-top: 0;">Order #${order.orderNumber} Cancelled</h2>
      <p style="color: #444; font-size: 15px;">Dear ${order.customerName}, your order <strong>#${order.orderNumber}</strong> has been cancelled as requested.</p>
      ${reason ? `<p style="color: #666; background: #f9f9f9; padding: 10px; border-radius: 4px;"><strong>Reason:</strong> ${reason}</p>` : ''}
      <p style="color: #666;">Reserved inventory has been released. If you need any assistance or have questions, feel free to reply to this email or contact us at <a href="mailto:${ENV.SUPPORT_EMAIL}">${ENV.SUPPORT_EMAIL}</a>.</p>
    </div>
  `;

  const text = `Dear ${order.customerName}, your order #${order.orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`;

  await sendMailSafe({
    to: order.customerEmail,
    subject,
    html,
    text,
  });

  // Notify admin
  await sendMailSafe({
    to: adminEmail,
    subject: `[Customer Notice] Order #${order.orderNumber} Cancelled by Customer`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h3>Customer Cancelled Order #${order.orderNumber}</h3>
        <p><strong>Customer:</strong> ${order.customerName} (${order.customerEmail})</p>
        <p><strong>Reason:</strong> ${reason || 'Customer self-service cancellation'}</p>
        <p><strong>Total:</strong> ₹${order.totalAmount}</p>
      </div>
    `,
    text: `Customer ${order.customerName} cancelled order #${order.orderNumber}. Reason: ${reason || 'N/A'}. Total: ₹${order.totalAmount}`,
  });
};

/**
 * Sends password reset link email with 1-hour expiry
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.name
 * @param {string} params.resetUrl
 */
export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = `Reset Your Password — Maison De Élégance`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #1a1a1a; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #444; font-size: 15px;">Dear ${name || 'Customer'},</p>
      <p style="color: #444; font-size: 15px; line-height: 1.5;">
        We received a request to reset the password for your Maison De Élégance account. Click the button below to create a new password:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #1a1a1a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 15px;">
          Reset My Password
        </a>
      </div>
      <p style="color: #666; font-size: 13px; line-height: 1.4;">
        This password reset link will expire in <strong>1 hour</strong>. If you did not make this request, you can safely ignore this email; your account remains secure.
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">If the button above does not work, copy and paste this URL into your browser:<br/><a href="${resetUrl}" style="color: #666;">${resetUrl}</a></p>
    </div>
  `;

  const text = `Dear ${name || 'Customer'},\n\nWe received a request to reset your password. Use the link below to set a new password:\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.`;

  await sendMailSafe({ to, subject, html, text });
};

/**
 * Sends notification confirming successful password reset
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.name
 */
export const sendPasswordResetSuccessEmail = async ({ to, name }) => {
  const subject = `Password Changed Successfully — Maison De Élégance`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #2e7d32; margin-top: 0;">Password Updated</h2>
      <p style="color: #444; font-size: 15px;">Dear ${name || 'Customer'},</p>
      <p style="color: #444; font-size: 15px; line-height: 1.5;">
        Your password has been successfully reset. You can now log into your account using your new credentials.
      </p>
      <p style="color: #888; font-size: 13px; margin-top: 24px;">
        If you did not perform this action, please contact our concierge immediately at <a href="mailto:${ENV.SUPPORT_EMAIL}">${ENV.SUPPORT_EMAIL}</a>.
      </p>
    </div>
  `;

  const text = `Dear ${name || 'Customer'},\n\nYour Maison De Élégance password has been successfully reset. If you did not perform this action, contact us immediately at ${ENV.SUPPORT_EMAIL}.`;

  await sendMailSafe({ to, subject, html, text });
};

/**
 * Sends contact inquiry alerts to store support and customer acknowledgment
 * @param {object} params
 * @param {object} params.inquiry
 */
export const sendContactInquiryEmails = async ({ inquiry }) => {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || ENV.SUPPORT_EMAIL;

  // 1. Notify store support
  await sendMailSafe({
    to: adminEmail,
    subject: `📩 [Customer Inquiry] ${inquiry.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h3 style="color: #1a1a1a; margin-top: 0;">New Storefront Inquiry</h3>
        <div style="background: #f7f9fa; padding: 14px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Name:</strong> ${inquiry.name}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${inquiry.email}">${inquiry.email}</a></p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${inquiry.phone || 'Not provided'}</p>
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${inquiry.subject}</p>
        </div>
        <p style="font-size: 15px; color: #333; background: #fff; border-left: 3px solid #1a1a1a; padding: 10px 14px; margin: 15px 0;">
          ${inquiry.message}
        </p>
      </div>
    `,
    text: `New Inquiry from ${inquiry.name} (${inquiry.email}):\nSubject: ${inquiry.subject}\n\n${inquiry.message}`,
  });

  // 2. Acknowledge customer
  await sendMailSafe({
    to: inquiry.email,
    subject: `We Received Your Message — Maison De Élégance`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #1a1a1a; margin-top: 0;">Thank You for Contacting Us</h2>
        <p style="color: #444; font-size: 15px;">Dear ${inquiry.name},</p>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          Thank you for reaching out to Maison De Élégance. We have received your inquiry regarding <strong>"${inquiry.subject}"</strong>.
        </p>
        <p style="color: #444; font-size: 15px;">Our concierge team will review your message and respond within 24 business hours.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 13px;">If you have immediate questions, you can reply directly to this email.</p>
      </div>
    `,
    text: `Dear ${inquiry.name},\n\nThank you for contacting Maison De Élégance. We received your inquiry regarding "${inquiry.subject}" and will respond within 24 business hours.`,
  });
};



const nodemailer = require('nodemailer');
const env = require('./env');

const smtpConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  : null;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendContactEmail = async ({ name, email, phone, message }) => {
  if (!transporter) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to your .env file.');
  }

  const toEmail = env.contactEmail || env.smtpFrom || env.smtpUser;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">New contact enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name || 'N/A')}</p>
      <p><strong>Email:</strong> ${escapeHtml(email || 'N/A')}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || 'N/A')}</p>
      <p><strong>Message:</strong></p>
      <div style="padding: 12px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">
        ${escapeHtml(message || '')}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to: toEmail,
    replyTo: email,
    subject: `New Contact Form Enquiry from ${name || 'Website Visitor'}`,
    html,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`,
  });
};

module.exports = {
  transporter,
  sendContactEmail,
  escapeHtml,
  smtpConfigured,
};

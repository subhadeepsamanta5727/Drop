const { sendContactEmail } = require('../config/mailer');

exports.submitContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body || {};

    if (!name || !email || !message) {
      const error = new Error('Name, email, and message are required');
      error.statusCode = 400;
      throw error;
    }

    await sendContactEmail({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : '',
      message: String(message).trim(),
    });

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

// Create transporter
let transporter = null;

if (config.EMAIL_USER && config.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    },
  });
}

/**
 * Send email
 */
const sendEmail = async (to, subject, html, text) => {
  if (!transporter) {
    logger.warn('Email service not configured. Skipping email send.');
    return;
  }

  try {
    const mailOptions = {
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

/**
 * Send registration success email
 */
exports.sendRegistrationEmail = async (email, name) => {
  const subject = 'Welcome to CSE Workshop Platform';
  const html = `
    <h2>Welcome ${name}!</h2>
    <p>Thank you for registering with the CSE Workshop Platform.</p>
    <p>You can now explore available courses and start your learning journey.</p>
    <p>Best regards,<br>CSE Workshop Team</p>
  `;
  const text = `Welcome ${name}! Thank you for registering with the CSE Workshop Platform.`;

  return sendEmail(email, subject, html, text);
};

/**
 * Send certificate email
 */
exports.sendCertificateEmail = async (email, name, courseTitle, certificateUrl) => {
  const subject = `Certificate Issued: ${courseTitle}`;
  const html = `
    <h2>Congratulations ${name}!</h2>
    <p>You have successfully completed the course: <strong>${courseTitle}</strong></p>
    <p>Your certificate is ready for download.</p>
    <p><a href="${certificateUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Certificate</a></p>
    <p>Best regards,<br>CSE Workshop Team</p>
  `;
  const text = `Congratulations ${name}! You have successfully completed ${courseTitle}. Download your certificate: ${certificateUrl}`;

  return sendEmail(email, subject, html, text);
};

/**
 * Send enrollment confirmation email
 */
exports.sendEnrollmentEmail = async (email, name, courseTitle) => {
  const subject = `Enrollment Confirmed: ${courseTitle}`;
  const html = `
    <h2>Hello ${name}!</h2>
    <p>You have successfully enrolled in the course: <strong>${courseTitle}</strong></p>
    <p>You can now access the course materials and start learning.</p>
    <p>Best regards,<br>CSE Workshop Team</p>
  `;
  const text = `Hello ${name}! You have successfully enrolled in ${courseTitle}.`;

  return sendEmail(email, subject, html, text);
};

module.exports = exports;


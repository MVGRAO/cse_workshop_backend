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
 * Subject: Course Enrollment Confirmed 🎉
 */
exports.sendEnrollmentEmail = async (email, name, courseTitle, startDate) => {
  const formattedDate = startDate ? new Date(startDate).toLocaleDateString() : 'TBA';
  const subject = 'Course Enrollment Confirmed 🎉';
  const html = `
    <p>Dear ${name},</p>
    <p>You have been successfully enrolled in the course <strong>${courseTitle}</strong>.</p>
    <p>📅 <strong>Course Start Date:</strong> ${formattedDate}</p>
    <p>You can log in to your dashboard to view the course details and get prepared before the course begins.</p>
    <p>We’re excited to have you with us and wish you a great learning experience!</p>
    <p>Best regards,<br>CSE Workshop Team</p>
  `;
  const text = `Dear ${name},\n\nYou have been successfully enrolled in the course ${courseTitle}.\n\nCourse Start Date: ${formattedDate}\n\nYou can log in to your dashboard to view the course details and get prepared before the course begins.\n\nBest regards,\nCSE Workshop Team`;

  return sendEmail(email, subject, html, text);
};

/**
 * Send course published email to enrolled students
 */
exports.sendCoursePublishedEmail = async (email, name, courseTitle, frontendBaseUrl) => {
  const subject = 'Course Published – You Can Start Now';
  const myCoursesUrl = `${frontendBaseUrl.replace(/\/$/, '')}/candidate/my-courses`;
  const html = `
    <p>Great news, ${name}! 🎉</p>
    <p>The course <strong>${courseTitle}</strong> has been successfully published and is now available for you to start.</p>
    <p>You can begin learning right away by accessing the course from your dashboard.</p>
    <p><a href="${myCoursesUrl}" style="background-color:#2563eb;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">Go to My Courses</a></p>
    <p>We wish you an engaging and successful learning experience!</p>
    <p>Happy Learning,<br>CSE Workshop Team</p>
  `;
  const text = `Great news, ${name}! The course ${courseTitle} has been successfully published and is now available for you to start.\n\nYou can begin learning right away by accessing the course from your dashboard: ${myCoursesUrl}\n\nHappy Learning,\nCSE Workshop Team`;

  return sendEmail(email, subject, html, text);
};

/**
 * Send results generated email to students
 */
exports.sendResultsGeneratedEmail = async (email, name, courseTitle, frontendBaseUrl) => {
  const subject = 'Course Results Generated';
  const dashboardUrl = `${frontendBaseUrl.replace(/\/$/, '')}/candidate/my-courses`;
  const html = `
    <p>Dear ${name},</p>
    <p>The results for the course <strong>${courseTitle}</strong> have been successfully generated.</p>
    <p>You can now log in to your dashboard to view your performance and result details.</p>
    <p><a href="${dashboardUrl}" style="background-color:#2563eb;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">View Results</a></p>
    <p>Congratulations on completing the course, and we wish you continued success in your learning journey!</p>
    <p>Best regards,<br>CSE Workshop Team</p>
  `;
  const text = `Dear ${name},\n\nThe results for the course ${courseTitle} have been successfully generated.\n\nYou can now log in to your dashboard to view your performance and result details: ${dashboardUrl}\n\nBest regards,\nCSE Workshop Team`;

  return sendEmail(email, subject, html, text);
};

module.exports = exports;




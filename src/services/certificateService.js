const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const config = require('../config/env');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const constants = require('../utils/constants');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate verification hash
 */
const generateVerificationHash = (studentId, courseId, timestamp) => {
  const data = `${studentId}-${courseId}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate certificate number
 */
const generateCertificateNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Certificate.countDocuments({
    certificateNumber: new RegExp(`^CERT-${year}-`),
  });
  const number = String(count + 1).padStart(4, '0');
  return `CERT-${year}-${number}`;
};

/**
 * Calculate grade based on score
 */
const calculateGrade = (totalScore, maxScore) => {
  const percentage = (totalScore / maxScore) * 100;
  if (percentage >= 90) return constants.GRADES.A;
  if (percentage >= 80) return constants.GRADES.B;
  if (percentage >= 70) return constants.GRADES.C;
  if (percentage >= 60) return constants.GRADES.D;
  return constants.GRADES.F;
};

/**
 * Generate PDF certificate
 */
const generatePDF = async (certificate, student, course) => {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), config.STORAGE_PATH);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `certificate-${certificate._id}.pdf`;
      const filepath = path.join(uploadsDir, filename);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Certificate design
      doc.fontSize(24).text('Certificate of Completion', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text('This is to certify that', { align: 'center' });
      doc.moveDown();
      doc.fontSize(20).font('Helvetica-Bold').text(student.name, { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).font('Helvetica').text(`has successfully completed the course`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).font('Helvetica-Bold').text(course.title, { align: 'center' });
      doc.moveDown(2);

      // Scores
      doc.fontSize(12).text(`Theory Score: ${certificate.theoryScore}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.text(`Practical Score: ${certificate.practicalScore}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.text(`Total Score: ${certificate.totalScore}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`Grade: ${certificate.grade}`, { align: 'center' });
      doc.moveDown(2);

      // Certificate details
      doc.fontSize(10).font('Helvetica').text(`Certificate Number: ${certificate.certificateNumber}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.text(`Issue Date: ${certificate.issueDate.toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Verification URL
      const verifyUrl = `${config.CERTIFICATE_BASE_URL}/api/v1/certificates/verify/${certificate.verificationHash}`;
      doc.fontSize(8).text(`Verify at: ${verifyUrl}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        const downloadUrl = `/uploads/${filename}`;
        resolve(downloadUrl);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Issue certificate for enrollment
 */
exports.issueCertificate = async (enrollmentId) => {
  try {
    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ enrollment: enrollmentId });
    if (existingCertificate) {
      logger.warn(`Certificate already exists for enrollment ${enrollmentId}`);
      return existingCertificate;
    }

    // Get enrollment with populated data
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('student')
      .populate('course');

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== constants.ENROLLMENT_STATUS.COMPLETED) {
      throw new Error('Enrollment is not completed');
    }

    // Generate certificate number and hash
    const certificateNumber = await generateCertificateNumber();
    const verificationHash = generateVerificationHash(
      enrollment.student._id.toString(),
      enrollment.course._id.toString(),
      Date.now().toString()
    );

    // Calculate grade
    const maxScore = enrollment.theoryScore + enrollment.practicalScore; // Assuming max is sum
    const grade = calculateGrade(enrollment.finalScore, maxScore || 100);

    // Create certificate
    const certificate = await Certificate.create({
      enrollment: enrollmentId,
      student: enrollment.student._id,
      course: enrollment.course._id,
      certificateNumber,
      verificationHash,
      theoryScore: enrollment.theoryScore,
      practicalScore: enrollment.practicalScore,
      totalScore: enrollment.finalScore,
      grade,
    });

    // Generate PDF
    try {
      const downloadUrl = await generatePDF(certificate, enrollment.student, enrollment.course);
      certificate.downloadUrl = downloadUrl;
      await certificate.save();
    } catch (pdfError) {
      logger.error(`Failed to generate PDF: ${pdfError.message}`);
      // Continue even if PDF generation fails
    }

    // Send email notification
    try {
      const certificateUrl = `${config.CERTIFICATE_BASE_URL}${certificate.downloadUrl}`;
      await emailService.sendCertificateEmail(
        enrollment.student.email,
        enrollment.student.name,
        enrollment.course.title,
        certificateUrl
      );
    } catch (emailError) {
      logger.error(`Failed to send certificate email: ${emailError.message}`);
      // Continue even if email fails
    }

    logger.info(`Certificate issued: ${certificateNumber}`);
    return certificate;
  } catch (error) {
    logger.error(`Error issuing certificate: ${error.message}`);
    throw error;
  }
};

module.exports = exports;




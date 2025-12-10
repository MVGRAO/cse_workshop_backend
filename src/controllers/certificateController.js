const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /student/certificates
 * Get all certificates for student
 */
exports.getStudentCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title code')
      .sort({ issueDate: -1 });

    return success(res, 'Certificates retrieved', certificates);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /certificates/:certificateId
 * Get certificate details
 */
exports.getCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findById(certificateId)
      .populate('student', 'name email')
      .populate('course', 'title code description')
      .populate('enrollment');

    if (!certificate) {
      return error(res, 'Certificate not found', null, 404);
    }

    // Check access
    if (
      certificate.student._id.toString() !== req.user.id &&
      req.user.role !== constants.ROLES.VERIFIER &&
      req.user.role !== constants.ROLES.ADMIN
    ) {
      return error(res, 'Access denied', null, 403);
    }

    return success(res, 'Certificate retrieved', certificate);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /certificates/:certificateId/download
 * Download certificate PDF
 */
exports.downloadCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findById(certificateId)
      .populate('student', 'name')
      .populate('course', 'title');

    if (!certificate) {
      return error(res, 'Certificate not found', null, 404);
    }

    // Check access
    if (
      certificate.student._id.toString() !== req.user.id &&
      req.user.role !== constants.ROLES.VERIFIER &&
      req.user.role !== constants.ROLES.ADMIN
    ) {
      return error(res, 'Access denied', null, 403);
    }

    if (certificate.downloadUrl) {
      return res.redirect(certificate.downloadUrl);
    } else {
      return error(res, 'Certificate PDF not available', null, 404);
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /certificates/verify/:verificationHash
 * Public certificate verification
 */
exports.verifyCertificate = async (req, res, next) => {
  try {
    const { verificationHash } = req.params;

    const certificate = await Certificate.findOne({ verificationHash })
      .populate('student', 'name')
      .populate('course', 'title');

    if (!certificate) {
      return success(res, 'Certificate verification', {
        valid: false,
        message: 'Certificate not found',
      });
    }

    if (certificate.status === constants.CERTIFICATE_STATUS.REVOKED) {
      return success(res, 'Certificate verification', {
        valid: false,
        message: 'Certificate has been revoked',
      });
    }

    return success(res, 'Certificate verification', {
      valid: true,
      studentName: certificate.student.name,
      courseTitle: certificate.course.title,
      issueDate: certificate.issueDate.toISOString().split('T')[0],
      certificateNumber: certificate.certificateNumber,
    });
  } catch (err) {
    next(err);
  }
};


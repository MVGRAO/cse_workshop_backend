const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const crypto = require('crypto');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /student/certificates
 * Get all certificates for student
 */
exports.getStudentCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title code resultsGenerated')
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
 * POST /verifier/enrollments/:enrollmentId/verify
 * Verify student enrollment and generate certificate
 */
exports.verifyAndGenerateCertificate = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const { practicalScore } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('student', 'name email')
      .populate('course')
      .populate('verifier');

    if (!enrollment) {
      return error(res, 'Enrollment not found', null, 404);
    }

    // Check if verifier matches
    if (enrollment.verifier?._id.toString() !== req.user.id) {
      return error(res, 'Access denied. This student is not assigned to you.', null, 403);
    }

    // Check if enrollment is completed
    if (enrollment.status !== constants.ENROLLMENT_STATUS.COMPLETED) {
      return error(res, 'Enrollment is not yet completed', null, 400);
    }

    // Check if certificate already exists
    const existingCert = await Certificate.findOne({ enrollment: enrollmentId });
    if (existingCert) {
      return error(res, 'Certificate already exists for this enrollment', null, 400);
    }

    const course = await Course.findById(enrollment.course._id);
    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Calculate theoretical score from all submissions (sum of all assignment marks)
    const submissions = await Submission.find({
      enrollment: enrollmentId,
      status: constants.SUBMISSION_STATUS.EVALUATED,
    });

    console.log(`Found ${submissions.length} evaluated submissions for enrollment ${enrollmentId}`);

    // Get total raw theoretical marks (sum of all assignment marks)
    let totalRawTheoryMarks = 0;
    const assignmentCount = submissions.length;

    submissions.forEach((submission) => {
      // Sum all assignment marks (theoretical marks)
      const score = submission.totalScore || submission.autoScore || 0;
      totalRawTheoryMarks += score;
      console.log(`Submission ${submission._id}: totalScore=${submission.totalScore}, autoScore=${submission.autoScore}, added=${score}`);
    });

    console.log(`Total raw theory marks: ${totalRawTheoryMarks}, Assignment count: ${assignmentCount}`);

    // Get total possible marks from all assignments
    const Assignment = require('../models/Assignment');
    const assignmentIds = submissions.map(s => s.assignment);
    const assignments = await Assignment.find({ _id: { $in: assignmentIds } });
    const totalPossibleMarks = assignments.reduce((sum, a) => sum + (a.maxScore || 0), 0);

    // Scale theoretical marks based on whether practical exists
    // If practical exists: scale to 50, if no practical: scale to 100
    let theoryScore = 0;
    if (totalPossibleMarks > 0) {
      if (course.hasPracticalSession) {
        // Scale to 50 if practical exists
        theoryScore = (totalRawTheoryMarks / totalPossibleMarks) * 50;
      } else {
        // Scale to 100 if no practical
        theoryScore = (totalRawTheoryMarks / totalPossibleMarks) * 100;
      }
    } else if (assignmentCount > 0) {
      // Fallback: if no maxScore set, use raw marks but scale appropriately
      if (course.hasPracticalSession) {
        theoryScore = totalRawTheoryMarks; // Keep raw if no maxScore defined
      } else {
        theoryScore = totalRawTheoryMarks; // Keep raw if no maxScore defined
      }
    }

    // Set practical score if course has practical session
    let practicalMarks = 0;
    if (course.hasPracticalSession) {
      if (practicalScore === undefined || practicalScore === null) {
        return error(res, 'Practical score is required for this course', null, 400);
      }
      if (practicalScore < 0) {
        return error(res, 'Practical score cannot be negative', null, 400);
      }
      // Scale practical to 50 (since theory is also scaled to 50)
      practicalMarks = Math.min(50, practicalScore);
    }

    // Calculate total score
    const totalScore = theoryScore + practicalMarks;

    // Determine grade
    let grade = constants.GRADES.F;
    if (totalScore >= 90) grade = constants.GRADES.A;
    else if (totalScore >= 80) grade = constants.GRADES.B;
    else if (totalScore >= 70) grade = constants.GRADES.C;
    else if (totalScore >= 60) grade = constants.GRADES.D;

    // Generate certificate number and hash
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const verificationHash = crypto.createHash('sha256').update(certificateNumber + enrollment.student._id.toString()).digest('hex');

    // Create certificate
    const certificate = await Certificate.create({
      enrollment: enrollmentId,
      student: enrollment.student._id,
      course: enrollment.course._id,
      certificateNumber,
      verificationHash,
      theoryScore,
      practicalScore: practicalMarks,
      totalScore,
      grade,
      status: constants.CERTIFICATE_STATUS.ISSUED,
    });

    // Update enrollment with scores
    enrollment.theoryScore = theoryScore;
    enrollment.practicalScore = practicalMarks;
    enrollment.finalScore = totalScore;
    await enrollment.save();

    return success(res, 'Certificate generated successfully', {
      certificate: {
        id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        verificationHash: certificate.verificationHash,
        theoryScore,
        practicalScore: practicalMarks,
        totalScore,
        grade,
      },
      enrollment: {
        theoryScore,
        practicalScore: practicalMarks,
        finalScore: totalScore,
      },
    }, null, 201);
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




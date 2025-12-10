const Submission = require('../models/Submission');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /verifier/courses/:courseId/submissions
 * Get submissions for course
 */
exports.getCourseSubmissions = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { status, moduleId, studentId } = req.query;

    const query = { course: courseId };

    if (status) query.status = status;
    if (moduleId) query.module = moduleId;
    if (studentId) query.student = studentId;

    const submissions = await Submission.find(query)
      .populate('student', 'name email college classYear')
      .populate('assignment', 'type maxScore')
      .populate('module', 'title')
      .sort({ submittedAt: -1 });

    return success(res, 'Submissions retrieved', submissions);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /verifier/submissions/:submissionId/theory-evaluate
 * Evaluate theory submission
 */
exports.evaluateTheory = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { autoScoreOverride, reject, rejectionReason } = req.body;

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return error(res, 'Submission not found', null, 404);
    }

    if (reject) {
      submission.status = constants.SUBMISSION_STATUS.REJECTED;
      submission.rejectionReason = rejectionReason || 'Rejected by verifier';
    } else {
      if (autoScoreOverride !== undefined) {
        submission.autoScore = autoScoreOverride;
      }
      submission.status = constants.SUBMISSION_STATUS.EVALUATED;
    }

    submission.evaluatedBy = req.user.id;
    submission.evaluatedAt = new Date();
    submission.totalScore = submission.autoScore + submission.manualScore;

    await submission.save();

    // Update enrollment scores
    await updateEnrollmentScores(submission.enrollment);

    return success(res, 'Theory evaluation completed', submission);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /verifier/submissions/:submissionId/practical-evaluate
 * Evaluate practical submission
 */
exports.evaluatePractical = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { manualScore, remarks } = req.body;

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return error(res, 'Submission not found', null, 404);
    }

    submission.manualScore = manualScore || 0;
    submission.totalScore = submission.autoScore + submission.manualScore;
    submission.status = constants.SUBMISSION_STATUS.EVALUATED;
    submission.evaluatedBy = req.user.id;
    submission.evaluatedAt = new Date();

    await submission.save();

    // Update enrollment scores
    await updateEnrollmentScores(submission.enrollment);

    return success(res, 'Practical evaluation completed', submission);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /verifier/enrollments/:enrollmentId/finalize
 * Finalize enrollment and issue certificate
 */
exports.finalizeEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const { pass } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return error(res, 'Enrollment not found', null, 404);
    }

    if (pass) {
      enrollment.status = constants.ENROLLMENT_STATUS.COMPLETED;
      enrollment.completedAt = new Date();

      await enrollment.save();

      // Issue certificate
      const certificateService = require('../services/certificateService');
      await certificateService.issueCertificate(enrollmentId);
    } else {
      enrollment.status = constants.ENROLLMENT_STATUS.FAILED;
      await enrollment.save();
    }

    return success(res, 'Enrollment finalized', enrollment);
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to update enrollment scores
 */
const updateEnrollmentScores = async (enrollmentId) => {
  const Assignment = require('../models/Assignment');
  const enrollment = await Enrollment.findById(enrollmentId);
  const submissions = await Submission.find({ enrollment: enrollmentId })
    .populate('assignment', 'type');

  let theoryScore = 0;
  let practicalScore = 0;

  submissions.forEach((submission) => {
    const assignment = submission.assignment;
    if (assignment && assignment.type === constants.ASSIGNMENT_TYPE.THEORY) {
      theoryScore += submission.totalScore || 0;
    } else if (assignment && assignment.type === constants.ASSIGNMENT_TYPE.PRACTICAL) {
      practicalScore += submission.totalScore || 0;
    }
  });

  enrollment.theoryScore = theoryScore;
  enrollment.practicalScore = practicalScore;
  enrollment.finalScore = theoryScore + practicalScore;

  await enrollment.save();
};


const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireVerifier } = require('../middleware/role');
const courseController = require('../controllers/courseController');
const enrollmentController = require('../controllers/enrollmentController');
const evaluationController = require('../controllers/evaluationController');
const doubtController = require('../controllers/doubtController');
const certificateController = require('../controllers/certificateController');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// Apply authentication and verifier role to all routes
router.use(authenticate);
router.use(requireVerifier);

/**
 * Courses
 */
router.get('/courses', courseController.getVerifierCourses);
router.get('/overview', enrollmentController.getVerifierOverview);
router.get('/students', enrollmentController.getVerifierStudents);
router.get('/completed-students', enrollmentController.getCompletedStudentsForVerification);
router.get('/verified-students', enrollmentController.getVerifiedStudents);

/**
 * Students
 */
router.get('/courses/:courseId/students', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { status, college, classYear, from, to } = req.query;

    const query = { course: courseId };

    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate('student', 'name email college classYear mobile')
      .sort({ enrolledAt: -1 });

    let filteredEnrollments = enrollments;

    // Filter by college
    if (college) {
      filteredEnrollments = filteredEnrollments.filter(
        (e) => e.student?.college?.toLowerCase().includes(college.toLowerCase())
      );
    }

    // Filter by classYear
    if (classYear) {
      filteredEnrollments = filteredEnrollments.filter(
        (e) => e.student?.classYear?.toLowerCase().includes(classYear.toLowerCase())
      );
    }

    // Filter by date range
    if (from || to) {
      filteredEnrollments = filteredEnrollments.filter((e) => {
        const enrolledDate = new Date(e.enrolledAt);
        if (from && enrolledDate < new Date(from)) return false;
        if (to && enrolledDate > new Date(to)) return false;
        return true;
      });
    }

    const { success } = require('../utils/response');
    return success(res, 'Students retrieved', filteredEnrollments);
  } catch (err) {
    next(err);
  }
});

/**
 * Submissions
 */
router.get('/courses/:courseId/submissions', evaluationController.getCourseSubmissions);
router.patch('/submissions/:submissionId/theory-evaluate', evaluationController.evaluateTheory);
router.patch('/submissions/:submissionId/practical-evaluate', evaluationController.evaluatePractical);

/**
 * Enrollments
 */
router.get('/enrollments/:id', enrollmentController.getEnrollment);

/**
 * Finalize Enrollment
 */
router.post('/enrollments/:enrollmentId/finalize', evaluationController.finalizeEnrollment);

/**
 * Certificates
 */
router.get('/certificates/:certificateId', certificateController.getCertificate);
router.get('/certificates/:certificateId/download', certificateController.downloadCertificate);

/**
 * Doubts
 */
router.get('/doubts', doubtController.getVerifierDoubts);
router.patch('/doubts/:doubtId/answer', doubtController.answerDoubt);

/**
 * Verification and Certificates
 */
router.post('/enrollments/:enrollmentId/verify', certificateController.verifyAndGenerateCertificate);

module.exports = router;


const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireStudent } = require('../middleware/role');
const studentController = require('../controllers/studentController');
const courseController = require('../controllers/courseController');
const lessonController = require('../controllers/lessonController');
const enrollmentController = require('../controllers/enrollmentController');
const moduleController = require('../controllers/moduleController');
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const certificateController = require('../controllers/certificateController');
const doubtController = require('../controllers/doubtController');

// Apply authentication and student role to all routes
router.use(authenticate);
router.use(requireStudent);

/**
 * Dashboard
 */
router.get('/dashboard', studentController.getDashboard);

/**
 * Courses
 */
router.get('/courses/available', courseController.getAvailableCourses);

/**
 * Enrollments
 */
router.get('/enrollments', enrollmentController.getStudentEnrollments);
router.post('/courses/:courseId/enroll', enrollmentController.enrollInCourse);
router.get('/enrollments/:id', enrollmentController.getEnrollment);
router.post('/enrollments/:enrollmentId/complete', enrollmentController.completeEnrollment);

/**
 * Modules
 */
router.get('/courses/:courseId/modules', moduleController.getCourseLessonsWithModules);
router.get('/modules/:moduleId', moduleController.getModule);

/**
 * Assignments
 */
router.get('/modules/:moduleId/assignment', assignmentController.getModuleAssignment);
router.post('/assignments/:assignmentId/start', submissionController.startSubmission);
router.post('/assignments/:assignmentId/submit', submissionController.submitAssignment);

/**
 * Certificates
 */
router.get('/certificates', certificateController.getStudentCertificates);
router.get('/certificates/:certificateId', certificateController.getCertificate);
router.get('/certificates/:certificateId/download', certificateController.downloadCertificate);

/**
 * Doubts
 */
router.post('/courses/:courseId/modules/:moduleId/doubts', doubtController.createDoubt);
router.get('/doubts', doubtController.getStudentDoubts);

module.exports = router;


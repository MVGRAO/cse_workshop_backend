const express = require('express');
const router = express.Router();
const { upload } = require('../utils/cloudinary');
const { protectAdmin } = require('../middleware/auth');
// const { requireAdmin } = require('../middleware/role'); // Removed as integrated into protectAdmin
const courseController = require('../controllers/courseController');
const moduleController = require('../controllers/moduleController');
const lessonController = require('../controllers/lessonController');
const assignmentController = require('../controllers/assignmentController');
const userController = require('../controllers/userController');
const analyticsController = require('../controllers/analyticsController');
const enrollmentController = require('../controllers/enrollmentController');
const certificateController = require('../controllers/certificateController');
const User = require('../models/User');
const { success, error } = require('../utils/response');

// Apply strict admin authentication to all routes
router.use(protectAdmin);

/**
 * Courses
 */
router.get('/courses', courseController.getAllCourses);
router.get('/courses/:courseId', courseController.getCourseDetails);
router.get('/courses/:courseId/results', courseController.getCourseResults);
router.post('/courses/:courseId/generate-results', courseController.generateCourseResults);
router.post('/courses', upload.single('image'), courseController.createCourse);
router.patch('/courses/:courseId', upload.single('image'), courseController.updateCourse);
router.delete('/courses/:courseId', courseController.deleteCourse);
router.post('/courses/:courseId/publish', courseController.publishCourse);
router.post('/courses/:courseId/assign-verifier', courseController.assignVerifier);

/**
 * Lessons
 */
router.get('/courses/:courseId/lessons', lessonController.getLessonsByCourse);
router.post('/courses/:courseId/lessons', lessonController.createLesson);
router.patch('/lessons/:lessonId', lessonController.updateLesson);

/**
 * Modules
 */
router.post('/lessons/:lessonId/modules', moduleController.createModule);
router.patch('/modules/:moduleId', moduleController.updateModule);

/**
 * Assignments
 */
router.post('/assignments', assignmentController.createAssignment);
router.patch('/assignments/:assignmentId', assignmentController.updateAssignment);

/**
 * Users
 */
router.get('/users', userController.getUsers);
router.patch('/users/:userId', userController.updateUser);
router.delete('/users/:userId', userController.deleteUser);

/**
 * Enrollments
 */
router.get('/enrollments/:id', enrollmentController.getEnrollment);

/**
 * Create Verifier
 */
router.post('/verifiers', async (req, res, next) => {
  try {
    const { email, name, college } = req.body;

    if (!email) {
      return error(res, 'Email is required', null, 400);
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update to verifier role
      user.role = 'verifier';
      if (name) user.name = name;
      if (college) user.college = college;
      await user.save();
    } else {
      // Create new verifier
      user = await User.create({
        email,
        name: name || 'Verifier',
        role: 'verifier',
        college,
      });
    }

    return success(res, 'Verifier created/updated', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, null, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * Certificates
 */
router.get('/certificates/:certificateId', certificateController.getCertificate);
router.get('/certificates/:certificateId/download', certificateController.downloadCertificate);

/**
 * Analytics
 */
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/courses', analyticsController.getCourseAnalytics);
router.get('/analytics/colleges', analyticsController.getCollegeAnalytics);

module.exports = router;


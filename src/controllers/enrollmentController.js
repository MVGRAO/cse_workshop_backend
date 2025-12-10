const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /student/enrollments
 * Get all enrollments for logged-in student
 */
exports.getStudentEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate('course', 'title code category level')
      .sort({ enrolledAt: -1 });

    return success(res, 'Enrollments retrieved', enrollments);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /courses/:courseId/enroll
 * Enroll in course
 */
exports.enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { name, classYear, college, mobile, tutorId } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    if (course.status !== constants.COURSE_STATUS.PUBLISHED) {
      return error(res, 'Course is not available for enrollment', null, 403);
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (existingEnrollment) {
      return error(res, 'You are already enrolled in this course', null, 400);
    }

    // Find last enrollment for prefill
    const lastEnrollment = await Enrollment.findOne({ student: req.user.id })
      .sort({ createdAt: -1 });

    // Get user info
    const user = await User.findById(req.user.id);

    // Create profile snapshot
    const profileSnapshot = {
      name: name || lastEnrollment?.profileSnapshot?.name || user.name,
      email: user.email,
      classYear: classYear || lastEnrollment?.profileSnapshot?.classYear || user.classYear,
      college: college || lastEnrollment?.profileSnapshot?.college || user.college,
      mobile: mobile || lastEnrollment?.profileSnapshot?.mobile || user.mobile,
    };

    // Update user profile if provided
    if (classYear) user.classYear = classYear;
    if (college) user.college = college;
    if (mobile) user.mobile = mobile;
    await user.save();

    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      profileSnapshot,
      status: constants.ENROLLMENT_STATUS.ONGOING,
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('course', 'title code')
      .populate('student', 'name email');

    return success(res, 'Enrolled successfully', populatedEnrollment, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /enrollments/:id
 * Get enrollment details
 */
exports.getEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id)
      .populate('course')
      .populate('student', 'name email college classYear');

    if (!enrollment) {
      return error(res, 'Enrollment not found', null, 404);
    }

    // Check access
    if (
      enrollment.student._id.toString() !== req.user.id &&
      req.user.role !== constants.ROLES.VERIFIER &&
      req.user.role !== constants.ROLES.ADMIN
    ) {
      return error(res, 'Access denied', null, 403);
    }

    return success(res, 'Enrollment retrieved', enrollment);
  } catch (err) {
    next(err);
  }
};




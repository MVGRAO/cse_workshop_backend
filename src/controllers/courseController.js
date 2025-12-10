const Course = require('../models/Course');
const Module = require('../models/Module');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * POST /admin/courses
 * Create new course
 */
exports.createCourse = async (req, res, next) => {
  try {
    const { title, code, description, category, level, tutors, verifiers, startTimestamp, endTimestamp } = req.body;

    const course = await Course.create({
      title,
      code,
      description,
      category,
      level,
      tutors: tutors || [],
      verifiers: verifiers || [],
      createdBy: req.user.id,
      startTimestamp,
      endTimestamp,
    });

    return success(res, 'Course created', course, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /student/courses/available
 * Get all published courses
 */
exports.getAvailableCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: constants.COURSE_STATUS.PUBLISHED })
      .populate('tutors', 'name email')
      .populate('verifiers', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    return success(res, 'Available courses retrieved', courses);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/courses
 * Get courses assigned to verifier
 */
exports.getVerifierCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      $or: [
        { verifiers: req.user.id },
        { createdBy: req.user.id },
      ],
    })
      .populate('tutors', 'name email')
      .populate('verifiers', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    return success(res, 'Courses retrieved', courses);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/courses/:courseId
 * Update course
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    const course = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    return success(res, 'Course updated', course);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/courses/:courseId/publish
 * Publish course
 */
exports.publishCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    course.status = constants.COURSE_STATUS.PUBLISHED;
    await course.save();

    return success(res, 'Course published', course);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/courses/:courseId/assign-verifier
 * Assign verifiers to course
 */
exports.assignVerifier = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { verifierIds } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    course.verifiers = verifierIds;
    await course.save();

    return success(res, 'Verifiers assigned', course);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /courses/:courseId/modules
 * Get course modules (student view)
 */
exports.getCourseModules = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Check if course has started
    const now = new Date();
    if (course.startTimestamp && now < course.startTimestamp) {
      return error(res, 'Course has not started yet', null, 403);
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (!enrollment) {
      return error(res, 'You are not enrolled in this course', null, 403);
    }

    const modules = await Module.find({ course: courseId })
      .populate('assignment')
      .sort({ index: 1 });

    // Filter modules based on openAt/dueAt timestamps
    const accessibleModules = modules.filter((module) => {
      if (module.openAt && now < module.openAt) return false;
      return true;
    });

    return success(res, 'Modules retrieved', accessibleModules);
  } catch (err) {
    next(err);
  }
};


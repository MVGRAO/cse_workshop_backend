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
    const courses = await Course.find({
      status: { $in: [constants.COURSE_STATUS.DRAFT, constants.COURSE_STATUS.PUBLISHED] },
    })
      .populate('tutors', 'name email')
      .populate('verifiers', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    // Fetch all active verifiers to present options even when a course has none assigned
    const User = require('../models/User');
    const allVerifiers = await User.find({
      role: constants.ROLES.VERIFIER,
      isActive: true,
    }).select('name email');

    const enriched = courses.map((course) => {
      const obj = course.toObject();
      obj.availableVerifiers = (obj.verifiers && obj.verifiers.length > 0) ? obj.verifiers : allVerifiers;
      return obj;
    });

    return success(res, 'Available courses retrieved', enriched);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/courses
 * Get all courses (admin only)
 */
exports.getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate('tutors', 'name email')
      .populate('verifiers', 'name email')
      .populate('createdBy', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    // Add lesson and module counts
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');

    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const lessonCount = await Lesson.countDocuments({ course: course._id });
        const moduleCount = await Module.countDocuments({ course: course._id });
        return {
          ...course.toObject(),
          lessonCount,
          moduleCount,
        };
      })
    );

    return success(res, 'All courses retrieved', coursesWithCounts);
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
 * GET /admin/courses/:courseId
 * Get course details with lessons, modules, and assignments
 */
exports.getCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate('tutors', 'name email')
      .populate('verifiers', 'name email')
      .populate('createdBy', 'name email')
      .select('-__v');

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Get lessons with modules and assignments
    const Lesson = require('../models/Lesson');
    const lessons = await Lesson.find({ course: courseId }).sort({ index: 1 });

    const Module = require('../models/Module');
    const Assignment = require('../models/Assignment');

    const lessonsWithModules = await Promise.all(
      lessons.map(async (lesson) => {
        const modules = await Module.find({ lesson: lesson._id, course: courseId }).sort({ index: 1 });

        const modulesWithAssignments = await Promise.all(
          modules.map(async (module) => {
            let assignment = null;
            if (module.assignment) {
              assignment = await Assignment.findById(module.assignment);
            }
            return {
              ...module.toObject(),
              assignment,
            };
          })
        );

        return {
          ...lesson.toObject(),
          modules: modulesWithAssignments,
        };
      })
    );

    return success(res, 'Course details retrieved', {
      course,
      lessons: lessonsWithModules,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/courses/:courseId
 * Delete a course
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Delete related lessons, modules, and assignments
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');
    const Assignment = require('../models/Assignment');

    const lessons = await Lesson.find({ course: courseId });

    for (const lesson of lessons) {
      const modules = await Module.find({ lesson: lesson._id, course: courseId });

      for (const module of modules) {
        if (module.assignment) {
          await Assignment.findByIdAndDelete(module.assignment);
        }
        await Module.findByIdAndDelete(module._id);
      }

      await Lesson.findByIdAndDelete(lesson._id);
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);

    return success(res, 'Course deleted successfully', null);
  } catch (err) {
    next(err);
  }
};

// Deprecated: course modules now retrieved via moduleController.getCourseLessonsWithModules




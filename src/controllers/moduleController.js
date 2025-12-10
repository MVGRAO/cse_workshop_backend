const Module = require('../models/Module');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');

/**
 * POST /admin/courses/:courseId/modules
 * Create module
 */
exports.createModule = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { index, title, description, videoUrl, textContent, pdfResources, assignmentId, durationMinutes, openAt, dueAt } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    const module = await Module.create({
      course: courseId,
      index,
      title,
      description,
      videoUrl,
      textContent,
      pdfResources: pdfResources || [],
      assignment: assignmentId,
      durationMinutes,
      openAt,
      dueAt,
    });

    return success(res, 'Module created', module, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /modules/:moduleId
 * Get module details (student view)
 */
exports.getModule = async (req, res, next) => {
  try {
    const { moduleId } = req.params;

    const module = await Module.findById(moduleId)
      .populate('course', 'title code')
      .populate('assignment');

    if (!module) {
      return error(res, 'Module not found', null, 404);
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: module.course._id,
    });

    if (!enrollment) {
      return error(res, 'You are not enrolled in this course', null, 403);
    }

    // Check if module is accessible
    const now = new Date();
    if (module.openAt && now < module.openAt) {
      return error(res, 'Module is not available yet', null, 403);
    }

    return success(res, 'Module retrieved', module);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/modules/:moduleId
 * Update module
 */
exports.updateModule = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const updateData = req.body;

    const module = await Module.findByIdAndUpdate(moduleId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!module) {
      return error(res, 'Module not found', null, 404);
    }

    return success(res, 'Module updated', module);
  } catch (err) {
    next(err);
  }
};


const Module = require('../models/Module');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');

/**
 * POST /admin/lessons/:lessonId/modules
 * Create module under a lesson
 */
exports.createModule = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { index, title, description, videoUrl, textContent, pdfResources, assignmentId, durationMinutes, openAt, dueAt } = req.body;

    const lesson = await Lesson.findById(lessonId).populate('course');

    if (!lesson) {
      return error(res, 'Lesson not found', null, 404);
    }

    const course = await Course.findById(lesson.course);

    const module = await Module.create({
      course: course._id,
      lesson: lessonId,
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
      .populate('lesson', 'title index')
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

/**
 * GET /courses/:courseId/modules
 * Get lessons with modules for a course (student view)
 */
exports.getCourseLessonsWithModules = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Check course start
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

    const lessons = await Lesson.find({ course: courseId }).sort({ index: 1 });
    const modules = await Module.find({ course: courseId })
      .populate('assignment')
      .populate('lesson', 'title index')
      .sort({ lesson: 1, index: 1 });

    const lessonMap = lessons.map((lesson) => ({
      lessonId: lesson._id,
      title: lesson.title,
      index: lesson.index,
      description: lesson.description,
      modules: [],
    }));

    const lessonIndexMap = new Map();
    lessonMap.forEach((l, idx) => lessonIndexMap.set(l.lessonId.toString(), idx));

    modules.forEach((mod) => {
      if (mod.openAt && now < mod.openAt) {
        return; // skip not yet open modules
      }
      const key = mod.lesson?._id?.toString() || mod.lesson?.toString();
      if (key && lessonIndexMap.has(key)) {
        lessonMap[lessonIndexMap.get(key)].modules.push(mod);
      }
    });

    return success(res, 'Lessons with modules retrieved', lessonMap);
  } catch (err) {
    next(err);
  }
};




const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { success, error } = require('../utils/response');

/**
 * POST /admin/courses/:courseId/lessons
 * Create a lesson under a course
 */
exports.createLesson = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { index, title, description } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    const lesson = await Lesson.create({
      course: courseId,
      index,
      title,
      description,
    });

    return success(res, 'Lesson created', lesson, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/lessons/:lessonId
 * Update lesson
 */
exports.updateLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const updateData = req.body;

    const lesson = await Lesson.findByIdAndUpdate(lessonId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!lesson) {
      return error(res, 'Lesson not found', null, 404);
    }

    return success(res, 'Lesson updated', lesson);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /courses/:courseId/lessons
 * Get lessons for a course (with modules populated elsewhere)
 */
exports.getLessonsByCourse = async (courseId) => {
  const lessons = await Lesson.find({ course: courseId }).sort({ index: 1 });
  return lessons;
};


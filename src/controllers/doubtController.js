const Doubt = require('../models/Doubt');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * POST /courses/:courseId/modules/:moduleId/doubts
 * Create doubt
 */
exports.createDoubt = async (req, res, next) => {
  try {
    const { courseId, moduleId } = req.params;
    const { message, attachments } = req.body;

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (!enrollment) {
      return error(res, 'You are not enrolled in this course', null, 403);
    }

    const doubt = await Doubt.create({
      course: courseId,
      module: moduleId,
      student: req.user.id,
      message,
      attachments: attachments || [],
    });

    return success(res, 'Doubt submitted', doubt, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /student/doubts
 * Get all doubts for student
 */
exports.getStudentDoubts = async (req, res, next) => {
  try {
    const doubts = await Doubt.find({ student: req.user.id })
      .populate('course', 'title code')
      .populate('module', 'title')
      .populate('answers.responder', 'name email role')
      .sort({ createdAt: -1 });

    return success(res, 'Doubts retrieved', doubts);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/doubts
 * Get doubts for verifier's courses
 */
exports.getVerifierDoubts = async (req, res, next) => {
  try {
    const { courseId, status } = req.query;

    // Get courses assigned to verifier
    const Course = require('../models/Course');
    const courses = await Course.find({
      $or: [
        { verifiers: req.user.id },
        { createdBy: req.user.id },
      ],
    });

    const courseIds = courses.map((c) => c._id);

    const query = { course: { $in: courseIds } };

    if (courseId) query.course = courseId;
    if (status) query.status = status;

    const doubts = await Doubt.find(query)
      .populate('course', 'title code')
      .populate('module', 'title')
      .populate('student', 'name email college classYear')
      .populate('answers.responder', 'name email role')
      .sort({ createdAt: -1 });

    return success(res, 'Doubts retrieved', doubts);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /doubts/:doubtId/answer
 * Answer a doubt
 */
exports.answerDoubt = async (req, res, next) => {
  try {
    const { doubtId } = req.params;
    const { message } = req.body;

    const doubt = await Doubt.findById(doubtId);

    if (!doubt) {
      return error(res, 'Doubt not found', null, 404);
    }

    // Check access (verifier/admin or student who created it)
    if (
      doubt.student.toString() !== req.user.id &&
      req.user.role !== constants.ROLES.VERIFIER &&
      req.user.role !== constants.ROLES.ADMIN
    ) {
      return error(res, 'Access denied', null, 403);
    }

    doubt.answers.push({
      responder: req.user.id,
      message,
    });

    if (doubt.status === constants.DOUBT_STATUS.OPEN) {
      doubt.status = constants.DOUBT_STATUS.ANSWERED;
    }

    await doubt.save();

    const populatedDoubt = await Doubt.findById(doubt._id)
      .populate('answers.responder', 'name email role');

    return success(res, 'Doubt answered', populatedDoubt);
  } catch (err) {
    next(err);
  }
};




const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * POST /assignments/:assignmentId/start
 * Start assignment submission
 */
exports.startSubmission = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return error(res, 'Assignment not found', null, 404);
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: assignment.course,
    });

    if (!enrollment) {
      return error(res, 'You are not enrolled in this course', null, 403);
    }

    // Check if submission already exists
    let submission = await Submission.findOne({
      student: req.user.id,
      assignment: assignmentId,
    });

    if (submission) {
      return success(res, 'Submission already started', submission);
    }

    // Create new submission
    submission = await Submission.create({
      assignment: assignmentId,
      course: assignment.course,
      module: assignment.module,
      student: req.user.id,
      enrollment: enrollment._id,
      startedAt: new Date(),
    });

    return success(res, 'Submission started', submission, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /assignments/:assignmentId/submit
 * Submit assignment
 */
exports.submitAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { submissionId, answers, tabSwitchCount } = req.body;

    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return error(res, 'Assignment not found', null, 404);
    }

    let submission = await Submission.findById(submissionId);

    if (!submission) {
      return error(res, 'Submission not found', null, 404);
    }

    if (submission.student.toString() !== req.user.id) {
      return error(res, 'Access denied', null, 403);
    }

    // Check time limit
    const timeElapsed = (new Date() - submission.startedAt) / 1000 / 60; // minutes
    const timeExceeded = timeElapsed > assignment.timeLimitMinutes;

    // Auto-score MCQs
    let autoScore = 0;
    answers.forEach((answer) => {
      const question = assignment.questions.id(answer.questionId);
      if (question && question.qType === constants.QUESTION_TYPE.MCQ) {
        if (answer.selectedOptionIndex === question.correctOptionIndex) {
          autoScore += question.maxMarks;
        }
      }
    });

    // Set flags
    const flags = {
      tabSwitchCount: tabSwitchCount || 0,
      timeExceeded,
      cheatingSuspected:
        tabSwitchCount > assignment.antiCheatConfig.maxTabSwitches ||
        timeExceeded,
    };

    // Determine status
    let status = constants.SUBMISSION_STATUS.PENDING;
    if (flags.cheatingSuspected || autoScore < assignment.maxScore * 0.4) {
      status = constants.SUBMISSION_STATUS.REJECTED;
    }

    // Update submission
    submission.answers = answers;
    submission.autoScore = autoScore;
    submission.totalScore = autoScore; // Will be updated after manual evaluation
    submission.submittedAt = new Date();
    submission.flags = flags;
    submission.status = status;

    await submission.save();

    return success(res, 'Assignment submitted', submission);
  } catch (err) {
    next(err);
  }
};




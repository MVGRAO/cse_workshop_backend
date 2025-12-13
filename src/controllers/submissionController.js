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

    // Auto-score MCQs and Short Answers
    let autoScore = 0;
    answers.forEach((answer) => {
      const question = assignment.questions.id(answer.questionId);
      if (!question) return;

      if (question.qType === constants.QUESTION_TYPE.MCQ) {
        // MCQ: Check if selected option matches correct option
        if (answer.selectedOptionIndex !== undefined && 
            answer.selectedOptionIndex === question.correctOptionIndex) {
          autoScore += question.maxMarks;
        }
      } else if (question.qType === constants.QUESTION_TYPE.SHORT || 
                 question.qType === constants.QUESTION_TYPE.CODE) {
        // Short Answer/Code: Check if answer includes the correct answer (case-insensitive)
        if (answer.answerText && question.answerExplanation) {
          const studentAnswer = answer.answerText.toLowerCase().trim();
          const correctAnswer = question.answerExplanation.toLowerCase().trim();
          
          // Check if student answer includes the correct answer or vice versa
          if (studentAnswer.includes(correctAnswer) || correctAnswer.includes(studentAnswer)) {
            autoScore += question.maxMarks;
          }
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

    // Determine status - mark as EVALUATED if no cheating suspected
    let status = constants.SUBMISSION_STATUS.EVALUATED;
    if (flags.cheatingSuspected) {
      status = constants.SUBMISSION_STATUS.REJECTED;
    }

    // Update submission
    submission.answers = answers;
    submission.autoScore = autoScore;
    submission.totalScore = autoScore; // Auto-evaluated score (will be updated if manual evaluation happens)
    submission.submittedAt = new Date();
    submission.flags = flags;
    submission.status = status;

    // If auto-evaluated and not rejected, mark as evaluated
    if (status === constants.SUBMISSION_STATUS.EVALUATED) {
      submission.evaluatedAt = new Date();
    }

    await submission.save();

    console.log(`Submission ${submission._id} saved with autoScore: ${autoScore}, totalScore: ${submission.totalScore}, status: ${status}`);

    return success(res, 'Assignment submitted', submission);
  } catch (err) {
    next(err);
  }
};




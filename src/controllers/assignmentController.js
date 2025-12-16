const Assignment = require('../models/Assignment');
const Module = require('../models/Module');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * POST /admin/assignments
 * Create assignment
 */
exports.createAssignment = async (req, res, next) => {
  try {
    const { course, module, type, questions, description, maxScore, timeLimitMinutes, antiCheatConfig } = req.body;

    const assignment = await Assignment.create({
      course,
      module,
      type,
      questions: questions || [],
      description,
      maxScore,
      timeLimitMinutes,
      antiCheatConfig: antiCheatConfig || {
        maxTabSwitches: 3,
        allowCopyPaste: false,
      },
    });

    // Update module with assignment reference
    if (module) {
      await Module.findByIdAndUpdate(module, { assignment: assignment._id });
    }

    return success(res, 'Assignment created', assignment, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /modules/:moduleId/assignment
 * Get assignment for module
 */
exports.getModuleAssignment = async (req, res, next) => {
  try {
    const { moduleId } = req.params;

    const module = await Module.findById(moduleId);

    if (!module) {
      return error(res, 'Module not found', null, 404);
    }

    if (!module.assignment) {
      return error(res, 'No assignment found for this module', null, 404);
    }

    const assignment = await Assignment.findById(module.assignment)
      .populate('course', 'title code')
      .populate('module', 'title');

    // Remove correct answers for students and jumble questions
    if (req.user.role === constants.ROLES.STUDENT) {
      let questions = assignment.questions.map((q) => q.toObject());

      // Jumble questions (Fisher-Yates Shuffle)
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }

      assignment.questions = questions.map((q) => {
        delete q.correctOptionIndex;
        return q;
      });
    }

    return success(res, 'Assignment retrieved', assignment);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/assignments/:assignmentId
 * Update assignment
 */
exports.updateAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const updateData = req.body;

    const assignment = await Assignment.findByIdAndUpdate(assignmentId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!assignment) {
      return error(res, 'Assignment not found', null, 404);
    }

    return success(res, 'Assignment updated', assignment);
  } catch (err) {
    next(err);
  }
};




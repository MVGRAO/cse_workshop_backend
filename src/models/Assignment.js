const mongoose = require('mongoose');
const constants = require('../utils/constants');

const questionSchema = new mongoose.Schema({
  qType: {
    type: String,
    enum: [constants.QUESTION_TYPE.MCQ, constants.QUESTION_TYPE.SHORT, constants.QUESTION_TYPE.CODE],
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  options: [
    {
      type: String,
    },
  ],
  correctOptionIndex: {
    type: Number, // For MCQ auto-scoring (index of correct option)
  },
  answerExplanation: {
    type: String, // Answer explanation for short answer questions only
    trim: true,
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 0,
  },
});

const assignmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    type: {
      type: String,
      enum: [constants.ASSIGNMENT_TYPE.THEORY, constants.ASSIGNMENT_TYPE.PRACTICAL],
      required: true,
    },
    questions: [questionSchema],
    description: {
      type: String, // For practical coding tasks
      trim: true,
    },
    maxScore: {
      type: Number,
      required: true,
      default: 0,
    },
    timeLimitMinutes: {
      type: Number,
      default: 60,
    },
    antiCheatConfig: {
      maxTabSwitches: {
        type: Number,
        default: 3,
      },
      allowCopyPaste: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ module: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);




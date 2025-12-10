const mongoose = require('mongoose');
const constants = require('../utils/constants');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  answerText: {
    type: String,
  },
  selectedOptionIndex: {
    type: Number,
  },
  codeUrl: {
    type: String, // For code tasks (Git repo link etc.)
  },
});

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
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
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    answers: [answerSchema],
    autoScore: {
      type: Number,
      default: 0,
    },
    manualScore: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [constants.SUBMISSION_STATUS.PENDING, constants.SUBMISSION_STATUS.EVALUATED, constants.SUBMISSION_STATUS.REJECTED],
      default: constants.SUBMISSION_STATUS.PENDING,
    },
    flags: {
      tabSwitchCount: {
        type: Number,
        default: 0,
      },
      timeExceeded: {
        type: Boolean,
        default: false,
      },
      cheatingSuspected: {
        type: Boolean,
        default: false,
      },
    },
    rejectionReason: {
      type: String,
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evaluatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
submissionSchema.index({ student: 1, assignment: 1 });
submissionSchema.index({ enrollment: 1 });
submissionSchema.index({ course: 1 });
submissionSchema.index({ status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);




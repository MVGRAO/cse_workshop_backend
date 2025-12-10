const mongoose = require('mongoose');
const constants = require('../utils/constants');

const answerSchema = new mongoose.Schema({
  responder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const doubtSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Doubt message is required'],
      trim: true,
    },
    attachments: [
      {
        type: String, // URLs
      },
    ],
    status: {
      type: String,
      enum: [constants.DOUBT_STATUS.OPEN, constants.DOUBT_STATUS.ANSWERED, constants.DOUBT_STATUS.CLOSED],
      default: constants.DOUBT_STATUS.OPEN,
    },
    answers: [answerSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
doubtSchema.index({ student: 1 });
doubtSchema.index({ course: 1 });
doubtSchema.index({ status: 1 });

module.exports = mongoose.model('Doubt', doubtSchema);




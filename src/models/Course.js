const mongoose = require('mongoose');
const constants = require('../utils/constants');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    level: {
      type: String,
      trim: true,
    },
    tutors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    verifiers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: [constants.COURSE_STATUS.DRAFT, constants.COURSE_STATUS.PUBLISHED, constants.COURSE_STATUS.ARCHIVED],
      default: constants.COURSE_STATUS.DRAFT,
    },
    startTimestamp: {
      type: Date,
    },
    endTimestamp: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
courseSchema.index({ code: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Course', courseSchema);


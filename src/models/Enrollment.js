const mongoose = require('mongoose');
const constants = require('../utils/constants');

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    profileSnapshot: {
      name: String,
      email: String,
      classYear: String,
      college: String,
      mobile: String,
    },
    status: {
      type: String,
      enum: [
        constants.ENROLLMENT_STATUS.ONGOING,
        constants.ENROLLMENT_STATUS.COMPLETED,
        constants.ENROLLMENT_STATUS.FAILED,
        constants.ENROLLMENT_STATUS.RETAKE,
      ],
      default: constants.ENROLLMENT_STATUS.ONGOING,
    },
    finalScore: {
      type: Number,
      default: 0,
    },
    theoryScore: {
      type: Number,
      default: 0,
    },
    practicalScore: {
      type: Number,
      default: 0,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    lastAccessAt: {
      type: Date,
      default: Date.now,
    },
    retakeOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);




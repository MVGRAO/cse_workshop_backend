const mongoose = require('mongoose');
const constants = require('../utils/constants');

const certificateSchema = new mongoose.Schema(
  {
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      unique: true,
    },
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
    issueDate: {
      type: Date,
      default: Date.now,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    verificationHash: {
      type: String,
      required: true,
      unique: true,
    },
    theoryScore: {
      type: Number,
      default: 0,
    },
    practicalScore: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      enum: [constants.GRADES.A, constants.GRADES.B, constants.GRADES.C, constants.GRADES.D, constants.GRADES.F],
    },
    status: {
      type: String,
      enum: [constants.CERTIFICATE_STATUS.ISSUED, constants.CERTIFICATE_STATUS.REVOKED],
      default: constants.CERTIFICATE_STATUS.ISSUED,
    },
    downloadUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
certificateSchema.index({ student: 1 });
certificateSchema.index({ course: 1 });
certificateSchema.index({ verificationHash: 1 });
certificateSchema.index({ certificateNumber: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);


const mongoose = require('mongoose');
const constants = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: [constants.ROLES.STUDENT, constants.ROLES.VERIFIER, constants.ROLES.ADMIN],
      default: constants.ROLES.STUDENT,
    },
    college: {
      type: String,
      trim: true,
    },
    classYear: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);




const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
    },
    textContent: {
      type: String, // HTML/Markdown content
    },
    pdfResources: [
      {
        type: String, // URLs
      },
    ],
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    openAt: {
      type: Date,
    },
    dueAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
moduleSchema.index({ course: 1, index: 1 });
moduleSchema.index({ course: 1 });

module.exports = mongoose.model('Module', moduleSchema);


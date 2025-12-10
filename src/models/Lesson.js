const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
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
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({ course: 1, index: 1 }, { unique: true });
lessonSchema.index({ course: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);


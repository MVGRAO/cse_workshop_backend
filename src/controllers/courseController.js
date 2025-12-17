const Course = require('../models/Course');
const Module = require('../models/Module');
const Enrollment = require('../models/Enrollment');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');
const config = require('../config/env');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * POST /admin/courses
 * Create new course
 */
exports.createCourse = async (req, res, next) => {
  try {
    const { title, code, description, category, level, verifiers, startTimestamp, endTimestamp, hasPracticalSession } = req.body;

    const course = await Course.create({
      title,
      code,
      description,
      category,
      level,
      verifiers: verifiers || [],
      createdBy: req.user.id,
      hasPracticalSession: hasPracticalSession || false,
      startTimestamp,
      endTimestamp,
      image: req.file ? req.file.path : '',
    });

    return success(res, 'Course created', course, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /student/courses/available
 * Get all published courses
 */
exports.getAvailableCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      status: { $in: [constants.COURSE_STATUS.DRAFT, constants.COURSE_STATUS.PUBLISHED] },
    })
      .populate('verifiers', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    // Fetch all active verifiers to present options even when a course has none assigned
    const User = require('../models/User');
    const allVerifiers = await User.find({
      role: constants.ROLES.VERIFIER,
      isActive: true,
    }).select('name email');

    const enriched = courses.map((course) => {
      const obj = course.toObject();
      obj.availableVerifiers = (obj.verifiers && obj.verifiers.length > 0) ? obj.verifiers : allVerifiers;
      return obj;
    });

    return success(res, 'Available courses retrieved', enriched);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /student/courses/:courseId/details
 * Get detailed course info for student (including enrollment status and structure)
 */
exports.getStudentCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findOne({
      _id: courseId
    })
      .populate('createdBy', 'name')
      .populate('verifiers', 'name');

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Check enrollment
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ course: courseId, student: req.user.id });

    // Fetch lessons
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');
    const Assignment = require('../models/Assignment');

    const lessons = await Lesson.find({ course: courseId }).sort({ index: 1 }).lean();

    // Fetch all modules for this course
    const rawModules = await Module.find({ course: courseId })
      .sort({ lesson: 1, index: 1 })
      .populate({
        path: 'assignment',
        // Populate full assignment so we can shape a safe student-facing view
      })
      .lean();

    // Sanitize assignments for student view (do not expose correct answers)
    const modules = rawModules.map(m => {
      if (m.assignment) {
        const a = m.assignment;
        const safeQuestions = Array.isArray(a.questions)
          ? a.questions.map(q => ({
            _id: q._id,
            qType: q.qType,
            questionText: q.questionText,
            options: q.options,
            maxMarks: q.maxMarks,
          }))
          : [];

        m.assignment = {
          _id: a._id,
          maxScore: a.maxScore,
          questions: safeQuestions,
        };
      }
      return m;
    });

    // Group modules by lesson
    const lessonsWithModules = lessons.map(lesson => ({
      ...lesson,
      modules: modules.filter(m => m.lesson.toString() === lesson._id.toString())
    }));

    // Get total enrollment count
    const enrollmentCount = await Enrollment.countDocuments({ course: courseId });

    return success(res, 'Course details fetched', {
      course,
      lessons: lessonsWithModules,
      isEnrolled: !!enrollment,
      enrollmentId: enrollment ? enrollment._id : null,
      enrollmentCount
    });

  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/courses
 * Get all courses (admin only)
 */
exports.getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate('verifiers', 'name email')
      .populate('createdBy', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    // Add lesson and module counts
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');

    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const lessonCount = await Lesson.countDocuments({ course: course._id });
        const moduleCount = await Module.countDocuments({ course: course._id });
        return {
          ...course.toObject(),
          lessonCount,
          moduleCount,
        };
      })
    );

    return success(res, 'All courses retrieved', coursesWithCounts);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/courses
 * Get courses assigned to verifier with enrollment and verification counts
 */
exports.getVerifierCourses = async (req, res, next) => {
  try {
    const verifierId = req.user.id;
    const Certificate = require('../models/Certificate');

    const courses = await Course.find({
      verifiers: verifierId,
    })
      .populate('verifiers', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });

    // Get enrollment and verification counts for each course
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        // Count total enrollments for this course with this verifier
        const totalEnrollments = await Enrollment.countDocuments({
          course: course._id,
          verifier: verifierId,
        });

        // Count completed enrollments that need verification (no certificate yet)
        const completedEnrollments = await Enrollment.find({
          course: course._id,
          verifier: verifierId,
          status: constants.ENROLLMENT_STATUS.COMPLETED,
        });

        const enrollmentsNeedingVerification = await Promise.all(
          completedEnrollments.map(async (enrollment) => {
            const certificate = await Certificate.findOne({ enrollment: enrollment._id });
            return !certificate;
          })
        );

        const toBeVerified = enrollmentsNeedingVerification.filter(Boolean).length;

        return {
          ...course.toObject(),
          totalEnrollments,
          toBeVerified,
        };
      })
    );

    return success(res, 'Courses retrieved', coursesWithCounts);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/courses/:courseId
 * Update course
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    if (req.file) {
      updateData.image = req.file.path;
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Disable update if course is published
    if (course.status === constants.COURSE_STATUS.PUBLISHED) {
      return error(res, 'Cannot update a published course', null, 403);
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
      runValidators: true,
    });

    return success(res, 'Course updated', updatedCourse);
  } catch (err) {
    next(err);
  }
};



/**
 * POST /admin/courses/:courseId/assign-verifier
 * Assign verifiers to course
 */
exports.assignVerifier = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { verifierIds } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    course.verifiers = verifierIds;
    await course.save();

    return success(res, 'Verifiers assigned', course);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/courses/:courseId
 * Get course details with lessons, modules, and assignments
 */
exports.getCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate('verifiers', 'name email')
      .populate('createdBy', 'name email')
      .select('-__v');

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Get lessons with modules and assignments
    const Lesson = require('../models/Lesson');
    const lessons = await Lesson.find({ course: courseId }).sort({ index: 1 });

    const Module = require('../models/Module');
    const Assignment = require('../models/Assignment');
    const Enrollment = require('../models/Enrollment');

    const lessonsWithModules = await Promise.all(
      lessons.map(async (lesson) => {
        const modules = await Module.find({ lesson: lesson._id, course: courseId }).sort({ index: 1 });

        const modulesWithAssignments = await Promise.all(
          modules.map(async (module) => {
            let assignment = null;
            if (module.assignment) {
              assignment = await Assignment.findById(module.assignment);
            }
            return {
              ...module.toObject(),
              assignment,
            };
          })
        );

        return {
          ...lesson.toObject(),
          modules: modulesWithAssignments,
        };
      })
    );

    // Enrollment stats for this course
    const enrollmentCount = await Enrollment.countDocuments({ course: courseId });

    return success(res, 'Course details retrieved', {
      course,
      lessons: lessonsWithModules,
      enrollmentCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/courses/:courseId/results
 * Get course results (enrollments with certificates)
 */
exports.getCourseResults = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const Certificate = require('../models/Certificate');

    const enrollments = await Enrollment.find({ course: courseId, status: constants.ENROLLMENT_STATUS.COMPLETED })
      .populate('student', 'name email college classYear')
      .populate('verifier', 'name email')
      .sort({ completedAt: -1 });

    const enrollmentsWithCertificates = await Promise.all(
      enrollments.map(async (enrollment) => {
        const certificate = await Certificate.findOne({ enrollment: enrollment._id });
        return {
          enrollment: enrollment.toObject(),
          certificate: certificate ? certificate.toObject() : null,
        };
      })
    );

    return success(res, 'Course results retrieved', enrollmentsWithCertificates);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/courses/:courseId/generate-results
 * Generate certificates for all completed enrollments in a course
 */
exports.generateCourseResults = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const Certificate = require('../models/Certificate');
    const certificateController = require('./certificateController');

    // Check if course is published
    const course = await Course.findById(courseId);
    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    if (course.status !== constants.COURSE_STATUS.PUBLISHED) {
      return error(res, 'Can only generate results for published courses', null, 400);
    }

    // Get all completed enrollments for this course
    const enrollments = await Enrollment.find({
      course: courseId,
      status: constants.ENROLLMENT_STATUS.COMPLETED,
    })
      .populate('student', 'name email')
      .populate('course')
      .populate('verifier');

    const results = [];
    const errors = [];

    // Generate certificates for each enrollment
    for (const enrollment of enrollments) {
      try {
        // Check if certificate already exists
        const existingCert = await Certificate.findOne({ enrollment: enrollment._id });
        if (existingCert) {
          results.push({
            enrollmentId: enrollment._id,
            studentName: enrollment.student.name,
            status: 'already_exists',
            certificate: existingCert,
          });
          continue;
        }

        // Check if verifier has verified (certificate should be generated by verifier)
        // For now, we'll generate certificates for all completed enrollments
        // The verifier verification should have already happened

        // Calculate scores and generate certificate
        const Submission = require('../models/Submission');
        const submissions = await Submission.find({
          enrollment: enrollment._id,
          status: constants.SUBMISSION_STATUS.EVALUATED,
        });

        let totalRawTheoryMarks = 0;
        submissions.forEach((submission) => {
          totalRawTheoryMarks += submission.totalScore || submission.autoScore || 0;
        });

        const Assignment = require('../models/Assignment');
        const assignmentIds = submissions.map(s => s.assignment);
        const assignments = await Assignment.find({ _id: { $in: assignmentIds } });
        const totalPossibleMarks = assignments.reduce((sum, a) => sum + (a.maxScore || 0), 0);

        let theoryScore = 0;
        if (totalPossibleMarks > 0) {
          if (course.hasPracticalSession) {
            theoryScore = (totalRawTheoryMarks / totalPossibleMarks) * 50;
          } else {
            theoryScore = (totalRawTheoryMarks / totalPossibleMarks) * 100;
          }
        }

        // Get practical score from enrollment if set, otherwise 0
        // If course has practical session but no practical score set, skip this enrollment
        let practicalMarks = 0;
        if (course.hasPracticalSession) {
          // Check if there's already a certificate (from verifier verification)
          const existingCert = await Certificate.findOne({ enrollment: enrollment._id });
          if (existingCert) {
            practicalMarks = existingCert.practicalScore || 0;
          } else if (enrollment.practicalScore !== undefined && enrollment.practicalScore !== null) {
            practicalMarks = enrollment.practicalScore;
          } else {
            // Skip enrollments that need practical score but don't have it
            errors.push({
              enrollmentId: enrollment._id,
              studentName: enrollment.student.name,
              error: 'Practical score required but not set',
            });
            continue;
          }
        }
        const totalScore = theoryScore + practicalMarks;

        // Determine grade
        let grade = constants.GRADES.F;
        if (totalScore >= 90) grade = constants.GRADES.A;
        else if (totalScore >= 80) grade = constants.GRADES.B;
        else if (totalScore >= 70) grade = constants.GRADES.C;
        else if (totalScore >= 60) grade = constants.GRADES.D;

        // Generate certificate
        const crypto = require('crypto');
        const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const verificationHash = crypto.createHash('sha256').update(certificateNumber + enrollment.student._id.toString()).digest('hex');

        const certificate = await Certificate.create({
          enrollment: enrollment._id,
          student: enrollment.student._id,
          course: enrollment.course._id,
          certificateNumber,
          verificationHash,
          theoryScore,
          practicalScore: practicalMarks,
          totalScore,
          grade,
          status: constants.CERTIFICATE_STATUS.ISSUED,
        });

        // Update enrollment with scores
        enrollment.theoryScore = theoryScore;
        enrollment.practicalScore = practicalMarks;
        enrollment.finalScore = totalScore;
        await enrollment.save();

        results.push({
          enrollmentId: enrollment._id,
          studentName: enrollment.student.name,
          status: 'generated',
          certificate: certificate.toObject(),
        });
      } catch (err) {
        errors.push({
          enrollmentId: enrollment._id,
          studentName: enrollment.student.name,
          error: err.message,
        });
      }
    }

    course.resultsGenerated = true;
    await course.save();

    // Notify all completed students that results have been generated
    // This includes both newly generated certificates and existing ones
    try {
      const emailPromises = enrollments.map(async (enrollment) => {
        try {
          // Ensure student is populated
          if (!enrollment.student || typeof enrollment.student === 'string') {
            await enrollment.populate('student', 'name email');
          }
          
          if (enrollment.student && enrollment.student.email) {
            await emailService.sendResultsGeneratedEmail(
              enrollment.student.email,
              enrollment.student.name,
              course.title,
              config.FRONTEND_URL
            );
            logger.info(`Results generated email sent to ${enrollment.student.email} for course ${course.title}`);
          }
        } catch (e) {
          logger.error(`Failed to send results generated email to enrollment ${enrollment._id}:`, e);
        }
      });

      await Promise.all(emailPromises);
      logger.info(`Results generated emails sent to ${enrollments.length} students for course ${course.title}`);
    } catch (e) {
      logger.error('Error sending results generated emails:', e);
    }

    return success(res, 'Results generated', {
      generated: results.filter(r => r.status === 'generated').length,
      alreadyExists: results.filter(r => r.status === 'already_exists').length,
      errors: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/courses/:courseId/publish
 * Publish a course
 */
exports.publishCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { startTimestamp, endTimestamp } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Check if course has lessons
    const Lesson = require('../models/Lesson');
    const lessonCount = await Lesson.countDocuments({ course: courseId });

    if (lessonCount === 0) {
      return error(res, 'Cannot publish a course with no lessons', null, 400);
    }

    course.status = constants.COURSE_STATUS.PUBLISHED;

    if (startTimestamp) {
      course.startTimestamp = new Date(startTimestamp);
    }

    if (endTimestamp) {
      course.endTimestamp = new Date(endTimestamp);
    }

    await course.save();

    // Notify enrolled students that course is published
    try {
      const Enrollment = require('../models/Enrollment');
      const enrollments = await Enrollment.find({ course: courseId })
        .populate('student', 'name email');

      await Promise.all(
        enrollments.map((enrollment) =>
          emailService.sendCoursePublishedEmail(
            enrollment.student.email,
            enrollment.student.name,
            course.title,
            config.FRONTEND_URL
          ).catch((e) => {
            console.error('Failed to send course published email', e);
          })
        )
      );
    } catch (e) {
      console.error('Error sending course published emails', e);
    }

    return success(res, 'Course published successfully', course);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/courses/:courseId
 * Delete a course
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    // Disable delete if course is published
    if (course.status === constants.COURSE_STATUS.PUBLISHED) {
      return error(res, 'Cannot delete a published course', null, 403);
    }

    // Delete related lessons, modules, and assignments
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');
    const Assignment = require('../models/Assignment');

    const lessons = await Lesson.find({ course: courseId });

    for (const lesson of lessons) {
      const modules = await Module.find({ lesson: lesson._id, course: courseId });

      for (const module of modules) {
        if (module.assignment) {
          await Assignment.findByIdAndDelete(module.assignment);
        }
        await Module.findByIdAndDelete(module._id);
      }

      await Lesson.findByIdAndDelete(lesson._id);
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);

    return success(res, 'Course deleted successfully', null);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/courses/:courseId/stop
 * Stop a course
 */
exports.stopCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    course.isStopped = true;
    await course.save();

    return success(res, 'Course stopped successfully', course);
  } catch (err) {
    next(err);
  }
};

// Deprecated: course modules now retrieved via moduleController.getCourseLessonsWithModules




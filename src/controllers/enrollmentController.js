const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /student/enrollments
 * Get all enrollments for logged-in student
 */
exports.getStudentEnrollments = async (req, res, next) => {
  try {
    const Certificate = require('../models/Certificate');

    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate('course', 'title code category level status description resultsGenerated')
      .populate('verifier', 'name email college')
      .sort({ enrolledAt: -1 });

    // Add certificate data for completed enrollments
    const enrollmentsWithCertificates = await Promise.all(
      enrollments.map(async (enrollment) => {
        let certificate = null;
        if (enrollment.status === constants.ENROLLMENT_STATUS.COMPLETED) {
          certificate = await Certificate.findOne({ enrollment: enrollment._id });
        }
        return {
          ...enrollment.toObject(),
          certificate: certificate ? certificate.toObject() : null,
        };
      })
    );

    return success(res, 'Enrollments retrieved', enrollmentsWithCertificates);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /courses/:courseId/enroll
 * Enroll in course
 */
exports.enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { name, email, classYear, college, mobile, verifierId } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return error(res, 'Course not found', null, 404);
    }

    if (course.status === constants.COURSE_STATUS.ARCHIVED) {
      return error(res, 'Course is not available for enrollment', null, 403);
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (existingEnrollment) {
      return error(res, 'You are already enrolled in this course', null, 400);
    }

    // Validate required fields
    if (!name || !email || !classYear || !college || !mobile) {
      return error(res, 'All fields are required for enrollment', null, 400);
    }

    if (email.toLowerCase().trim() !== req.user.email) {
      return error(res, 'Enrollment email must match your account email', null, 400);
    }

    // Validate verifier
    if (course.verifiers?.length) {
      const isVerifierInCourse = course.verifiers.some(
        (v) => v.toString() === verifierId
      );
      if (!verifierId || !isVerifierInCourse) {
        return error(res, 'Please select a valid verifier for this course', null, 400);
      }
    }

    // Find last enrollment for prefill
    const lastEnrollment = await Enrollment.findOne({ student: req.user.id })
      .sort({ createdAt: -1 });

    // Get user info
    const user = await User.findById(req.user.id);

    // Create profile snapshot
    const profileSnapshot = {
      id: user._id.toString(),
      name: name || lastEnrollment?.profileSnapshot?.name || user.name,
      email: user.email,
      classYear: classYear || lastEnrollment?.profileSnapshot?.classYear || user.classYear,
      college: college || lastEnrollment?.profileSnapshot?.college || user.college,
      mobile: mobile || lastEnrollment?.profileSnapshot?.mobile || user.mobile,
    };

    // Update user profile if provided
    if (classYear) user.classYear = classYear;
    if (college) user.college = college;
    if (mobile) user.mobile = mobile;
    await user.save();

    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      verifier: verifierId || undefined,
      profileSnapshot,
      status: constants.ENROLLMENT_STATUS.ONGOING,
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('course', 'title code')
      .populate('student', 'name email');

    return success(res, 'Enrolled successfully', populatedEnrollment, null, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /enrollments/:id
 * Get enrollment details
 */
exports.getEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id)
      .populate('course')
      .populate('student', 'name email college classYear')
      .populate('verifier', 'name email college');

    if (!enrollment) {
      return error(res, 'Enrollment not found', null, 404);
    }

    // Check access
    if (
      enrollment.student._id.toString() !== req.user.id &&
      req.user.role !== constants.ROLES.VERIFIER &&
      req.user.role !== constants.ROLES.ADMIN
    ) {
      return error(res, 'Access denied', null, 403);
    }

    return success(res, 'Enrollment retrieved', enrollment);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/overview
 * Stats for a verifier: total candidates and per-course counts
 */
exports.getVerifierOverview = async (req, res, next) => {
  try {
    const verifierId = req.user.id;

    const totalCandidates = await Enrollment.countDocuments({ verifier: verifierId });

    const perCourse = await Enrollment.aggregate([
      { $match: { verifier: new (require('mongoose').Types.ObjectId)(verifierId) } },
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $project: {
          courseId: '$_id',
          title: '$course.title',
          code: '$course.code',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    return success(res, 'Verifier overview', { totalCandidates, perCourse });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/students
 * Get all students assigned to verifier with their enrollments
 */
exports.getVerifierStudents = async (req, res, next) => {
  try {
    const verifierId = req.user.id;

    const enrollments = await Enrollment.find({ verifier: verifierId })
      .populate('student', 'name email college classYear mobile')
      .populate('course', 'title code hasPracticalSession')
      .sort({ enrolledAt: -1 });

    return success(res, 'Verifier students retrieved', enrollments);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/completed-students
 * Get completed enrollments for verification (not yet verified)
 */
exports.getCompletedStudentsForVerification = async (req, res, next) => {
  try {
    const verifierId = req.user.id;
    const Certificate = require('../models/Certificate');

    // Get all completed enrollments for this verifier
    const enrollments = await Enrollment.find({
      verifier: verifierId,
      status: constants.ENROLLMENT_STATUS.COMPLETED,
    })
      .populate('student', 'name email college classYear')
      .populate('course', 'title code hasPracticalSession')
      .sort({ completedAt: -1 });

    // Filter out enrollments that already have certificates (verified)
    const enrollmentsWithCertificates = await Promise.all(
      enrollments.map(async (enrollment) => {
        const certificate = await Certificate.findOne({ enrollment: enrollment._id });
        return {
          enrollment,
          hasCertificate: !!certificate,
        };
      })
    );

    // Return only enrollments without certificates (not yet verified)
    const unverifiedEnrollments = enrollmentsWithCertificates
      .filter((item) => !item.hasCertificate)
      .map((item) => item.enrollment);

    return success(res, 'Completed students for verification', unverifiedEnrollments);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /verifier/verified-students
 * Get verified students (with certificates)
 */
exports.getVerifiedStudents = async (req, res, next) => {
  try {
    const verifierId = req.user.id;
    const Certificate = require('../models/Certificate');

    // Get all completed enrollments for this verifier
    const enrollments = await Enrollment.find({
      verifier: verifierId,
      status: constants.ENROLLMENT_STATUS.COMPLETED,
    })
      .populate('student', 'name email college classYear')
      .populate('course', 'title code hasPracticalSession')
      .sort({ completedAt: -1 });

    // Get enrollments with certificates
    const enrollmentsWithCertificates = await Promise.all(
      enrollments.map(async (enrollment) => {
        const certificate = await Certificate.findOne({ enrollment: enrollment._id })
          .populate('student', 'name email')
          .populate('course', 'title code');
        return {
          enrollment: enrollment.toObject(),
          certificate: certificate ? certificate.toObject() : null,
        };
      })
    );

    // Return only enrollments with certificates (verified)
    const verifiedEnrollments = enrollmentsWithCertificates
      .filter((item) => item.certificate)
      .map((item) => ({
        ...item.enrollment,
        certificate: item.certificate,
      }));

    return success(res, 'Verified students retrieved', verifiedEnrollments);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /enrollments/:enrollmentId/complete
 * Mark enrollment as completed when student finishes all modules
 */
exports.completeEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('course');

    if (!enrollment) {
      return error(res, 'Enrollment not found', null, 404);
    }

    // Check if student owns this enrollment
    if (enrollment.student.toString() !== req.user.id) {
      return error(res, 'Access denied', null, 403);
    }

    // Check if already completed
    if (enrollment.status === constants.ENROLLMENT_STATUS.COMPLETED) {
      return success(res, 'Enrollment already completed', enrollment);
    }

    // Check if course is published
    if (enrollment.course.status !== constants.COURSE_STATUS.PUBLISHED) {
      return error(res, 'Course is not yet published', null, 400);
    }

    // Mark as completed
    enrollment.status = constants.ENROLLMENT_STATUS.COMPLETED;
    enrollment.completedAt = new Date();
    await enrollment.save();

    return success(res, 'Enrollment marked as completed', enrollment);
  } catch (err) {
    next(err);
  }
};




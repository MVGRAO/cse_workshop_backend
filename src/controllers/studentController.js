const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /student/dashboard
 * Get student dashboard summary
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Get completed courses
    const completedEnrollments = await Enrollment.find({
      student: studentId,
      status: constants.ENROLLMENT_STATUS.COMPLETED,
    })
      .populate('course', 'title code')
      .sort({ completedAt: -1 });

    // Get ongoing courses
    const ongoingEnrollments = await Enrollment.find({
      student: studentId,
      status: constants.ENROLLMENT_STATUS.ONGOING,
    })
      .populate('course', 'title code startTimestamp endTimestamp')
      .sort({ enrolledAt: -1 });

    // Get retake courses
    const retakeEnrollments = await Enrollment.find({
      student: studentId,
      status: constants.ENROLLMENT_STATUS.RETAKE,
    })
      .populate('course', 'title code')
      .sort({ createdAt: -1 });

    // Get certificates count
    const certificatesCount = await Certificate.countDocuments({ student: studentId });

    // Get upcoming courses (published but not enrolled)
    const enrolledCourseIds = await Enrollment.distinct('course', { student: studentId });
    const upcomingCourses = await Course.find({
      status: constants.COURSE_STATUS.PUBLISHED,
      _id: { $nin: enrolledCourseIds },
    })
      .select('title code category level startTimestamp')
      .sort({ startTimestamp: 1 })
      .limit(5);

    return success(res, 'Dashboard data retrieved', {
      completedCourses: completedEnrollments,
      upcomingCourses: upcomingCourses,
      retakeCourses: retakeEnrollments,
      ongoingCourses: ongoingEnrollments,
      certificatesCount,
    });
  } catch (err) {
    next(err);
  }
};


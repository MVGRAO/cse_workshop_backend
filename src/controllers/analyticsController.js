const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Submission = require('../models/Submission');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /admin/analytics/overview
 * Get overview analytics
 */
exports.getOverview = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: constants.ROLES.STUDENT });
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const completedEnrollments = await Enrollment.countDocuments({
      status: constants.ENROLLMENT_STATUS.COMPLETED,
    });
    const totalCertificates = await Certificate.countDocuments();

    const completionRate = totalEnrollments > 0
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2)
      : 0;

    return success(res, 'Analytics retrieved', {
      totalStudents,
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      completionRate: parseFloat(completionRate),
      totalCertificates,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/analytics/courses
 * Get course-wise analytics
 */
exports.getCourseAnalytics = async (req, res, next) => {
  try {
    const courses = await Course.find().select('title code');

    const courseAnalytics = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await Enrollment.countDocuments({ course: course._id });
        const completed = await Enrollment.countDocuments({
          course: course._id,
          status: constants.ENROLLMENT_STATUS.COMPLETED,
        });
        const certificates = await Certificate.countDocuments({ course: course._id });

        return {
          courseId: course._id,
          courseTitle: course.title,
          courseCode: course.code,
          totalEnrollments: enrollments,
          completedEnrollments: completed,
          certificatesIssued: certificates,
          completionRate: enrollments > 0 ? ((completed / enrollments) * 100).toFixed(2) : 0,
        };
      })
    );

    return success(res, 'Course analytics retrieved', courseAnalytics);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/analytics/colleges
 * Get college-wise analytics
 */
exports.getCollegeAnalytics = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('student', 'college')
      .select('student status');

    const collegeMap = {};

    enrollments.forEach((enrollment) => {
      const college = enrollment.student?.college || 'Unknown';
      if (!collegeMap[college]) {
        collegeMap[college] = {
          college,
          totalStudents: 0,
          totalEnrollments: 0,
          completedEnrollments: 0,
        };
      }

      collegeMap[college].totalEnrollments++;
      if (enrollment.status === constants.ENROLLMENT_STATUS.COMPLETED) {
        collegeMap[college].completedEnrollments++;
      }
    });

    // Count unique students per college
    const students = await User.find({ role: constants.ROLES.STUDENT }).select('college');
    students.forEach((student) => {
      const college = student.college || 'Unknown';
      if (collegeMap[college]) {
        collegeMap[college].totalStudents++;
      }
    });

    const collegeAnalytics = Object.values(collegeMap).map((data) => ({
      ...data,
      completionRate:
        data.totalEnrollments > 0
          ? ((data.completedEnrollments / data.totalEnrollments) * 100).toFixed(2)
          : 0,
    }));

    return success(res, 'College analytics retrieved', collegeAnalytics);
  } catch (err) {
    next(err);
  }
};


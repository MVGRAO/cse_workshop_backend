module.exports = {
  // User Roles
  ROLES: {
    STUDENT: 'student',
    VERIFIER: 'verifier',
    ADMIN: 'admin',
  },

  // Course Status
  COURSE_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
  },

  // Enrollment Status
  ENROLLMENT_STATUS: {
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    RETAKE: 'retake',
  },

  // Submission Status
  SUBMISSION_STATUS: {
    PENDING: 'pending',
    EVALUATED: 'evaluated',
    REJECTED: 'rejected',
  },

  // Assignment Types
  ASSIGNMENT_TYPE: {
    THEORY: 'theory',
    PRACTICAL: 'practical',
  },

  // Question Types
  QUESTION_TYPE: {
    MCQ: 'mcq',
    SHORT: 'short',
    CODE: 'code',
  },

  // Doubt Status
  DOUBT_STATUS: {
    OPEN: 'open',
    ANSWERED: 'answered',
    CLOSED: 'closed',
  },

  // Certificate Status
  CERTIFICATE_STATUS: {
    ISSUED: 'issued',
    REVOKED: 'revoked',
  },

  // User Status
  USER_STATUS: {
    ACTIVE: true,
    INACTIVE: false,
  },

  // Grades
  GRADES: {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    F: 'F',
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};




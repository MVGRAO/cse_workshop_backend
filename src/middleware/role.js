const { error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', null, 401);
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return error(res, 'Access denied. Insufficient permissions.', null, 403);
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole(constants.ROLES.ADMIN);

/**
 * Middleware to check if user is verifier
 */
const requireVerifier = requireRole(constants.ROLES.VERIFIER);

/**
 * Middleware to check if user is student
 */
const requireStudent = requireRole(constants.ROLES.STUDENT);

/**
 * Middleware to check if user is verifier or admin
 */
const requireVerifierOrAdmin = requireRole([constants.ROLES.VERIFIER, constants.ROLES.ADMIN]);

module.exports = {
  requireRole,
  requireAdmin,
  requireVerifier,
  requireStudent,
  requireVerifierOrAdmin,
};


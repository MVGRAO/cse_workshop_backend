/**
 * Standard API response wrapper
 */
const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Success response
 */
const success = (res, message = 'Success', data = null, meta = null, statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data, meta);
};

/**
 * Error response
 */
const error = (res, message = 'Error', details = null, statusCode = 400) => {
  const response = {
    success: false,
    message,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  success,
  error,
  sendResponse,
};


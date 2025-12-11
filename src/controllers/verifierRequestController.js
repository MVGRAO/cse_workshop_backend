const bcrypt = require('bcryptjs');
const validator = require('validator');
const VerifierRequest = require('../models/VerifierRequest');
const User = require('../models/User');
const constants = require('../utils/constants');
const { success, error } = require('../utils/response');

const EMAIL_REGEX = /^(?!n\d)[A-Za-z0-9._%+-]+@[\w.-]*rguktn\.ac\.in$/i;

const generatePassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

exports.createRequest = async (req, res, next) => {
  try {
    const { name, email, phone, college } = req.body;

    if (!name || !email || !college) {
      return error(res, 'Name, college and email are required', null, 400);
    }

    if (!validator.isEmail(email)) {
      return error(res, 'Please provide a valid email address', null, 400);
    }

    if (!EMAIL_REGEX.test(email)) {
      return error(res, 'Email must be an rguktn.ac.in address and not start with n followed by a number', null, 400);
    }

    const existingRequest = await VerifierRequest.findOne({ email: email.toLowerCase() });
    if (existingRequest) {
      return error(res, 'A request with this email already exists', null, 409);
    }

    await VerifierRequest.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      college: college.trim(),
      status: 'pending',
    });

    return success(res, 'Request submitted successfully', null, null, 201);
  } catch (err) {
    next(err);
  }
};

exports.listRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const requests = await VerifierRequest.find(query)
      .sort({ createdAt: -1 });

    return success(res, 'Verifier requests retrieved', requests);
  } catch (err) {
    next(err);
  }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await VerifierRequest.findById(id);
    if (!request) {
      return error(res, 'Request not found', null, 404);
    }

    if (request.status === 'accepted') {
      return error(res, 'Request already accepted', null, 400);
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email: request.email });
    if (user) {
      user.role = constants.ROLES.VERIFIER;
      user.password = hashedPassword;
      user.name = request.name;
      user.college = request.college;
      await user.save();
    } else {
      user = await User.create({
        name: request.name,
        email: request.email,
        password: hashedPassword,
        role: constants.ROLES.VERIFIER,
        college: request.college,
      });
    }

    request.status = 'accepted';
    request.generatedPassword = password;
    request.processedBy = req.user?.id;
    await request.save();

    return success(res, 'Verifier created and request accepted', {
      verifier: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
      },
      password,
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await VerifierRequest.findById(id);
    if (!request) {
      return error(res, 'Request not found', null, 404);
    }

    request.status = 'rejected';
    request.processedBy = req.user?.id;
    await request.save();

    return success(res, 'Request rejected', request);
  } catch (err) {
    next(err);
  }
};



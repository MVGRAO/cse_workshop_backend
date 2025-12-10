# CSE Workshop Backend

Backend API for CSE Workshop Management System built with Node.js, Express, and MongoDB.

## Features

- 🔐 Google Sign-In Authentication (College Email Only)
- 👥 Role-based Access Control (Student, Verifier, Admin)
- 📚 Course & Module Management
- 📝 Assignment & Submission System
- ✅ Evaluation & Grading
- 🎓 Certificate Generation
- 💬 Doubt/Help System
- 📊 Analytics Dashboard

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Google OAuth 2.0 + JWT
- **PDF Generation:** PDFKit
- **Email:** Nodemailer

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Google OAuth 2.0 credentials
- Email service credentials (optional, for email notifications)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cse_workshop_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Edit `src/config/env.js` or set environment variables:
   
   ```javascript
   // Required
   MONGODB_URI=mongodb://localhost:27017/cse_workshop
   GOOGLE_CLIENT_ID=your-google-client-id
   JWT_SECRET=your-super-secret-jwt-key
   
   // Optional
   PORT=5000
   NODE_ENV=development
   ALLOWED_EMAIL_DOMAINS=@college.edu,@university.edu
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system or use a cloud instance.

5. **Run the server**
   
   Development mode:
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

6. **Verify installation**
   
   Visit `http://localhost:5000/health` to check if the server is running.

## Project Structure

```
cse_workshop_backend/
├── src/
│   ├── config/
│   │   ├── env.js          # Environment configuration
│   │   ├── db.js            # MongoDB connection
│   │   └── googleAuth.js    # Google OAuth setup
│   ├── models/
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Module.js
│   │   ├── Assignment.js
│   │   ├── Enrollment.js
│   │   ├── Submission.js
│   │   ├── Certificate.js
│   │   └── Doubt.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── courseController.js
│   │   ├── moduleController.js
│   │   ├── enrollmentController.js
│   │   ├── assignmentController.js
│   │   ├── submissionController.js
│   │   ├── evaluationController.js
│   │   ├── certificateController.js
│   │   ├── doubtController.js
│   │   ├── analyticsController.js
│   │   └── studentController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   ├── role.js          # Role-based authorization
│   │   └── errorHandler.js  # Global error handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── verifierRoutes.js
│   │   ├── adminRoutes.js
│   │   └── publicRoutes.js
│   ├── services/
│   │   ├── certificateService.js
│   │   └── emailService.js
│   └── utils/
│       ├── logger.js
│       ├── response.js
│       └── constants.js
├── index.js                 # Entry point
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/google` - Authenticate with Google
- `GET /api/v1/auth/me` - Get current user profile

### Student Routes (`/api/v1/student`)
- `GET /dashboard` - Student dashboard
- `GET /courses/available` - List available courses
- `POST /courses/:courseId/enroll` - Enroll in course
- `GET /enrollments` - Get student enrollments
- `GET /courses/:courseId/modules` - Get course modules
- `GET /modules/:moduleId` - Get module details
- `GET /modules/:moduleId/assignment` - Get assignment
- `POST /assignments/:assignmentId/start` - Start assignment
- `POST /assignments/:assignmentId/submit` - Submit assignment
- `GET /certificates` - Get certificates
- `POST /courses/:courseId/modules/:moduleId/doubts` - Create doubt
- `GET /doubts` - Get student doubts

### Verifier Routes (`/api/v1/verifier`)
- `GET /courses` - Get assigned courses
- `GET /courses/:courseId/students` - Get enrolled students
- `GET /courses/:courseId/submissions` - Get submissions
- `PATCH /submissions/:submissionId/theory-evaluate` - Evaluate theory
- `PATCH /submissions/:submissionId/practical-evaluate` - Evaluate practical
- `POST /enrollments/:enrollmentId/finalize` - Finalize enrollment
- `GET /doubts` - Get doubts
- `PATCH /doubts/:doubtId/answer` - Answer doubt

### Admin Routes (`/api/v1/admin`)
- `POST /courses` - Create course
- `PATCH /courses/:courseId` - Update course
- `POST /courses/:courseId/publish` - Publish course
- `POST /courses/:courseId/assign-verifier` - Assign verifiers
- `POST /courses/:courseId/modules` - Create module
- `PATCH /modules/:moduleId` - Update module
- `POST /assignments` - Create assignment
- `PATCH /assignments/:assignmentId` - Update assignment
- `GET /users` - Get users
- `PATCH /users/:userId` - Update user
- `DELETE /users/:userId` - Delete user
- `POST /verifiers` - Create verifier
- `GET /analytics/overview` - Overview analytics
- `GET /analytics/courses` - Course analytics
- `GET /analytics/colleges` - College analytics

### Public Routes (`/api/v1`)
- `GET /certificates/verify/:verificationHash` - Verify certificate (public)

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is obtained after successful Google authentication via `/api/v1/auth/google`.

## Roles

- **student**: Can enroll in courses, submit assignments, view certificates
- **verifier**: Can evaluate submissions, manage students, answer doubts
- **admin**: Full access to all resources

## Error Handling

All errors are returned in a standard format:

```json
{
  "success": false,
  "message": "Error message",
  "details": {}
}
```

## Response Format

Successful responses follow this format:

```json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "meta": {}
}
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server on file changes.

### Environment Variables

The application uses `src/config/env.js` for configuration. You can override values using environment variables or modify the file directly (since it's shared in git as requested).

## Production Deployment

1. Set `NODE_ENV=production`
2. Update MongoDB URI to production database
3. Set secure `JWT_SECRET`
4. Configure email service
5. Set up proper CORS origins
6. Enable HTTPS
7. Configure rate limiting appropriately

## License

ISC

## Support

For issues and questions, please contact the development team.


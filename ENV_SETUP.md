# Environment Variables Setup Guide

## Backend Configuration

Create a `.env` file in the `cse_workshop_backend` directory (same level as `package.json`) with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection (already configured in code, but you can override)
MONGODB_URI=your-mongodb-connection-string

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# Google OAuth Configuration (REQUIRED)
# Get these from Google Cloud Console: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Allowed Email Domains (comma-separated, no spaces)
# Only users with these email domains can sign in
ALLOWED_EMAIL_DOMAINS=@college.edu,@university.edu

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Email Configuration (optional, for sending registration emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@workshop.edu

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Certificate
CERTIFICATE_BASE_URL=http://localhost:5000
```

## Important Notes

1. **GOOGLE_CLIENT_ID** - This MUST be the same value as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in your frontend `.env.local` file
2. **GOOGLE_CLIENT_SECRET** - Get this from Google Cloud Console (same place as Client ID)
3. **ALLOWED_EMAIL_DOMAINS** - Add your allowed email domains (e.g., `@rgukt.ac.in,@college.edu`)
4. **FRONTEND_URL** - Must match your frontend URL (default: `http://localhost:3000`)

## Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure OAuth consent screen if prompted:
   - Choose **External** user type
   - Fill in App name, User support email
   - Add test users if needed
6. For OAuth client:
   - Application type: **Web application**
   - Name: CSE Workshop
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (for development)
     - Your production URL (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs:** Not needed for ID token flow
   - Click **Create**
7. Copy both:
   - **Client ID** → Use in both frontend and backend
   - **Client Secret** → Use only in backend

## After Creating .env File

1. Restart your backend server:
   ```bash
   cd cse_workshop_backend
   npm run dev
   ```

2. Verify the server starts without errors
3. Check that environment variables are loaded (you should see no errors about missing GOOGLE_CLIENT_ID)

## Troubleshooting

### "GOOGLE_CLIENT_ID is not set" error
- Make sure `.env` file exists in `cse_workshop_backend` directory
- Check that variable name is exactly `GOOGLE_CLIENT_ID` (no typos)
- Restart the server after creating/modifying `.env`
- Make sure there are no spaces around the `=` sign

### CORS errors
- Verify `FRONTEND_URL` matches your frontend URL exactly
- Check that frontend is running on the URL specified in `FRONTEND_URL`

### Email domain not allowed
- Check `ALLOWED_EMAIL_DOMAINS` format (comma-separated, with @ symbol)
- Example: `@rgukt.ac.in,@college.edu` (no spaces)


# Security Issues and Recommendations

## Critical Issues

### 1. Plain Text Password Storage
**Location**: `src/models/team.model.js`

**Issue**: Passwords are currently stored in plain text in the database. This is a critical security vulnerability.

**Recommendation**: Implement password hashing using bcrypt or similar before storing passwords.

**Example Fix**:
```javascript
const bcrypt = require('bcrypt');

// Before saving
teamSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// For login comparison
teamSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
```

## Recommended Improvements

### 2. Environment Variables
Ensure all sensitive configuration values are stored in environment variables and never committed to version control:
- JWT_SECRET
- MONGO_URI
- REDIS_PASSWORD
- AZURE_STORAGE_CONNECTION_STRING
- JUDGE0_API_KEY

### 3. Rate Limiting
Consider implementing rate limiting on API endpoints to prevent abuse, especially:
- `/api/auth/login`
- `/api/submission/submit`

### 4. Input Validation
Add comprehensive input validation using libraries like `joi` or `express-validator` to prevent injection attacks.

### 5. CORS Configuration
Review CORS configuration to ensure only trusted domains can access the API in production.

### 6. Code Execution Security
The Judge0 integration executes user-submitted code. Ensure proper sandboxing and resource limits are in place.

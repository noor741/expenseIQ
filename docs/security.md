# Security & Permissions Documentation

## 🔒 Overview

ExpenseIQ implements a comprehensive security model using multiple layers of protection including Row Level Security (RLS), JWT authentication, role-based access control, and secure file handling to ensure user data privacy and system integrity.

## 🏗️ Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                  Authentication Layer                       │
│  • JWT Token Validation                                     │
│  • Session Management                                       │
│  • Password Security                                        │
├─────────────────────────────────────────────────────────────┤
│                 Authorization Layer                         │
│  • Row Level Security (RLS)                                │
│  • Role-Based Access Control                               │
│  • API Endpoint Protection                                 │
├─────────────────────────────────────────────────────────────┤
│                   Storage Layer                             │
│  • Private Bucket Policies                                 │
│  • File Access Control                                     │
│  • Service Role Authentication                             │
├─────────────────────────────────────────────────────────────┤
│                  Network Layer                              │
│  • HTTPS Encryption                                        │
│  • CORS Policies                                           │
│  • Rate Limiting                                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication System

### JWT Token Management

**Implementation**: `context/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Secure token storage
const storeSecureToken = async (token: string) => {
  await SecureStore.setItemAsync('auth_token', token, {
    keychainService: 'ExpenseIQ',
    requireAuthentication: true, // Biometric protection
    accessGroup: 'group.expenseiq.app'
  });
};

// Token validation
const validateToken = async (token: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    return !error && data.user !== null;
  } catch {
    return false;
  }
};
```

### Password Security

```typescript
// Password strength validation
const validatePassword = (password: string): ValidationResult => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  
  return {
    isValid: score >= 4,
    strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
    requirements
  };
};

// Secure password reset
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/reset-password`,
    captchaToken: await getCaptchaToken() // CAPTCHA protection
  });
  
  if (error) throw error;
};
```

### Session Management

```typescript
// Session lifecycle management
class SessionManager {
  private refreshTimer: NodeJS.Timeout | null = null;

  async initializeSession(token: string) {
    // Validate token
    const isValid = await this.validateToken(token);
    if (!isValid) {
      throw new Error('Invalid session token');
    }

    // Set up automatic refresh
    this.scheduleTokenRefresh(token);
    
    // Track session
    await this.trackSession('login');
  }

  async scheduleTokenRefresh(token: string) {
    const payload = this.parseJWT(token);
    const expiresAt = payload.exp * 1000;
    const refreshAt = expiresAt - 5 * 60 * 1000; // 5 minutes before expiry

    this.refreshTimer = setTimeout(async () => {
      await this.refreshToken();
    }, refreshAt - Date.now());
  }

  async refreshToken() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      await this.storeSecureToken(data.session.access_token);
      this.scheduleTokenRefresh(data.session.access_token);
    } catch (error) {
      // Token refresh failed - require re-authentication
      await this.logout();
    }
  }

  async logout() {
    // Clear stored tokens
    await SecureStore.deleteItemAsync('auth_token');
    
    // Clear session timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Revoke server session
    await supabase.auth.signOut();
    
    // Track logout
    await this.trackSession('logout');
  }
}
```

## 🛡️ Row Level Security (RLS)

### Database Security Policies

**Users Table Policies**:
```sql
-- Users can only view their own profile
CREATE POLICY "users_select_own" ON users
FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "users_update_own" ON users
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Prevent users from changing their own ID
CREATE POLICY "users_immutable_id" ON users
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (id = auth.uid());
```

**Receipts Table Policies**:
```sql
-- Complete ownership model
CREATE POLICY "receipts_full_access_own" ON receipts
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Time-based access restriction
CREATE POLICY "receipts_recent_only" ON receipts
FOR SELECT USING (
  auth.uid() = user_id 
  AND upload_date > NOW() - INTERVAL '2 years'
);

-- Status-based restrictions
CREATE POLICY "receipts_no_delete_processed" ON receipts
FOR DELETE USING (
  auth.uid() = user_id 
  AND status != 'processed'
);
```

**Storage Object Policies**:
```sql
-- User folder isolation
CREATE POLICY "storage_user_folder_only" ON storage.objects
FOR ALL USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- File type restrictions
CREATE POLICY "storage_image_files_only" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND lower(right(name, 4)) IN ('.jpg', '.png', 'heic', 'jpeg')
);

-- File size limits
CREATE POLICY "storage_size_limit" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND COALESCE(metadata->>'size', '0')::bigint <= 10485760 -- 10MB
);
```

### Advanced RLS Patterns

```sql
-- Conditional access based on user role
CREATE POLICY "admin_access_all" ON receipts
FOR SELECT USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'support')
  )
);

-- IP-based restrictions
CREATE POLICY "ip_restricted_operations" ON receipts
FOR DELETE USING (
  auth.uid() = user_id
  AND current_setting('request.headers', true)::json->>'x-forwarded-for' 
      NOT IN (SELECT ip FROM blocked_ips)
);

-- Time-window restrictions
CREATE POLICY "business_hours_only" ON sensitive_operations
FOR ALL USING (
  EXTRACT(hour FROM NOW() AT TIME ZONE 'UTC') BETWEEN 8 AND 18
  AND EXTRACT(dow FROM NOW()) BETWEEN 1 AND 5
);
```

## 🔑 Service Role Authentication

### Service Role Implementation

**File**: `supabase/functions/_shared/supabase.ts`

```typescript
// Service role client for system operations
export const createServiceSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  );
};

// Safe service operations with logging
export const executeServiceOperation = async <T>(
  operation: (client: SupabaseClient) => Promise<T>,
  context: string
): Promise<T> => {
  const serviceClient = createServiceSupabaseClient();
  
  try {
    console.log(`🔧 Service operation started: ${context}`);
    const result = await operation(serviceClient);
    console.log(`✅ Service operation completed: ${context}`);
    return result;
  } catch (error) {
    console.error(`❌ Service operation failed: ${context}`, error);
    throw error;
  }
};
```

### OCR Processing Security

```typescript
// Secure OCR processing with service role
const processReceiptOCR = async (receiptId: string, fileUrl: string) => {
  await executeServiceOperation(async (serviceClient) => {
    // Download file with service role (bypasses RLS)
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('receipts')
      .download(fileUrl);
      
    if (downloadError) throw downloadError;

    // Process with Azure OCR
    const ocrResult = await azureOCR.processReceipt(fileData);

    // Update receipt with service role
    const { error: updateError } = await serviceClient
      .from('receipts')
      .update({
        status: 'processed',
        raw_ocr_json: ocrResult.rawData,
        processed_at: new Date().toISOString()
      })
      .eq('id', receiptId);
      
    if (updateError) throw updateError;
    
  }, `OCR processing for receipt ${receiptId}`);
};
```

## 🚦 API Security

### Request Validation

```typescript
// Comprehensive request validation
const validateAPIRequest = async (req: Request) => {
  // 1. Rate limiting
  await checkRateLimit(req);
  
  // 2. Authentication
  const token = extractAuthToken(req);
  const user = await validateUser(token);
  
  // 3. Authorization
  await checkPermissions(user, req.method, req.url);
  
  // 4. Input validation
  const body = await validateRequestBody(req);
  
  // 5. CSRF protection
  await validateCSRFToken(req);
  
  return { user, body };
};

// Rate limiting implementation
const rateLimiter = new Map<string, RateLimitInfo>();

interface RateLimitInfo {
  requests: number[];
  blocked: boolean;
  blockUntil?: number;
}

const checkRateLimit = async (req: Request) => {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;
  
  let info = rateLimiter.get(clientId) || { requests: [], blocked: false };
  
  // Check if client is currently blocked
  if (info.blocked && info.blockUntil && now < info.blockUntil) {
    throw new Error('Rate limit exceeded. Try again later.');
  }
  
  // Remove old requests outside the window
  info.requests = info.requests.filter(timestamp => now - timestamp < windowMs);
  
  // Check current request count
  if (info.requests.length >= maxRequests) {
    info.blocked = true;
    info.blockUntil = now + windowMs;
    rateLimiter.set(clientId, info);
    throw new Error('Rate limit exceeded. Try again later.');
  }
  
  // Add current request
  info.requests.push(now);
  info.blocked = false;
  rateLimiter.set(clientId, info);
};
```

### Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Comprehensive input sanitization
const sanitizeInput = (input: any, type: string): any => {
  if (typeof input !== 'string') {
    return input;
  }

  switch (type) {
    case 'email':
      return validator.isEmail(input) ? validator.normalizeEmail(input) : null;
      
    case 'phone':
      return validator.isMobilePhone(input) ? 
        validator.normalizePhone(input) : null;
        
    case 'html':
      return DOMPurify.sanitize(input, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      
    case 'filename':
      return input.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 255);
      
    case 'numeric':
      return validator.isNumeric(input) ? parseFloat(input) : null;
      
    default:
      return validator.escape(input);
  }
};

// Schema-based validation
const validateReceiptData = (data: any) => {
  const schema = {
    file_url: { type: 'filename', required: true, maxLength: 500 },
    status: { type: 'enum', values: ['uploaded', 'processing', 'processed'], required: false },
    amount: { type: 'numeric', min: 0, max: 999999.99, required: false }
  };

  const validated: any = {};
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (!value || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      // Type validation and sanitization
      const sanitized = sanitizeInput(value, rules.type);
      
      if (sanitized === null) {
        errors.push(`${field} has invalid format`);
        continue;
      }
      
      // Additional validation rules
      if (rules.maxLength && sanitized.length > rules.maxLength) {
        errors.push(`${field} exceeds maximum length`);
        continue;
      }
      
      if (rules.min !== undefined && sanitized < rules.min) {
        errors.push(`${field} is below minimum value`);
        continue;
      }
      
      if (rules.max !== undefined && sanitized > rules.max) {
        errors.push(`${field} exceeds maximum value`);
        continue;
      }
      
      if (rules.values && !rules.values.includes(sanitized)) {
        errors.push(`${field} has invalid value`);
        continue;
      }
      
      validated[field] = sanitized;
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return validated;
};
```

## 🔐 File Security

### Secure File Upload

```typescript
// File validation and security checks
const validateFileUpload = async (file: File): Promise<FileValidation> => {
  const validation: FileValidation = {
    isValid: true,
    errors: [],
    metadata: {}
  };

  // 1. File size validation
  if (file.size > 10 * 1024 * 1024) { // 10MB
    validation.errors.push('File size exceeds 10MB limit');
  }

  // 2. File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic'];
  if (!allowedTypes.includes(file.type)) {
    validation.errors.push('File type not allowed');
  }

  // 3. File content validation
  const buffer = await file.arrayBuffer();
  const contentType = await detectFileType(buffer);
  
  if (contentType !== file.type) {
    validation.errors.push('File content does not match declared type');
  }

  // 4. Malware scanning (if available)
  const scanResult = await scanFileForMalware(buffer);
  if (!scanResult.clean) {
    validation.errors.push('File failed security scan');
  }

  // 5. Image-specific validation
  if (file.type.startsWith('image/')) {
    try {
      const imageData = await analyzeImage(buffer);
      validation.metadata = {
        width: imageData.width,
        height: imageData.height,
        hasText: imageData.containsText
      };
      
      // Minimum resolution check
      if (imageData.width < 100 || imageData.height < 100) {
        validation.errors.push('Image resolution too low');
      }
    } catch {
      validation.errors.push('Invalid image file');
    }
  }

  validation.isValid = validation.errors.length === 0;
  return validation;
};

// Secure filename generation
const generateSecureFilename = (userId: string, originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  
  return `${userId}/${timestamp}_${random}${extension}`;
};
```

### Storage Security

```typescript
// Secure file access with temporary URLs
const generateSecureFileURL = async (
  userId: string, 
  filename: string, 
  expiresIn: number = 3600
): Promise<string> => {
  // Verify user owns the file
  const filePath = `${userId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filePath, expiresIn, {
      download: false, // View only
      transform: {
        width: 800,     // Optimize for viewing
        quality: 80
      }
    });

  if (error) throw error;
  return data.signedUrl;
};

// Audit file access
const auditFileAccess = async (
  userId: string,
  filename: string,
  action: 'view' | 'download' | 'upload' | 'delete',
  ipAddress?: string
) => {
  await supabase
    .from('file_access_log')
    .insert({
      user_id: userId,
      filename,
      action,
      ip_address: ipAddress,
      timestamp: new Date().toISOString(),
      user_agent: getUserAgent()
    });
};
```

## 🛡️ Data Protection

### Encryption at Rest

```typescript
// Client-side encryption for sensitive data
const encryptSensitiveData = async (data: string, userId: string): Promise<string> => {
  const key = await deriveUserKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};

const decryptSensitiveData = async (encryptedData: string, userId: string): Promise<string> => {
  const key = await deriveUserKey(userId);
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
};
```

### Data Anonymization

```typescript
// Anonymize user data for analytics
const anonymizeUserData = (userData: any): any => {
  const anonymized = { ...userData };
  
  // Hash personally identifiable information
  if (anonymized.email) {
    anonymized.email_hash = crypto
      .createHash('sha256')
      .update(anonymized.email + SALT)
      .digest('hex');
    delete anonymized.email;
  }
  
  if (anonymized.phone) {
    anonymized.phone_hash = crypto
      .createHash('sha256')
      .update(anonymized.phone + SALT)
      .digest('hex');
    delete anonymized.phone;
  }
  
  // Generalize location data
  if (anonymized.location) {
    anonymized.location_region = getRegionFromCoordinates(anonymized.location);
    delete anonymized.location;
  }
  
  return anonymized;
};
```

## 🚨 Security Monitoring

### Threat Detection

```typescript
// Anomaly detection system
const detectAnomalousActivity = async (userId: string, activity: ActivityEvent) => {
  const recentActivity = await getUserRecentActivity(userId, 24); // Last 24 hours
  
  const anomalies: Anomaly[] = [];
  
  // Check for unusual login patterns
  const loginLocations = recentActivity
    .filter(a => a.type === 'login')
    .map(a => a.location);
    
  if (loginLocations.length > 1 && hasDistantLocations(loginLocations)) {
    anomalies.push({
      type: 'suspicious_location',
      severity: 'medium',
      details: 'Login from unusual location'
    });
  }
  
  // Check for rapid API calls
  const apiCalls = recentActivity
    .filter(a => a.type === 'api_call')
    .filter(a => Date.now() - a.timestamp < 60000); // Last minute
    
  if (apiCalls.length > 50) {
    anomalies.push({
      type: 'rate_limit_suspicious',
      severity: 'high',
      details: 'Unusually high API usage'
    });
  }
  
  // Check for failed authentication attempts
  const failedLogins = recentActivity
    .filter(a => a.type === 'failed_login')
    .filter(a => Date.now() - a.timestamp < 3600000); // Last hour
    
  if (failedLogins.length > 5) {
    anomalies.push({
      type: 'brute_force',
      severity: 'critical',
      details: 'Multiple failed login attempts'
    });
  }
  
  // Process detected anomalies
  for (const anomaly of anomalies) {
    await handleSecurityAnomaly(userId, anomaly);
  }
};

const handleSecurityAnomaly = async (userId: string, anomaly: Anomaly) => {
  // Log the incident
  await logSecurityIncident(userId, anomaly);
  
  // Take appropriate action based on severity
  switch (anomaly.severity) {
    case 'critical':
      await lockUserAccount(userId, '24 hours');
      await notifySecurityTeam(anomaly);
      await notifyUser(userId, 'account_locked');
      break;
      
    case 'high':
      await requireAdditionalAuthentication(userId);
      await notifyUser(userId, 'security_alert');
      break;
      
    case 'medium':
      await logForReview(userId, anomaly);
      break;
  }
};
```

### Security Audit Trail

```typescript
// Comprehensive audit logging
const auditSecurityEvent = async (event: SecurityEvent) => {
  await supabase
    .from('security_audit_log')
    .insert({
      event_type: event.type,
      user_id: event.userId,
      session_id: event.sessionId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      details: event.details,
      severity: event.severity,
      timestamp: new Date().toISOString(),
      geolocation: await getGeolocation(event.ipAddress)
    });
    
  // Alert on critical events
  if (event.severity === 'critical') {
    await alertSecurityTeam(event);
  }
};

// Security report generation
const generateSecurityReport = async (timeRange: TimeRange): Promise<SecurityReport> => {
  const [incidents, metrics, trends] = await Promise.all([
    getSecurityIncidents(timeRange),
    getSecurityMetrics(timeRange),
    analyzeSecurityTrends(timeRange)
  ]);
  
  return {
    summary: {
      totalIncidents: incidents.length,
      criticalIncidents: incidents.filter(i => i.severity === 'critical').length,
      affectedUsers: new Set(incidents.map(i => i.userId)).size,
      mostCommonThreats: getMostCommonThreats(incidents)
    },
    metrics,
    trends,
    recommendations: generateSecurityRecommendations(incidents, metrics)
  };
};
```

## 🔧 Security Configuration

### Environment Security

```bash
# Production security environment variables
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # High privilege - protect carefully
JWT_SECRET=your_jwt_secret_key                   # Used for token signing
ENCRYPTION_KEY=your_encryption_key               # For client-side encryption
SECURITY_SALT=your_security_salt                 # For hashing operations

# Security settings
RATE_LIMIT_REQUESTS=100                          # Requests per window
RATE_LIMIT_WINDOW=900000                         # 15 minutes in ms
SESSION_TIMEOUT=3600000                          # 1 hour in ms
MAX_LOGIN_ATTEMPTS=5                             # Before account lock
ACCOUNT_LOCK_DURATION=1800000                    # 30 minutes in ms
```

### Security Headers

```typescript
// Security headers for all responses
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://trusted-cdn.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.expenseiq.com",
    "frame-ancestors 'none'"
  ].join('; ')
};
```

This comprehensive security documentation ensures ExpenseIQ maintains the highest standards of data protection and user privacy while providing a seamless user experience.

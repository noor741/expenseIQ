# API Architecture Documentation

## 🏗️ Overview

ExpenseIQ uses Supabase Edge Functions (Deno runtime) to provide a robust, scalable API architecture with RESTful endpoints, real-time capabilities, and seamless integration with the database and storage systems.

## 📁 File Structure

```
supabase/functions/
├── receipts/
│   └── index.ts          # Receipt management API
├── expenses/
│   └── index.ts          # Expense tracking API
├── categories/
│   └── index.ts          # Category management API
├── users/
│   └── index.ts          # User profile and stats API
└── _shared/
    ├── cors.ts           # CORS handling utilities
    ├── supabase.ts       # Database client utilities
    ├── azureOCR.ts       # OCR service integration
    └── types.ts          # TypeScript type definitions
```

## 🔗 API Endpoints

### Receipts API (`/functions/v1/receipts`)

**File**: `supabase/functions/receipts/index.ts`

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/receipts` | List user receipts with pagination | Yes |
| GET | `/receipts/{id}` | Get specific receipt details | Yes |
| POST | `/receipts` | Create new receipt with file upload | Yes |
| PUT | `/receipts/{id}` | Update receipt information | Yes |
| DELETE | `/receipts/{id}` | Delete receipt and associated file | Yes |

#### Request/Response Examples

**Create Receipt (POST)**
```typescript
// Request
{
  "file_url": "user123/receipt_456.jpg",
  "status": "uploaded"
}

// Response
{
  "success": true,
  "data": {
    "id": "receipt_uuid",
    "user_id": "user123",
    "file_url": "user123/receipt_456.jpg",
    "upload_date": "2024-01-15T10:30:00Z",
    "status": "uploaded"
  }
}
```

**List Receipts (GET)**
```typescript
// Query Parameters
?page=1&limit=20&status=processed&sort=upload_date&order=desc

// Response
{
  "success": true,
  "data": {
    "receipts": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Users API (`/functions/v1/users`)

**File**: `supabase/functions/users/index.ts`

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | Get user dashboard stats | Yes |
| GET | `/users/profile` | Get user profile information | Yes |
| PUT | `/users/profile` | Update user profile | Yes |

#### Implementation

```typescript
export default async function handler(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return createErrorResponse('Authorization required', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await getUser(token);
  const supabase = createSupabaseClient(token);

  switch (req.method) {
    case 'GET':
      if (endpoint === 'profile') {
        return getUserProfile(supabase, user.id);
      } else {
        return getUserStats(supabase, user.id);
      }
      
    case 'PUT':
      if (endpoint === 'profile') {
        const updateData = await req.json();
        return updateUserProfile(supabase, user.id, updateData);
      }
      
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}
```

### Expenses API (`/functions/v1/expenses`)

**File**: `supabase/functions/expenses/index.ts`

#### Features
- CRUD operations for expense records
- Category assignment and filtering
- Date range queries
- Expense analytics and summaries

### Categories API (`/functions/v1/categories`)

**File**: `supabase/functions/categories/index.ts`

#### Features
- Predefined and custom categories
- Category usage statistics
- Hierarchical category support
- Bulk category operations

## 🛠️ Shared Utilities

### CORS Handling

**File**: `supabase/functions/_shared/cors.ts`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export const createResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

export const createErrorResponse = (message: string, status = 400) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// Handle preflight requests
export const handleCORS = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
};
```

### Database Client Management

**File**: `supabase/functions/_shared/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Regular client with user authentication
export const createSupabaseClient = (authToken?: string) => {
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  if (authToken) {
    client.auth.setSession({
      access_token: authToken,
      refresh_token: '',
    });
  }

  return client;
};

// Service role client (bypasses RLS)
export const createServiceSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Extract user from JWT token
export const getUser = async (token: string) => {
  const client = createSupabaseClient(token);
  const { data: { user }, error } = await client.auth.getUser();
  
  if (error || !user) {
    throw new Error('Invalid authentication token');
  }
  
  return user;
};
```

## 🔐 Authentication & Authorization

### JWT Token Validation

```typescript
const validateRequest = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Authorization header required');
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const user = await getUser(token);
    return { user, token };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
```

### Role-Based Access Control

```typescript
const checkPermissions = async (user: User, action: string, resource: string) => {
  // Check user role and permissions
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, permissions')
    .eq('user_id', user.id)
    .single();
    
  if (!hasPermission(userRole, action, resource)) {
    throw new Error('Insufficient permissions');
  }
};
```

### Rate Limiting

```typescript
const rateLimiter = new Map<string, number[]>();

const checkRateLimit = (userId: string, limit = 100, window = 3600000) => {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(time => now - time < window);
  
  if (recentRequests.length >= limit) {
    throw new Error('Rate limit exceeded');
  }
  
  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
};
```

## 🔄 OCR Integration

### Asynchronous Processing

```typescript
const processReceiptOCR = async (receiptId: string, fileUrl: string) => {
  try {
    console.log(`🚀 Starting OCR processing for receipt ${receiptId}`);
    
    // Process with Azure Document Intelligence
    const ocrResult = await azureOCR.processReceipt(fileUrl);
    
    if (ocrResult.success) {
      console.log(`✅ OCR completed for receipt ${receiptId}`);
      
      // Update receipt with OCR results using service role
      const serviceSupabase = createServiceSupabaseClient();
      
      await serviceSupabase
        .from('receipts')
        .update({
          status: 'processed',
          raw_ocr_json: ocrResult.rawData,
          processed_at: new Date().toISOString()
        })
        .eq('id', receiptId);
        
    } else {
      console.error(`❌ OCR failed for receipt ${receiptId}:`, ocrResult.error);
      
      // Update status to indicate failure
      const serviceSupabase = createServiceSupabaseClient();
      await serviceSupabase
        .from('receipts')
        .update({ status: 'failed' })
        .eq('id', receiptId);
    }
  } catch (error) {
    console.error(`💥 OCR processing error for receipt ${receiptId}:`, error);
  }
};

// Trigger OCR processing asynchronously (don't block response)
if (file_url && status === 'uploaded') {
  processReceiptOCR(data.id, file_url).catch(error => {
    console.error(`❌ OCR processing failed for receipt ${data.id}:`, error);
  });
}
```

## 📊 Error Handling

### Standardized Error Responses

```typescript
interface APIError {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

const handleAPIError = (error: unknown, context: string) => {
  console.error(`API Error in ${context}:`, error);
  
  if (error instanceof Error) {
    return createErrorResponse(error.message, 500);
  }
  
  return createErrorResponse('Internal server error', 500);
};
```

### Validation Middleware

```typescript
const validateRequest = (schema: any) => {
  return async (req: Request) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return validated;
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  };
};

// Usage
const createReceiptSchema = z.object({
  file_url: z.string().min(1),
  status: z.enum(['uploaded', 'processing', 'processed']).optional()
});

const validatedData = await validateRequest(createReceiptSchema)(req);
```

## 🚀 Performance Optimization

### Database Query Optimization

```typescript
// Efficient pagination with proper indexing
const getPaginatedReceipts = async (userId: string, page: number, limit: number) => {
  const offset = (page - 1) * limit;
  
  const [dataQuery, countQuery] = await Promise.all([
    supabase
      .from('receipts')
      .select('id, file_url, upload_date, status')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1),
    
    supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
  ]);
  
  return {
    data: dataQuery.data,
    count: countQuery.count
  };
};
```

### Caching Strategy

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();

const getCachedData = (key: string, ttl = 300000) => { // 5 minutes TTL
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  cache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```

### Connection Pooling

```typescript
// Reuse database connections
let dbConnection: any = null;

const getDBConnection = () => {
  if (!dbConnection) {
    dbConnection = createSupabaseClient();
  }
  return dbConnection;
};
```

## 📱 Real-time Features

### WebSocket Integration

```typescript
// Real-time receipt processing updates
const broadcastReceiptUpdate = async (receiptId: string, status: string) => {
  const channel = supabase.channel(`receipt_${receiptId}`);
  
  await channel.send({
    type: 'broadcast',
    event: 'receipt_status_update',
    payload: { receiptId, status, timestamp: new Date().toISOString() }
  });
};
```

### Server-Sent Events

```typescript
const createSSEResponse = (userId: string) => {
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to user-specific events
      const subscription = supabase
        .channel(`user_${userId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'receipts' },
          (payload) => {
            const message = `data: ${JSON.stringify(payload)}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
          }
        )
        .subscribe();
        
      // Cleanup on stream close
      return () => subscription.unsubscribe();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
};
```

## 🔧 Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Azure Document Intelligence
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your_api_key

# API Configuration
API_RATE_LIMIT=100
API_RATE_WINDOW=3600000
CACHE_TTL=300000
```

### Function Deployment

```bash
# Deploy all functions
npx supabase functions deploy

# Deploy specific function
npx supabase functions deploy receipts

# Set environment variables
npx supabase secrets set AZURE_FORM_RECOGNIZER_KEY=your_key
```

## 📊 Monitoring & Logging

### Structured Logging

```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  requestId?: string;
  metadata?: any;
}

const logger = {
  info: (message: string, metadata?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      metadata
    }));
  },
  
  error: (message: string, error?: Error, metadata?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error?.message,
      stack: error?.stack,
      metadata
    }));
  }
};
```

### Performance Metrics

```typescript
const trackAPIMetrics = async (
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) => {
  await supabase
    .from('api_metrics')
    .insert({
      endpoint,
      method,
      duration,
      status_code: statusCode,
      timestamp: new Date().toISOString()
    });
};
```

## 🚀 Future Enhancements

### Planned Features
- **GraphQL API**: More flexible data fetching
- **API Versioning**: Backward compatibility
- **Webhooks**: External integrations
- **Batch Operations**: Bulk data processing

### Performance Improvements
- **Query Optimization**: Advanced indexing strategies
- **CDN Integration**: Static asset optimization
- **Load Balancing**: Horizontal scaling
- **Microservices**: Service decomposition

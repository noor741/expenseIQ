# File Upload & Storage Documentation

## 📁 Overview

ExpenseIQ implements a secure, scalable file upload and storage system using Supabase Storage with private buckets, user-specific organization, and robust security measures.

## 🏗️ Architecture

### Storage Structure
```
Supabase Storage
├── receipts/ (Private Bucket)
│   ├── user_123abc/
│   │   ├── receipt_uuid1.jpg
│   │   ├── receipt_uuid2.jpg
│   │   └── receipt_uuid3.jpg
│   ├── user_456def/
│   │   ├── receipt_uuid4.jpg
│   │   └── receipt_uuid5.jpg
│   └── user_789ghi/
│       └── receipt_uuid6.jpg
```

### Security Model
- **Private Bucket**: No public access by default
- **Row Level Security (RLS)**: User-specific access control
- **Service Role Access**: Backend functions can access all files
- **JWT Authentication**: All requests require valid tokens

## 📱 Client-Side Upload Process

### File Processing Pipeline
```
Image Capture → Format Conversion → Compression → Upload → Verification
```

### Implementation Details

**File**: `app/(tabs)/scan.tsx`

```typescript
const uploadReceipt = async () => {
  if (!photo || !user) {
    Alert.alert('Error', 'No photo to upload or user not authenticated');
    return;
  }

  setIsUploading(true);
  
  try {
    const receiptId = uuid.v4() as string;
    
    // Step 1: Read and validate file
    const fileInfo = await FileSystem.getInfoAsync(photo);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Step 2: Convert to binary data
    const base64Data = await FileSystem.readAsStringAsync(photo, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Step 3: Upload with user-specific path
    const filename = `${user.id}/receipt_${receiptId}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filename, bytes, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Step 4: Create database record
    const result = await apiClient.createReceipt({
      file_url: filename, // Store path, not public URL
      status: 'uploaded'
    });
    
    if (result.success) {
      Alert.alert('Success!', 'Receipt uploaded successfully');
      setPhoto(null);
    }
  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert('Upload Failed', error.message);
  } finally {
    setIsUploading(false);
  }
};
```

## 🔒 Security Implementation

### Row Level Security (RLS) Policies

**Bucket Policy Configuration:**
```sql
-- Users can only access their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Service Role Access

**File**: `supabase/functions/_shared/supabase.ts`

```typescript
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
```

**Usage in OCR Processing:**
```typescript
// Service role bypasses RLS for system operations
const serviceSupabase = createServiceSupabaseClient();

const { data, error } = await serviceSupabase.storage
  .from('receipts')
  .download(fileName);
```

## 🔧 Backend File Access

### Azure OCR Integration

**File**: `supabase/functions/_shared/azureOCR.ts`

```typescript
async processReceipt(imageUrl: string): Promise<OCRResult> {
  try {
    // Handle both URL and file path formats
    let bucketName: string;
    let fileName: string;
    
    if (imageUrl.startsWith('http')) {
      // Full URL format - parse path
      const urlParts = imageUrl.split('/storage/v1/object/');
      let filePath = urlParts[1].replace(/^(public|sign)\//, '');
      const pathParts = filePath.split('/');
      bucketName = pathParts[0];
      fileName = pathParts.slice(1).join('/');
    } else {
      // File path format: "user_id/receipt_id.jpg"
      bucketName = 'receipts';
      fileName = imageUrl;
    }
    
    // Download using service role
    const serviceSupabase = createServiceSupabaseClient();
    const { data, error } = await serviceSupabase.storage
      .from(bucketName)
      .download(fileName);
      
    if (error) {
      throw new Error(`Failed to download: ${JSON.stringify(error)}`);
    }
    
    // Process with Azure OCR
    const imageBuffer = await data.arrayBuffer();
    return await this.analyzeDocument(new Uint8Array(imageBuffer));
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## 📊 File Management

### File Naming Convention
```
Pattern: {user_id}/receipt_{uuid}.{extension}
Example: 123e4567-e89b-12d3-a456-426614174000/receipt_987fcdeb-51a2-43d1-9c4f-123456789abc.jpg
```

### Metadata Storage
```typescript
interface ReceiptRecord {
  id: string;
  user_id: string;
  file_url: string;           // Stores file path, not public URL
  upload_date: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  file_size?: number;
  file_type?: string;
  raw_ocr_json?: object;
  processed_at?: string;
}
```

### File Validation
```typescript
const validateFile = (file: FileInfo) => {
  // Size validation (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)');
  }
  
  // Type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type');
  }
  
  // Dimension validation (for images)
  if (file.width < 100 || file.height < 100) {
    throw new Error('Image resolution too low');
  }
};
```

## 🚀 Performance Optimization

### Image Compression
```typescript
import { ImageManipulator } from 'expo-image-manipulator';

const optimizeImage = async (uri: string) => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { resize: { width: 1200 } }, // Optimal for OCR
    ],
    {
      compress: 0.8,              // Balance quality vs size
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  
  return result.uri;
};
```

### Upload Progress Tracking
```typescript
const [uploadProgress, setUploadProgress] = useState(0);

const uploadWithProgress = async (file: Uint8Array, filename: string) => {
  const chunkSize = 64 * 1024; // 64KB chunks
  const totalChunks = Math.ceil(file.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.length);
    const chunk = file.slice(start, end);
    
    // Upload chunk
    await uploadChunk(chunk, filename, i);
    
    // Update progress
    setUploadProgress((i + 1) / totalChunks * 100);
  }
};
```

### Retry Mechanism
```typescript
const uploadWithRetry = async (
  file: Uint8Array, 
  filename: string, 
  maxRetries = 3
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await supabase.storage
        .from('receipts')
        .upload(filename, file);
        
      if (!result.error) return result;
      
      if (attempt === maxRetries) throw result.error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
      
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
};
```

## 🔄 File Lifecycle Management

### Upload States
```typescript
type UploadStatus = 
  | 'preparing'    // File validation and processing
  | 'uploading'    // Active upload in progress
  | 'processing'   // OCR processing
  | 'completed'    // Successfully processed
  | 'failed'       // Upload or processing failed
  | 'retrying';    // Automatic retry in progress
```

### Cleanup Operations
```typescript
// Clean up failed uploads (run periodically)
const cleanupFailedUploads = async () => {
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  const { data: failedUploads } = await supabase
    .from('receipts')
    .select('file_url')
    .eq('status', 'failed')
    .lt('upload_date', cutoffDate.toISOString());
    
  for (const upload of failedUploads) {
    await supabase.storage
      .from('receipts')
      .remove([upload.file_url]);
  }
};
```

### File Archival
```typescript
// Move old files to archive storage
const archiveOldFiles = async (userId: string, daysOld = 365) => {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const { data: oldFiles } = await supabase
    .from('receipts')
    .select('file_url')
    .eq('user_id', userId)
    .lt('upload_date', cutoffDate.toISOString());
    
  // Move to archive bucket
  for (const file of oldFiles) {
    await moveToArchive(file.file_url);
  }
};
```

## 🎯 Error Handling

### Upload Errors
```typescript
interface UploadError {
  code: string;
  message: string;
  retryable: boolean;
}

const handleUploadError = (error: UploadError) => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      if (error.retryable) {
        return scheduleRetry();
      }
      return showNetworkError();
      
    case 'QUOTA_EXCEEDED':
      return showQuotaError();
      
    case 'INVALID_FILE':
      return showValidationError(error.message);
      
    default:
      return showGenericError();
  }
};
```

### Storage Quota Management
```typescript
const checkStorageQuota = async (userId: string) => {
  const { data: usage } = await supabase
    .rpc('get_user_storage_usage', { user_id: userId });
    
  const quotaLimit = 1024 * 1024 * 1024; // 1GB per user
  
  if (usage.total_bytes > quotaLimit * 0.9) {
    // Warn user at 90% capacity
    showQuotaWarning();
  }
  
  if (usage.total_bytes > quotaLimit) {
    throw new Error('Storage quota exceeded');
  }
};
```

## 📱 User Experience

### Upload Feedback
```typescript
const UploadProgress = ({ progress, status }: UploadProgressProps) => {
  return (
    <View style={styles.progressContainer}>
      <ProgressBar progress={progress} />
      <Text>{getStatusMessage(status)}</Text>
      {status === 'uploading' && (
        <Text>{Math.round(progress * 100)}% uploaded</Text>
      )}
    </View>
  );
};

const getStatusMessage = (status: UploadStatus) => {
  switch (status) {
    case 'preparing': return 'Preparing file...';
    case 'uploading': return 'Uploading receipt...';
    case 'processing': return 'Processing with AI...';
    case 'completed': return 'Upload complete!';
    case 'failed': return 'Upload failed';
    case 'retrying': return 'Retrying upload...';
  }
};
```

### Offline Support
```typescript
import NetInfo from '@react-native-async-storage/async-storage';

const handleOfflineUploads = async () => {
  const isConnected = await NetInfo.fetch();
  
  if (!isConnected.isConnected) {
    // Queue upload for when connection returns
    await queueOfflineUpload(file, filename);
    showOfflineMessage();
    return;
  }
  
  // Process queued uploads
  await processQueuedUploads();
};
```

## 🔧 Configuration

### Environment Variables
```bash
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Storage Bucket Configuration
```javascript
// Supabase Dashboard > Storage > Policies
{
  "bucketName": "receipts",
  "public": false,
  "fileSizeLimit": 10485760,  // 10MB
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png", 
    "image/heic"
  ]
}
```

## 📊 Monitoring & Analytics

### Upload Metrics
- Success/failure rates
- Average upload times
- File size distributions
- Error frequency by type

### Performance Monitoring
```typescript
const trackUploadMetrics = async (
  uploadTime: number,
  fileSize: number,
  success: boolean
) => {
  await analytics.track('file_upload', {
    duration: uploadTime,
    size: fileSize,
    success,
    timestamp: new Date().toISOString()
  });
};
```

## 🚀 Future Enhancements

### Planned Features
- **Multi-file upload**: Batch processing
- **Background sync**: Upload when app is backgrounded
- **Smart compression**: AI-optimized compression
- **CDN integration**: Global file distribution

### Security Improvements
- **End-to-end encryption**: Client-side encryption
- **Digital signatures**: File integrity verification
- **Audit logging**: Comprehensive access logs
- **Compliance features**: GDPR/CCPA support

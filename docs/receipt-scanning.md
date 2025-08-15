# Receipt Scanning & OCR Documentation

## 📸 Overview

ExpenseIQ features advanced receipt scanning capabilities using device cameras and AI-powered Optical Character Recognition (OCR) through Azure Document Intelligence to extract structured data from receipt images.

## 📁 File Structure

```
app/(tabs)/
└── scan.tsx                    # Main scanning interface
supabase/functions/
├── receipts/
│   └── index.ts               # Receipt API with OCR integration
└── _shared/
    └── azureOCR.ts            # Azure Document Intelligence service
```

## 🏗️ Architecture

### Scan Screen Component

**File**: `app/(tabs)/scan.tsx`

The main interface for receipt scanning, providing camera integration and image capture functionality.

**Key Features:**
- Camera permission management
- Real-time camera preview
- Photo capture with quality settings
- Image gallery selection
- Upload progress tracking

### Azure OCR Service

**File**: `supabase/functions/_shared/azureOCR.ts`

Service class that handles communication with Azure Document Intelligence for receipt data extraction.

```typescript
interface OCRResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  confidence?: number;
  rawData?: any;
}

interface ReceiptData {
  merchantName?: string;
  merchantPhoneNumber?: string;
  merchantAddress?: string;
  transactionDate?: string;
  transactionTime?: string;
  receiptType?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  items?: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    category?: string;
  }>;
}
```

## 📱 Scanning Process Flow

### 1. Camera Initialization
```
App Launch → Permission Check → Camera Setup
│
├── Permission Granted → Display camera preview
└── Permission Denied → Show permission request
```

### 2. Image Capture
```
User taps capture → Take photo → Preview image
│
├── Accept → Upload to storage
└── Retake → Return to camera
```

### 3. OCR Processing
```
Image uploaded → Trigger OCR → Azure Document Intelligence
│
├── Success → Extract data → Update database
└── Error → Log error → Retry mechanism
```

## 🎯 Camera Integration

### Permission Handling
```typescript
const [permission, requestPermission] = useCameraPermissions();

if (!permission) {
  return <LoadingView />;
}

if (!permission.granted) {
  return (
    <PermissionView onRequestPermission={requestPermission} />
  );
}
```

### Camera Configuration
```typescript
const cameraRef = useRef<CameraView>(null);

const takePicture = async () => {
  if (cameraRef.current) {
    const result = await cameraRef.current.takePictureAsync({
      quality: 0.8,        // Optimize for OCR accuracy vs file size
      base64: false,       // Use URI for better performance
      skipProcessing: false // Enable built-in processing
    });
    
    setPhoto(result.uri);
  }
};
```

### Camera Features
- **Quality Settings**: Optimized for OCR accuracy
- **Focus Control**: Automatic focus for text clarity
- **Flash Support**: Better image quality in low light
- **Orientation Handling**: Proper image rotation

## 🤖 Azure Document Intelligence Integration

### Service Initialization
```typescript
export class AzureDocumentIntelligence {
  private client: DocumentAnalysisClient;

  constructor() {
    const endpoint = Deno.env.get('AZURE_FORM_RECOGNIZER_ENDPOINT');
    const apiKey = Deno.env.get('AZURE_FORM_RECOGNIZER_KEY');
    
    const credential = new AzureKeyCredential(apiKey);
    this.client = new DocumentAnalysisClient(endpoint, credential);
  }
}
```

### OCR Processing
```typescript
async processReceipt(imageUrl: string): Promise<OCRResult> {
  try {
    // Download image from private storage
    const imageBuffer = await this.downloadImage(imageUrl);
    
    // Process with Azure prebuilt receipt model
    const poller = await this.client.beginAnalyzeDocument(
      "prebuilt-receipt", 
      new Uint8Array(imageBuffer)
    );
    
    const result = await poller.pollUntilDone();
    
    // Extract structured data
    return this.extractReceiptData(result);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Data Extraction
The OCR service extracts various receipt fields with confidence scores:

- **Merchant Information**: Name, phone, address
- **Transaction Details**: Date, time, receipt type
- **Financial Data**: Subtotal, tax, tip, total
- **Line Items**: Product names, quantities, prices

## 🗂️ File Upload & Storage

### Image Processing
```typescript
const uploadReceipt = async () => {
  // Convert image to binary data
  const base64Data = await FileSystem.readAsStringAsync(photo, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Upload to user-specific folder
  const filename = `${user.id}/receipt_${receiptId}.jpg`;
  const { error } = await supabase.storage
    .from('receipts')
    .upload(filename, bytes, {
      contentType: 'image/jpeg',
      upsert: false
    });
};
```

### Storage Organization
```
receipts/
├── user_123abc/
│   ├── receipt_001.jpg
│   ├── receipt_002.jpg
│   └── receipt_003.jpg
├── user_456def/
│   ├── receipt_004.jpg
│   └── receipt_005.jpg
```

## 🔍 OCR Accuracy Optimization

### Image Quality Guidelines
- **Resolution**: Minimum 800x600 pixels
- **Format**: JPEG with high quality settings
- **Lighting**: Even lighting without shadows
- **Angle**: Straight-on view, minimal skew
- **Focus**: Sharp text, no motion blur

### Pre-processing
- Automatic image rotation
- Contrast enhancement
- Noise reduction
- Text region detection

### Confidence Scoring
```typescript
interface FieldExtraction {
  value: string;
  confidence: number;
  boundingBox?: number[];
}

// Only accept high-confidence extractions
const isHighConfidence = (field: FieldExtraction) => {
  return field.confidence >= 0.8;
};
```

## 📊 Performance Optimization

### Image Compression
```typescript
const optimizeImage = async (uri: string) => {
  return await ImageManipulator.manipulateAsync(
    uri,
    [
      { resize: { width: 1200 } }, // Optimal for OCR
    ],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
};
```

### Async Processing
- OCR processing runs asynchronously
- User can continue using app during processing
- Real-time status updates
- Background retry on failures

### Caching Strategy
- Cache processed results
- Avoid re-processing same images
- Intelligent cache invalidation
- Offline capability

## 🎨 User Interface

### Scanning Screen Features
- **Live Camera Preview**: Real-time viewfinder
- **Capture Button**: Large, accessible button
- **Gallery Access**: Quick photo selection
- **Preview Mode**: Review before upload
- **Progress Indicators**: Upload and processing status

### Visual Feedback
- Capture animation effects
- Loading spinners during upload
- Success/error notifications
- Processing status indicators

### Accessibility
- Voice commands for capture
- Screen reader support
- High contrast mode
- Large text compatibility

## 🔧 Configuration

### Environment Variables
```bash
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your_api_key
```

### Azure Setup
1. Create Cognitive Services resource
2. Enable Document Intelligence
3. Configure receipt recognition model
4. Set up proper access policies

### Performance Tuning
```typescript
// OCR timeout settings
const OCR_TIMEOUT = 30000; // 30 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
```

## 🐛 Error Handling

### Common OCR Issues
- **Poor Image Quality**: Guidance for better photos
- **Unsupported Format**: Format conversion
- **Network Errors**: Retry mechanisms
- **Processing Timeout**: Alternative approaches

### User Guidance
- Real-time photo quality feedback
- Helpful tips for better scanning
- Alternative input methods
- Manual data entry fallback

## 🔄 Integration Points

### Database Updates
```typescript
// After successful OCR
const updateReceipt = async (receiptId: string, ocrData: ReceiptData) => {
  await supabase
    .from('receipts')
    .update({
      status: 'processed',
      raw_ocr_json: ocrData,
      processed_at: new Date().toISOString()
    })
    .eq('id', receiptId);
};
```

### API Communication
- RESTful endpoints for receipt management
- WebSocket for real-time updates
- Error handling and retry logic
- Rate limiting and throttling

## 📈 Analytics & Monitoring

### OCR Metrics
- Processing success rates
- Average confidence scores
- Processing time analytics
- Error frequency tracking

### User Behavior
- Scan frequency patterns
- Photo quality metrics
- Feature usage statistics
- User satisfaction scores

## 🚀 Future Enhancements

### Planned Features
- Batch receipt processing
- Real-time OCR preview
- Enhanced field validation
- Custom merchant databases

### AI Improvements
- Machine learning model training
- Custom receipt templates
- Improved accuracy algorithms
- Multi-language support

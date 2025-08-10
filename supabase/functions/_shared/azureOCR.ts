import { AzureKeyCredential, DocumentAnalysisClient } from "npm:@azure/ai-form-recognizer@4.0.0";
import { createServiceSupabaseClient } from './supabase.ts';

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
    description?: string;
    quantity?: number;
    price?: number;
    totalPrice?: number;
  }>;
}

interface OCRResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  confidence?: number;
  rawData?: any;
}

export class AzureDocumentIntelligence {
  private client: DocumentAnalysisClient | null = null;

  constructor() {
    const endpoint = Deno.env.get('AZURE_FORM_RECOGNIZER_ENDPOINT');
    const apiKey = Deno.env.get('AZURE_FORM_RECOGNIZER_KEY');

    if (!endpoint || !apiKey) {
      throw new Error('Azure Form Recognizer credentials not configured');
    }

    try {
      const credential = new AzureKeyCredential(apiKey);
      this.client = new DocumentAnalysisClient(endpoint, credential);
      console.log('🔷 Azure Document Intelligence initialized for REAL OCR processing');
    } catch (error) {
      console.error('❌ Failed to initialize Azure client:', error);
      throw error;
    }
  }

  /**
   * Process receipt image and extract structured data
   */
  async processReceipt(imageUrl: string): Promise<OCRResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Azure Document Intelligence client not initialized'
      };
    }
    try {
      console.log(`🔍 Starting OCR processing for: ${imageUrl}`);
      
      // Check if this is a Supabase Storage URL or file path
      if (imageUrl.includes('supabase.co/storage/v1/object/') || !imageUrl.startsWith('http')) {
        console.log('📁 Processing Supabase Storage file...');
        
        try {
          // Use service role client to access private storage
          const serviceSupabase = createServiceSupabaseClient();
          
          let bucketName: string;
          let fileName: string;
          
          if (imageUrl.startsWith('http')) {
            // Full URL format - extract file path
            const urlParts = imageUrl.split('/storage/v1/object/');
            if (urlParts.length < 2) {
              throw new Error(`Invalid Supabase storage URL format: ${imageUrl}`);
            }
            
            let filePath = urlParts[1];
            // Remove 'public/' or 'sign/' prefix if present
            filePath = filePath.replace(/^(public|sign)\//, '');
            
            // Extract bucket name and file path
            const pathParts = filePath.split('/');
            if (pathParts.length < 2) {
              throw new Error(`Invalid file path structure: ${filePath}`);
            }
            
            bucketName = pathParts[0];
            fileName = pathParts.slice(1).join('/');
          } else {
            // File path format: "user_id/receipt_id.jpg"
            const pathParts = imageUrl.split('/');
            if (pathParts.length < 2) {
              throw new Error(`Invalid file path structure: ${imageUrl}`);
            }
            
            bucketName = 'receipts'; // Default bucket name
            fileName = imageUrl;
          }
          
          console.log(`📥 Downloading: ${fileName} from ${bucketName}`);
          
          // Download the file using service role client
          const { data, error } = await serviceSupabase.storage
            .from(bucketName)
            .download(fileName);
            
          if (error) {
            console.error('💥 Storage download error:', error);
            throw new Error(`Failed to download from private storage: ${JSON.stringify(error)}`);
          }
          
          if (!data) {
            throw new Error('No data received from storage download');
          }
          
          // Convert blob to array buffer
          const imageBuffer = await data.arrayBuffer();
          console.log(`✅ Downloaded file: ${imageBuffer.byteLength} bytes`);
          
          // Use the prebuilt receipt model with binary data
          const poller = await this.client.beginAnalyzeDocument(
            "prebuilt-receipt", 
            new Uint8Array(imageBuffer)
          );
          
          const result = await poller.pollUntilDone();
          
          if (!result.documents || result.documents.length === 0) {
            return {
              success: false,
              error: 'No receipt data found in image'
            };
          }

          const receipt = result.documents[0];
          const fields = receipt.fields;

          // Extract receipt data with confidence checking
          const extractedData: ReceiptData = {
            merchantName: this.extractField(fields?.MerchantName),
            merchantPhoneNumber: this.extractField(fields?.MerchantPhoneNumber),
            merchantAddress: this.extractField(fields?.MerchantAddress),
            transactionDate: this.extractField(fields?.TransactionDate),
            transactionTime: this.extractField(fields?.TransactionTime),
            receiptType: this.extractField(fields?.ReceiptType),
            subtotal: this.extractNumberField(fields?.Subtotal),
            tax: this.extractNumberField(fields?.TotalTax),
            tip: this.extractNumberField(fields?.Tip),
            total: this.extractNumberField(fields?.Total),
            items: this.extractItems(fields?.Items)
          };

          // Calculate overall confidence score
          const confidence = receipt.confidence || 0;
          
          console.log('✅ OCR Processing completed successfully');
          console.log(`🎯 Confidence: ${(confidence * 100).toFixed(1)}%`);

          return {
            success: true,
            data: extractedData,
            confidence,
            rawData: result
          };
          
        } catch (downloadError) {
          console.error('❌ Failed to download/process Supabase image:', downloadError);
          return {
            success: false,
            error: `Failed to process image: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`
          };
        }
      }
      
      // Use the prebuilt receipt model for external URLs
      const poller = await this.client.beginAnalyzeDocumentFromUrl(
        "prebuilt-receipt", 
        imageUrl
      );
      
      const result = await poller.pollUntilDone();
      
      if (!result.documents || result.documents.length === 0) {
        return {
          success: false,
          error: 'No receipt data found in image'
        };
      }

      const receipt = result.documents[0];
      const fields = receipt.fields;

      // Extract receipt data with confidence checking
      const extractedData: ReceiptData = {
        merchantName: this.extractField(fields?.MerchantName),
        merchantPhoneNumber: this.extractField(fields?.MerchantPhoneNumber),
        merchantAddress: this.extractField(fields?.MerchantAddress),
        transactionDate: this.extractField(fields?.TransactionDate),
        transactionTime: this.extractField(fields?.TransactionTime),
        receiptType: this.extractField(fields?.ReceiptType),
        subtotal: this.extractNumberField(fields?.Subtotal),
        tax: this.extractNumberField(fields?.TotalTax),
        tip: this.extractNumberField(fields?.Tip),
        total: this.extractNumberField(fields?.Total),
        items: this.extractItems(fields?.Items)
      };

      // Calculate overall confidence score
      const confidence = receipt.confidence || 0;
      
      console.log('✅ OCR Processing completed successfully');
      console.log('📊 Extracted Data:', JSON.stringify(extractedData, null, 2));
      console.log(`🎯 Confidence Score: ${(confidence * 100).toFixed(1)}%`);

      return {
        success: true,
        data: extractedData,
        confidence,
        rawData: result
      };

    } catch (error) {
      console.error('❌ OCR Processing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OCR error'
      };
    }
  }

  /**
   * Extract field value with confidence checking
   */
  private extractField(field: any): string | undefined {
    if (!field || !field.value) return undefined;
    
    // Only return values with reasonable confidence (>0.5)
    if (field.confidence && field.confidence < 0.5) {
      console.log(`⚠️ Low confidence field (${field.confidence}): ${field.value}`);
    }
    
    return field.value;
  }

  /**
   * Extract number field and convert to number
   */
  private extractNumberField(field: any): number | undefined {
    const value = this.extractField(field);
    if (!value) return undefined;
    
    const number = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(number) ? undefined : number;
  }

  /**
   * Extract items array from receipt
   */
  private extractItems(itemsField: any): Array<{
    description?: string;
    quantity?: number;
    price?: number;
    totalPrice?: number;
  }> | undefined {
    if (!itemsField || !itemsField.values) return undefined;

    return itemsField.values.map((item: any) => {
      const itemFields = item.properties;
      return {
        description: this.extractField(itemFields?.Description),
        quantity: this.extractNumberField(itemFields?.Quantity),
        price: this.extractNumberField(itemFields?.Price),
        totalPrice: this.extractNumberField(itemFields?.TotalPrice)
      };
    }).filter((item: any) => item.description); // Only include items with descriptions
  }
}

// Export instance for use in Edge Functions
export const azureOCR = new AzureDocumentIntelligence();

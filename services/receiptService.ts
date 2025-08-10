import { supabase } from '@/lib/supabase';
import { Receipt, UploadResult } from '@/types/database';
import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';

export class ReceiptService {
  
  /**
   * Ensure user record exists in the users table
   */
  static async ensureUserExists(userId: string): Promise<void> {
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload an image file to Supabase storage and create a receipt record
   */
  static async uploadReceipt(
    imageUri: string, 
    userId: string,
    source: 'camera' | 'gallery' = 'camera'
  ): Promise<UploadResult> {
    try {
      const receiptId = uuid.v4() as string;
      
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const uriParts = imageUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1] || 'jpg';
      const fileName = `${receiptId}.${fileExtension}`;
      const storagePath = `${userId}/${fileName}`;

      // Read file as ArrayBuffer which works better with Supabase
      const fileData = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer for proper upload
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, bytes, {
          contentType: `image/${fileExtension}`,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      await ReceiptService.ensureUserExists(userId);

      const { data: receiptData, error: dbError } = await supabase
        .from('receipts')
        .insert({
          id: receiptId,
          user_id: userId,
          file_url: storagePath,
          upload_date: new Date().toISOString(),
          status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from('receipts').remove([storagePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      return {
        success: true,
        receiptId: receiptId,
        filePath: storagePath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a signed URL for viewing a receipt
   */
  static async getReceiptUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

      if (error) {
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all receipts for a user
   */
  static async getUserReceipts(userId: string): Promise<Receipt[]> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('upload_date', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Update receipt processing status
   */
  static async updateReceiptStatus(
    receiptId: string, 
    status: string, 
    ocrData?: any
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        processed_at: new Date().toISOString()
      };

      if (ocrData) {
        updateData.raw_ocr_json = ocrData;
      }

      const { error } = await supabase
        .from('receipts')
        .update(updateData)
        .eq('id', receiptId);

      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a receipt and its associated file
   */
  static async deleteReceipt(receiptId: string, userId: string): Promise<boolean> {
    try {
      const { data: receipt, error: fetchError } = await supabase
        .from('receipts')
        .select('file_url')
        .eq('id', receiptId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !receipt) {
        return false;
      }

      await supabase.storage
        .from('receipts')
        .remove([receipt.file_url]);

      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .eq('user_id', userId);

      return !dbError;
    } catch (error) {
      return false;
    }
  }
}

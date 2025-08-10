# Azure Document Intelligence Setup & Testing Guide

## 🚀 Step 1: Create Azure Document Intelligence Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "Document Intelligence" resource
3. Get your **Endpoint** and **API Key**

## 🔧 Step 2: Update Supabase Secrets

Replace the placeholder values with your real Azure credentials:

```powershell
# Replace with your actual endpoint
npx supabase secrets set AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-actual-resource-name.cognitiveservices.azure.com/

# Replace with your actual API key  
npx supabase secrets set AZURE_FORM_RECOGNIZER_KEY=your-actual-api-key-here
```

## 🧪 Step 3: Test OCR Processing

### Option 1: Test with Public Receipt Image
```powershell
$headers = @{ 
  'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcnF0aXppeGNvenRlcm90ZGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTUwNjksImV4cCI6MjA2OTU3MTA2OX0.n-xhkEJlncJ_ahW8hZqZPVEH5I6lgbQe2zbv4UFfrNY'
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcnF0aXppeGNvenRlcm90ZGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTUwNjksImV4cCI6MjA2OTU3MTA2OX0.n-xhkEJlncJ_ahW8hZqZPVEH5I6lgbQe2zbv4UFfrNY'
  'Content-Type' = 'application/json'
}

$body = @{
  imageUrl = "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-REST-api-samples/master/curl/form-recognizer/receipt-english.png"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://aarqtizixcozterotdgx.supabase.co/functions/v1/ocr-test' -Method POST -Headers $headers -Body $body
```

### Option 2: Test with Your App
Just upload a receipt through your app - OCR will automatically run and log results!

## 📊 What You'll See

The OCR will extract:
- **Merchant Information** (name, phone, address)
- **Transaction Details** (date, time, total, tax, tip)
- **Line Items** (descriptions, quantities, prices)
- **Confidence Scores** for each field

## 🔍 Check Logs

View the OCR extraction results in your Supabase Functions logs:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on "receipts" or "ocr-test" function
4. View the logs tab

## 📋 Example Output

```
🔍 Starting OCR processing for: https://example.com/receipt.jpg
✅ OCR Processing completed successfully
📊 Extracted Data: {
  "merchantName": "Contoso Coffee",
  "total": 14.50,
  "transactionDate": "2024-01-15",
  "items": [
    {
      "description": "Large Coffee",
      "price": 4.50,
      "quantity": 1
    }
  ]
}
🎯 Confidence Score: 89.2%
```

## 🎯 Next Steps

Once OCR is working:
1. ✅ **Testing** - Verify extraction accuracy
2. 🗄️ **Database Storage** - Store extracted data in structured tables
3. 📱 **UI Integration** - Show extracted data in app
4. 🤖 **Automated Processing** - Auto-create expenses from receipts

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");

const endpoint = process.env.AZURE_OCR_ENDPOINT;
const apiKey = process.env.AZURE_OCR_API_KEY;

const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

async function analyzeReceipt() {
  const filePath = path.join(__dirname, "sample-receipt.jpg"); // make sure the image is here
  const receiptImage = fs.readFileSync(filePath);

  const poller = await client.beginAnalyzeDocument("prebuilt-receipt", receiptImage, {
    contentType: "image/jpeg",
  });

  const result = await poller.pollUntilDone();

  console.log("---- Extracted Fields ----");

  for (const doc of result.documents || []) {
    console.log("Vendor:", doc.fields.MerchantName?.value || "N/A");
    console.log("Date:", doc.fields.TransactionDate?.value || "N/A");
    console.log("Total:", doc.fields.Total?.value || "N/A");
    console.log("Tax:", doc.fields.Tax?.value || "N/A");
  }
}

analyzeReceipt().catch(console.error);
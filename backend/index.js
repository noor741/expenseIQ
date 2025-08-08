require('dotenv').config({ path: __dirname + '/.env' });
console.log("KEY:", process.env.AZURE_OCR_API_KEY); // debug line

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");

require("dotenv").config();

const app = express();
app.use(cors());

const endpoint = process.env.AZURE_OCR_ENDPOINT;
const apiKey = process.env.AZURE_OCR_API_KEY;
const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

app.get("/api/receipt-ocr", async (req, res) => {
  try {
    const filePath = path.join(__dirname, "sample-receipt.jpg");
    const receiptImage = fs.readFileSync(filePath);

    const poller = await client.beginAnalyzeDocument("prebuilt-receipt", receiptImage, {
      contentType: "image/jpeg",
    });

    const result = await poller.pollUntilDone();
    const doc = result.documents?.[0]?.fields;

    res.json({
      vendor: doc?.MerchantName?.value || "N/A",
      date: doc?.TransactionDate?.value || "N/A",
      total: doc?.Total?.value || "N/A",
      tax: doc?.Tax?.value || "N/A",
    });
  } catch (error) {
    console.error("OCR error:", error);
    res.status(500).json({ error: "Failed to analyze receipt" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



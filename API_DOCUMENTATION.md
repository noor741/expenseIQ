# ExpenseIQ API Documentation

## Overview

ExpenseIQ provides RESTful API endpoints via Supabase Edge Functions for all database operations. All endpoints require authentication via JWT token.

## Base URL
```
https://your-project-ref.supabase.co/functions/v1
```

## Authentication
All requests must include an Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 📄 Receipts API (`/receipts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/receipts` | Get all receipts with pagination |
| GET | `/receipts/{id}` | Get single receipt by ID |
| POST | `/receipts` | Create new receipt record |
| PUT | `/receipts/{id}` | Update receipt status/OCR data |
| DELETE | `/receipts/{id}` | Delete receipt and file |

**Query Parameters for GET /receipts:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status ('uploaded', 'processing', 'processed', 'failed')

### 💰 Expenses API (`/expenses`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses` | Get all expenses with filtering |
| GET | `/expenses/{id}` | Get single expense with items |
| POST | `/expenses` | Create new expense with items |
| PUT | `/expenses/{id}` | Update expense details |
| DELETE | `/expenses/{id}` | Delete expense and items |

**Query Parameters for GET /expenses:**
- `page`, `limit`: Pagination
- `category_id`: Filter by category
- `start_date`, `end_date`: Date range (YYYY-MM-DD)
- `merchant_name`: Search merchant name

### 🏷️ Categories API (`/categories`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | Get all categories |
| GET | `/categories/{id}` | Get single category |
| POST | `/categories` | Create new category |
| PUT | `/categories/{id}` | Update category |
| DELETE | `/categories/{id}` | Delete category |

### 👤 Users API (`/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get user dashboard stats |
| GET | `/users/profile` | Get current user profile |
| POST | `/users` | Create/ensure user record |
| PUT | `/users` | Update user profile |
| DELETE | `/users` | Delete user account |

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "receipts": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## Example Usage

### Using the API Client

```typescript
import { apiClient } from '@/services/apiClient';

// Get receipts
const receipts = await apiClient.getReceipts({ page: 1, limit: 10 });

// Create expense
const expense = await apiClient.createExpense({
  receipt_id: 'receipt-uuid',
  merchant_name: 'Coffee Shop',
  transaction_date: '2025-08-08',
  total: 5.99,
  items: [
    {
      item_name: 'Coffee',
      quantity: 1,
      total_price: 5.99
    }
  ]
});

// Get user stats
const stats = await apiClient.getUserStats();
```

### Direct API Calls

```typescript
// Get receipts
const response = await fetch('/functions/v1/receipts?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create receipt
const receipt = await fetch('/functions/v1/receipts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    file_url: 'user-id/receipt.jpg',
    status: 'uploaded'
  })
});
```

## Deployment

Deploy all functions using the PowerShell script:

```powershell
.\deploy-functions.ps1
```

Or deploy individually:

```bash
supabase functions deploy receipts --no-verify-jwt
supabase functions deploy expenses --no-verify-jwt
supabase functions deploy categories --no-verify-jwt
supabase functions deploy users --no-verify-jwt
```

## Security

- All endpoints require authentication
- Users can only access their own data (RLS enforced)
- File operations include proper user validation
- Input validation on all endpoints

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 405 | Method Not Allowed |
| 500 | Internal Server Error |

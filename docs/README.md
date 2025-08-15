# ExpenseIQ Developer Documentation

Welcome to the ExpenseIQ developer documentation. This comprehensive guide will help you understand the architecture, features, and implementation details of our AI-powered expense tracking application.

## 📋 Table of Contents

- [Authentication System](./authentication.md) - User login, registration, and session management
- [Receipt Scanning & OCR](./receipt-scanning.md) - Camera integration and AI-powered data extraction
- [File Upload & Storage](./file-upload.md) - Secure file handling and private storage
- [API Architecture](./api-architecture.md) - Edge Functions and backend services
- [Database Schema](./database-schema.md) - Data models and relationships
- [Security & Permissions](./security.md) - RLS, authentication, and data protection

## 🏗️ Architecture Overview

ExpenseIQ is built using a modern, scalable architecture:

- **Frontend**: React Native with Expo
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage with private buckets
- **AI/ML**: Azure Document Intelligence for OCR
- **Authentication**: Supabase Auth with JWT tokens

## 🚀 Quick Start

1. **Prerequisites**
   - Node.js 18+
   - Expo CLI
   - Supabase CLI
   - Azure Document Intelligence account

2. **Environment Setup**
   ```bash
   npm install
   cp .env.example .env.local
   # Configure your environment variables
   ```

3. **Development**
   ```bash
   npm start                    # Start Expo development server
   npx supabase start          # Start local Supabase
   npx supabase functions serve # Serve Edge Functions locally
   ```

## 📱 Core Features

### 🔐 Authentication
- Email/password login and registration
- JWT-based session management
- Secure password reset flow
- Protected routes and API endpoints

### 📸 Receipt Scanning
- Camera integration with permission handling
- Photo capture and gallery selection
- Real-time image preview and editing
- AI-powered data extraction

### 🤖 OCR Processing
- Azure Document Intelligence integration
- Automatic merchant, date, and total extraction
- Confidence scoring and validation
- Structured data output

### 💾 Data Management
- User-specific file organization
- Private storage with RLS protection
- Automatic database updates

## 📁 Documentation Structure

This documentation is organized into the following sections:

1. **[Authentication System](./authentication.md)** - Complete user authentication and session management
2. **[Receipt Scanning & OCR](./receipt-scanning.md)** - Camera integration and Azure Document Intelligence
3. **[File Upload & Storage](./file-upload.md)** - Secure file handling and storage policies
4. **[API Architecture](./api-architecture.md)** - Supabase Edge Functions and API endpoints
5. **[Database Schema](./database-schema.md)** - Database structure and Row Level Security
6. **[Security & Permissions](./security.md)** - Comprehensive security implementation and best practices
7. **[Testing & QA](./testing.md)** - Complete testing strategy and quality assurance
8. **[Automatic Expense Creation](./automatic-expense-creation.md)** - OCR data extraction to structured expenses
- Error handling and retry logic

## 🛠️ Development Guidelines

### Code Style
- TypeScript for type safety
- ESLint configuration for code quality
- Consistent naming conventions
- Comprehensive error handling

### Testing
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- OCR accuracy validation

### Deployment
- Staging and production environments
- Automated CI/CD pipeline
- Environment-specific configurations
- Monitoring and logging

## 📊 Performance Considerations

- Optimized image compression for uploads
- Efficient database queries with proper indexing
- Caching strategies for frequently accessed data
- Background processing for OCR tasks

## 🔧 Troubleshooting

Common issues and solutions are documented in each feature-specific guide. For additional support:

1. Check the [Issues](../README.md#issues) section
2. Review the logs in Supabase Dashboard
3. Validate environment configuration
4. Test with sample data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

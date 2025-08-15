# Testing & Quality Assurance Documentation

## 🧪 Overview

ExpenseIQ employs a comprehensive testing strategy that includes unit tests, integration tests, end-to-end tests, and automated quality assurance to ensure reliability, performance, and user satisfaction across all application features.

## 📋 Testing Strategy

### Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← Few, High-level
                    │   (Detox)       │
                ┌───┴─────────────────┴───┐
                │  Integration Tests      │  ← Some, API & Component
                │  (Jest + Testing Lib)   │
            ┌───┴─────────────────────────┴───┐
            │        Unit Tests               │  ← Many, Fast
            │   (Jest + React Native)         │
        ┌───┴─────────────────────────────────┴───┐
        │          Static Analysis                │  ← Automated
        │      (ESLint + TypeScript)              │
    └─────────────────────────────────────────────┘
```

### Testing Environments

- **Development**: Local testing with mock services
- **Staging**: Integration testing with real services
- **Production**: Monitoring and health checks

## 🔬 Unit Testing

### Test Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'context/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1'
  }
};
```

**File**: `jest.setup.js`

```javascript
import 'react-native-gesture-handler/jestSetup';
import { jest } from '@jest/globals';

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    getCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' }))
  }
}));

jest.mock('expo-file-system', () => ({
  FileSystem: {
    writeAsStringAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    deleteAsync: jest.fn(),
    makeDirectoryAsync: jest.fn()
  }
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        list: jest.fn()
      }))
    }
  }))
}));

// Global test utilities
global.mockAsyncStorage = () => {
  const storage = {};
  return {
    getItem: jest.fn(key => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn(key => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    })
  };
};
```

### Authentication Tests

**File**: `context/__tests__/AuthContext.test.tsx`

```typescript
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../supabase';

// Mock supabase
jest.mock('../supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test component
const TestComponent = () => {
  const { user, signIn, signOut, loading } = useAuth();
  return null; // Component for testing hooks
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'password');
        expect(response.error).toBeNull();
        expect(response.data?.user).toEqual(mockUser);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });

    it('should handle sign in errors', async () => {
      const mockError = { message: 'Invalid credentials' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'wrong');
        expect(response.error).toEqual(mockError);
        expect(response.data).toBeNull();
      });
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await act(async () => {
        const response = await result.current.signIn('invalid-email', 'password');
        expect(response.error?.message).toContain('Invalid email format');
      });

      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('session management', () => {
    it('should restore session on app start', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      });
    });
  });
});
```

### Component Tests

**File**: `components/__tests__/expenseUI/button.test.tsx`

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../expenseUI/button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Test Button" onPress={() => {}} loading={true} />
    );
    
    expect(getByTestId('button-loading')).toBeTruthy();
    expect(queryByText('Test Button')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const mockPress = jest.fn();
    const { getByTestId } = render(
      <Button title="Test Button" onPress={mockPress} disabled={true} />
    );
    
    const button = getByTestId('button');
    fireEvent.press(button);
    expect(mockPress).not.toHaveBeenCalled();
  });

  it('applies variant styles correctly', () => {
    const { getByTestId } = render(
      <Button title="Test" onPress={() => {}} variant="secondary" />
    );
    
    const button = getByTestId('button');
    expect(button.props.style).toMatchObject({
      backgroundColor: expect.any(String)
    });
  });
});
```

### API Tests

**File**: `hooks/__tests__/useExpenses.test.tsx`

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useExpenses } from '../useExpenses';
import { supabase } from '../supabase';

jest.mock('../supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useExpenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches expenses on mount', async () => {
    const mockExpenses = [
      { id: '1', amount: 50.00, description: 'Lunch' },
      { id: '2', amount: 120.00, description: 'Gas' }
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockExpenses,
        error: null
      })
    } as any);

    const { result } = renderHook(() => useExpenses());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.expenses).toEqual(mockExpenses);
    expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
  });

  it('handles fetch errors gracefully', async () => {
    const mockError = { message: 'Database error' };
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      })
    } as any);

    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.expenses).toEqual([]);
  });

  it('adds expense optimistically', async () => {
    const newExpense = { amount: 75.00, description: 'Dinner', category: 'Food' };
    
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [{ id: '3', ...newExpense }],
        error: null
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    } as any);

    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.addExpense(newExpense);
    });

    expect(result.current.expenses).toContainEqual(
      expect.objectContaining(newExpense)
    );
  });
});
```

## 🔗 Integration Testing

### API Integration Tests

**File**: `__tests__/integration/receipts.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from '../../lib/supabase';

describe('Receipts API Integration', () => {
  let testUser: any;
  let testReceipt: any;

  beforeAll(async () => {
    // Create test user
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@receipts.test',
      password: 'test123456'
    });
    testUser = authData.user;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testReceipt) {
      await supabase.from('receipts').delete().eq('id', testReceipt.id);
    }
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
    }
  });

  it('should create receipt via API', async () => {
    const receiptData = {
      file_url: 'test-user/test-receipt.jpg',
      status: 'uploaded'
    };

    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUser.access_token}`
      },
      body: JSON.stringify(receiptData)
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    
    expect(result.receipt).toMatchObject({
      file_url: receiptData.file_url,
      status: receiptData.status,
      user_id: testUser.id
    });

    testReceipt = result.receipt;
  });

  it('should process OCR for uploaded receipt', async () => {
    // Wait for OCR processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', testReceipt.id)
      .single();

    expect(receipt.status).toBe('processed');
    expect(receipt.raw_ocr_json).toBeDefined();
    expect(receipt.processed_at).toBeDefined();
  });

  it('should fetch user receipts', async () => {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/receipts`, {
      headers: {
        'Authorization': `Bearer ${testUser.access_token}`
      }
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    
    expect(Array.isArray(result.receipts)).toBe(true);
    expect(result.receipts.length).toBeGreaterThan(0);
    expect(result.receipts[0]).toMatchObject({
      id: expect.any(String),
      user_id: testUser.id
    });
  });
});
```

### Database Integration Tests

**File**: `__tests__/integration/database.test.ts`

```typescript
describe('Database RLS Integration', () => {
  let user1: any, user2: any;

  beforeAll(async () => {
    // Create two test users
    const [auth1, auth2] = await Promise.all([
      supabase.auth.signUp({
        email: 'user1@test.com',
        password: 'test123456'
      }),
      supabase.auth.signUp({
        email: 'user2@test.com', 
        password: 'test123456'
      })
    ]);
    
    user1 = auth1.data.user;
    user2 = auth2.data.user;
  });

  it('should enforce RLS for receipts', async () => {
    // User 1 creates a receipt
    const { data: receipt } = await supabase
      .from('receipts')
      .insert({
        file_url: 'user1/receipt.jpg',
        status: 'uploaded'
      })
      .select()
      .single();

    // Switch to user 2's session
    await supabase.auth.setSession({
      access_token: user2.access_token,
      refresh_token: user2.refresh_token
    });

    // User 2 should not see user 1's receipts
    const { data: receipts } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receipt.id);

    expect(receipts).toEqual([]);
  });

  it('should allow users to access their own data', async () => {
    await supabase.auth.setSession({
      access_token: user1.access_token,
      refresh_token: user1.refresh_token
    });

    const { data: receipts } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user1.id);

    expect(receipts.length).toBeGreaterThan(0);
    expect(receipts.every(r => r.user_id === user1.id)).toBe(true);
  });
});
```

## 🎭 End-to-End Testing

### E2E Test Configuration

**File**: `.detoxrc.js`

```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ExpenseIQ.app',
      build: 'xcodebuild -workspace ios/ExpenseIQ.xcworkspace -scheme ExpenseIQ -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_33'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### E2E Test Scenarios

**File**: `e2e/auth.e2e.js`

```javascript
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete full login flow', async () => {
    // Should start on login screen
    await expect(element(by.id('login-screen'))).toBeVisible();

    // Enter credentials
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    
    // Tap login button
    await element(by.id('login-button')).tap();

    // Should navigate to home screen
    await expect(element(by.id('home-screen'))).toBeVisible(2000);
    
    // Should show user info
    await expect(element(by.text('Welcome back!'))).toBeVisible();
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Invalid credentials'))).toBeVisible();
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should complete signup flow', async () => {
    await element(by.id('signup-link')).tap();
    await expect(element(by.id('signup-screen'))).toBeVisible();

    await element(by.id('email-input')).typeText('newuser@example.com');
    await element(by.id('password-input')).typeText('newpassword123');
    await element(by.id('confirm-password-input')).typeText('newpassword123');
    
    await element(by.id('signup-button')).tap();

    // Should show success message
    await expect(element(by.text('Check your email'))).toBeVisible();
  });
});
```

**File**: `e2e/receipts.e2e.js`

```javascript
describe('Receipt Scanning Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login first
    await loginUser('test@example.com', 'password123');
  });

  it('should capture and process receipt', async () => {
    // Navigate to scan tab
    await element(by.id('scan-tab')).tap();
    await expect(element(by.id('camera-view'))).toBeVisible();

    // Grant camera permissions
    await device.launchApp({ permissions: { camera: 'YES' } });

    // Take photo
    await element(by.id('capture-button')).tap();
    
    // Should show preview
    await expect(element(by.id('photo-preview'))).toBeVisible();
    
    // Confirm photo
    await element(by.id('confirm-photo')).tap();

    // Should show upload progress
    await expect(element(by.id('upload-progress'))).toBeVisible();
    
    // Should navigate to receipt details
    await expect(element(by.id('receipt-details'))).toBeVisible(10000);
    
    // Should show OCR results
    await expect(element(by.id('merchant-name'))).toBeVisible();
    await expect(element(by.id('total-amount'))).toBeVisible();
  });

  it('should handle camera errors gracefully', async () => {
    await device.launchApp({ permissions: { camera: 'NO' } });
    
    await element(by.id('scan-tab')).tap();
    
    // Should show permission request
    await expect(element(by.text('Camera permission required'))).toBeVisible();
    
    // Should offer alternative upload
    await expect(element(by.id('upload-from-gallery'))).toBeVisible();
  });
});

// Helper functions
async function loginUser(email, password) {
  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();
  await expect(element(by.id('home-screen'))).toBeVisible();
}
```

## 📊 Performance Testing

### Performance Test Suite

**File**: `__tests__/performance/api.performance.test.ts`

```typescript
import { performance } from 'perf_hooks';

describe('API Performance Tests', () => {
  const measureExecutionTime = async (fn: () => Promise<any>) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  };

  it('should load receipts in under 2 seconds', async () => {
    const executionTime = await measureExecutionTime(async () => {
      const response = await fetch('/api/receipts', {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      await response.json();
    });

    expect(executionTime).toBeLessThan(2000);
  });

  it('should handle concurrent uploads efficiently', async () => {
    const concurrentUploads = 5;
    const uploadPromises = Array.from({ length: concurrentUploads }, (_, i) => 
      uploadTestReceipt(`test-receipt-${i}.jpg`)
    );

    const start = performance.now();
    const results = await Promise.all(uploadPromises);
    const totalTime = performance.now() - start;

    // Should complete all uploads in reasonable time
    expect(totalTime).toBeLessThan(10000);
    
    // All uploads should succeed
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should process OCR within time limits', async () => {
    const receiptData = generateTestReceiptImage();
    
    const processingTime = await measureExecutionTime(async () => {
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: receiptData,
        headers: { 'Content-Type': 'image/jpeg' }
      });
      await response.json();
    });

    // OCR should complete within 30 seconds
    expect(processingTime).toBeLessThan(30000);
  });
});
```

### Memory and CPU Testing

**File**: `__tests__/performance/memory.test.ts`

```typescript
describe('Memory Usage Tests', () => {
  it('should not leak memory during receipt processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process multiple receipts
    for (let i = 0; i < 10; i++) {
      await processTestReceipt();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it('should handle large image files efficiently', async () => {
    const largImage = generateLargeTestImage(8 * 1024 * 1024); // 8MB
    
    const memoryBefore = process.memoryUsage().heapUsed;
    await processImageOCR(largImage);
    const memoryAfter = process.memoryUsage().heapUsed;
    
    // Memory usage should not spike excessively
    const memorySpike = memoryAfter - memoryBefore;
    expect(memorySpike).toBeLessThan(largImage.length * 2);
  });
});
```

## 🔄 Automated Testing

### CI/CD Pipeline Testing

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit -- --coverage --watchAll=false
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup test database
        run: npm run db:setup:test
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
        
      - name: Build app
        run: npm run build:android
        
      - name: Run E2E tests
        run: npm run test:e2e:android

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level high
        
      - name: Check for vulnerabilities
        run: npx snyk test
        
      - name: Static analysis
        run: npm run lint:security
```

### Test Scripts

**File**: `package.json` (testing scripts)

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "test:e2e": "detox test",
    "test:e2e:android": "detox test --configuration android.emu.debug",
    "test:e2e:ios": "detox test --configuration ios.sim.debug",
    "test:performance": "jest --testPathPattern=__tests__/performance",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "lint:security": "eslint --ext .js,.jsx,.ts,.tsx --config .eslintrc.security.js .",
    "audit:fix": "npm audit fix"
  }
}
```

### Quality Gates

**File**: `quality-gates.json`

```json
{
  "coverage": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  },
  "performance": {
    "maxApiResponseTime": 2000,
    "maxOCRProcessingTime": 30000,
    "maxMemoryUsage": 512,
    "maxBundleSize": 50
  },
  "security": {
    "allowedVulnerabilities": {
      "low": 5,
      "moderate": 2,
      "high": 0,
      "critical": 0
    }
  },
  "codeQuality": {
    "maxComplexity": 10,
    "maxLinesPerFunction": 50,
    "maxLinesPerFile": 300
  }
}
```

This comprehensive testing documentation ensures ExpenseIQ maintains high quality standards across all development phases and provides confidence in the application's reliability and performance.

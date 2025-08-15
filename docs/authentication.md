# Authentication System Documentation

## 🔐 Overview

ExpenseIQ implements a comprehensive authentication system using Supabase Auth with JWT tokens, providing secure user registration, login, and session management.

## 📁 File Structure

```
app/
├── (auth)/
│   ├── login.tsx           # Login screen
│   ├── register.tsx        # Registration screen
│   └── forgot-password.tsx # Password reset
├── ProtectedRoute.tsx      # Route protection component
└── reset-password-web/
    └── index.tsx          # Web password reset handler
context/
└── AuthContext.tsx        # Authentication context provider
```

## 🏗️ Architecture

### AuthContext Provider

**File**: `context/AuthContext.tsx`

The AuthContext provides global authentication state management across the application.

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

**Key Features:**
- Automatic session restoration on app launch
- Real-time authentication state updates
- Secure token management
- Error handling and user feedback

### Login Screen

**File**: `app/(auth)/login.tsx`

Provides email/password authentication with form validation and error handling.

**Features:**
- Email and password validation
- Loading states and error messages
- Navigation to registration and password reset
- Automatic redirect after successful login

**Implementation Details:**
```typescript
const handleLogin = async () => {
  try {
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) throw error;
    // Automatic navigation handled by AuthContext
  } catch (error) {
    Alert.alert('Login Failed', error.message);
  } finally {
    setLoading(false);
  }
};
```

### Registration Flow

**File**: `app/(auth)/register.tsx`

New user registration with email verification.

**Features:**
- Email format validation
- Password strength requirements
- Terms and conditions acceptance
- Email verification flow

### Protected Routes

**File**: `app/ProtectedRoute.tsx`

Higher-order component that wraps protected screens to ensure authentication.

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/login" />;
  
  return <>{children}</>;
}
```

## 🔑 Authentication Flow

### 1. Initial App Load
```
App Launch → AuthContext initialization → Check stored session
│
├── Valid session → Load user data → Navigate to main app
└── No session → Navigate to login screen
```

### 2. Login Process
```
User enters credentials → Form validation → Supabase Auth
│
├── Success → Store session → Update context → Navigate to app
└── Error → Display error message → Stay on login
```

### 3. Session Management
```
Active session → Automatic token refresh → Periodic validation
│
├── Valid → Continue session
└── Invalid → Clear session → Navigate to login
```

## 🛡️ Security Features

### JWT Token Handling
- Secure storage using Expo SecureStore
- Automatic token refresh before expiration
- Proper cleanup on logout

### Password Security
- Minimum 8 characters requirement
- Server-side hashing with bcrypt
- Secure password reset via email

### Session Protection
- Automatic logout on token expiration
- Device-specific session management
- Secure transmission over HTTPS

## 🔧 Configuration

### Environment Variables
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Auth Settings
- Email confirmation required
- Password reset via email
- Session timeout configuration
- JWT secret rotation

## 🎯 Usage Examples

### Using Authentication in Components
```typescript
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };
  
  return (
    <View>
      <Text>Welcome, {user?.email}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
```

### Protecting API Endpoints
```typescript
// In Edge Functions
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const user = await getUser(token);
```

## 📱 User Experience

### Login Screen Features
- Clean, intuitive interface
- Real-time form validation
- Loading indicators
- Clear error messages
- Quick access to registration and password reset

### Error Handling
- Network connectivity issues
- Invalid credentials
- Account verification requirements
- Server errors

### Accessibility
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode support
- Large text support

## 🐛 Troubleshooting

### Common Issues

**1. Session Not Persisting**
- Check SecureStore permissions
- Verify JWT token format
- Ensure proper cleanup on logout

**2. Authentication Errors**
- Validate email format
- Check password requirements
- Verify network connectivity
- Review Supabase Auth logs

**3. Navigation Issues**
- Ensure ProtectedRoute wrapping
- Check authentication state timing
- Verify route configuration

### Debug Tools
- Console logging in development
- Supabase Auth dashboard
- Network request monitoring
- Error boundary implementation

## 🔄 Future Enhancements

### Planned Features
- Biometric authentication (Face ID/Touch ID)
- Two-factor authentication (2FA)
- Social login (Google, Apple)
- Multi-device session management

### Security Improvements
- Enhanced password policies
- Account lockout protection
- Suspicious activity detection
- Enhanced session monitoring

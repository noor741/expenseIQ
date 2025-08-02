// utils/inputValidation.ts

export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'Please enter your email address';
  }
  if (!email.includes('@') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password.trim()) {
    return 'Please enter your password';
  }
  if (password.length < 8) {
    return 'Password must be at least 6 characters long';
  }
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
}

export function validateNumber(value: string, required = true): string | null {
  if (required && !value.trim()) {
    return 'This field is required';
  }
  if (value && isNaN(Number(value))) {
    return 'Please enter a valid number';
  }
  return null;
}

export function validateText(value: string, required = true, minLength = 1, maxLength?: number): string | null {
  if (required && !value.trim()) {
    return 'This field is required';
  }
  if (minLength && value.length < minLength) {
    return `Must be at least ${minLength} characters`;
  }
  if (maxLength && value.length > maxLength) {
    return `Must be at most ${maxLength} characters`;
  }
  return null;
}

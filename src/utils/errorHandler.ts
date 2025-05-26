import { useToastStore } from '../components/Toast';

interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  code?: string;
  details?: unknown;
  context?: Record<string, unknown>;

  constructor(
    message: string,
    code?: string,
    details?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.context = context;
  }
}

export const handleError = (error: unknown): AppError => {
  const toast = useToastStore.getState().addToast;

  // Convert unknown error to AppError
  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(error.message, undefined, error.stack);
  } else if (typeof error === 'string') {
    appError = new AppError(error);
  } else {
    appError = new AppError('发生未知错误');
  }

  // Add context information
  appError.context = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...appError.context,
  };

  // Log error for debugging
  console.error('Error details:', {
    message: appError.message,
    code: appError.code,
    details: appError.details,
    context: appError.context,
    stack: appError.stack,
  });

  // Show user-friendly message
  toast({
    type: 'error',
    message: getUserFriendlyMessage(appError),
    duration: 5000,
  });

  return appError;
};

const getUserFriendlyMessage = (error: AppError): string => {
  // Map error codes and raw English messages to user-friendly messages
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': '请输入有效的邮箱地址',
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/user-not-found': '用户不存在',
    'auth/wrong-password': '密码错误',
    'auth/too-many-requests': '登录尝试次数过多，请稍后再试',
    'network-error': '网络连接失败，请检查网络设置',
    'server-error': '服务器错误，请稍后再试',
    'database/connection-error': '数据库连接失败，请稍后再试',
    'validation-error': '输入数据验证失败，请检查输入',
    'permission-denied': '没有权限执行此操作',
    'not-found': '请求的资源不存在',
    'rate-limit': '操作过于频繁，请稍后再试',
    // 英文原文映射
    'Password should be at least 6 characters.': '密码长度至少为6个字符。',
    'Email is not valid': '请输入有效的邮箱地址。',
    'Invalid login credentials': '登录凭证无效，请检查邮箱和密码。',
    'User already registered': '该邮箱已被注册。',
    'Invalid email or password': '邮箱或密码错误。',
    'Email cannot be empty': '邮箱不能为空。',
    'Password cannot be empty': '密码不能为空。',
    'User not found': '用户不存在。',
    'Invalid email': '请输入有效的邮箱地址。',
    'Invalid password': '密码无效。',
    'Email already in use': '该邮箱已被注册。',
    'Too many login attempts, please try again later.': '登录尝试次数过多，请稍后再试。',
  };

  // 优先用 code 匹配，其次用 message 匹配
  let message = '';
  if (error.code && errorMessages[error.code]) {
    message = errorMessages[error.code];
  } else if (error.message && errorMessages[error.message]) {
    message = errorMessages[error.message];
  } else {
    message = error.message || '操作失败，请重试';
  }

  // 不再拼接 details，Toast 只显示 message
  return message;
};

export const createErrorBoundary = (component: string) => {
  return (error: unknown) => {
    console.error(`Error in ${component}:`, error);
    handleError(error);
  };
};

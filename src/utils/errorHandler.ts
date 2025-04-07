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
  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': '请输入有效的邮箱地址',
    'auth/weak-password': '密码强度不够，请至少包含8个字符',
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
  };

  // Get specific error message or use default
  const message = error.code && errorMessages[error.code]
    ? errorMessages[error.code]
    : error.message || '操作失败，请重试';

  // Add additional context if available
  if (error.details && typeof error.details === 'string') {
    return `${message}（${error.details}）`;
  }

  return message;
};

export const createErrorBoundary = (component: string) => {
  return (error: unknown) => {
    console.error(`Error in ${component}:`, error);
    handleError(error);
  };
};

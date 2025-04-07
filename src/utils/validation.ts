export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码长度至少为8个字符');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('密码需包含至少一个大写字母');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('密码需包含至少一个小写字母');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('密码需包含至少一个数字');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('密码需包含至少一个特殊字符 (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const SPECIAL_CHARACTER = /[!@#$%^&*(),.?":{}|<>]/;

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'At least 8 characters',
    message: 'Password must be at least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    id: 'upper',
    label: 'A capital letter',
    message: 'Password must contain a capital letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lower',
    label: 'A lowercase letter',
    message: 'Password must contain a lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'A number',
    message: 'Password must contain a number',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'A special character',
    message: 'Password must contain a special character',
    test: (password) => SPECIAL_CHARACTER.test(password),
  },
];

export function passwordError(password) {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password || ''));
  return failed ? failed.message : '';
}

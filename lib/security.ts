export const strongPasswordSchemaMessage =
  "Use at least 12 characters with uppercase, lowercase, a number, and a symbol.";

export function isStrongPassword(password: string) {
  return password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

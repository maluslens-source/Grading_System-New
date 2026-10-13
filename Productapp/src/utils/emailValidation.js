/**
 * Email validation for account creation.
 *
 * Registration stores a real address only: the login identifier doubles as the
 * account email, so a phone number has no valid form here. Keep this in sync
 * with the API's expectation (api/schemas.py RegisterRequest.email).
 */

// Deliberately pragmatic: one @, no spaces, a dotted domain with a 2+ char TLD.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

/** Domains produced by toLoginEmail for phone logins — never valid at sign-up. */
const SYNTHETIC_DOMAINS = ["@phone.example.com"];

export function isValidEmail(value) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (SYNTHETIC_DOMAINS.some((d) => v.toLowerCase().endsWith(d))) return false;
  return EMAIL_RE.test(v);
}

/** Returns an error message, or "" when the value is an acceptable email. */
export function emailValidationMessage(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Email is required";
  if (SYNTHETIC_DOMAINS.some((d) => v.toLowerCase().endsWith(d))) {
    return "Enter your email address. Mobile numbers cannot be used to register.";
  }
  // A bare "1234567890" or "+91 98765 43210" is the common mobile mistake.
  if (!v.includes("@") && /\d{6,}/.test(v.replace(/\D/g, ""))) {
    return "Enter a valid email address, not a mobile number.";
  }
  if (!EMAIL_RE.test(v)) return "Enter a valid email address (e.g. name@company.com)";
  return "";
}

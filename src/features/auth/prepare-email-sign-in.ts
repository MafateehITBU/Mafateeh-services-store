export type EmailSignInIntent = {
  email: string;
  status: "pending_integration";
};

/**
 * Integration point for the authentication phase.
 * Replace the body with the email OTP request. Do not report success here
 * until that request actually sends a code.
 */
export function prepareEmailSignIn(email: string): EmailSignInIntent {
  return {
    email,
    status: "pending_integration",
  };
}

import { useState } from "react";
import type { User } from "firebase/auth";
import { accountService } from "../firebaseService/accountService";

interface VerifyEmailBannerProps {
  user: User;
}

// Shows for signed-in users whose email address has not been confirmed yet
function VerifyEmailBanner({ user }: VerifyEmailBannerProps) {
  const [verified, setVerified] = useState(user.emailVerified);
  const [message, setMessage] = useState("");

  if (verified) return null;

  async function resend() {
    const result = await accountService.resendVerification(user);
    setMessage(result.message);
  }

  async function check() {
    await user.reload();
    setVerified(user.emailVerified);
    if (!user.emailVerified) setMessage("Still not verified. Open the link in the email, then try again.");
  }

  return (
    <div className="verify-banner" role="status">
      <span>Please verify your email address.</span>
      <button type="button" className="btn btn-ghost" onClick={resend}>
        Resend email
      </button>
      <button type="button" className="btn btn-ghost" onClick={check}>
        I have verified
      </button>
      {message && <span className="muted small">{message}</span>}
    </div>
  );
}

export default VerifyEmailBanner;

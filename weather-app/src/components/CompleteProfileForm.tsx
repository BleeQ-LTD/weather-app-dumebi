import { useState, type FormEvent } from "react";
import { getAuthErrorMessage, logOut } from "../firebaseService/authService";
import { GENDER_OPTIONS, saveGender } from "../firebaseService/profileService";

type Props = {
  uid: string;
  onSaved: () => void;
};

export default function CompleteProfileForm({ uid, onSaved }: Props) {
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await saveGender(uid, gender);
      onSaved();
    } catch (err) {
      console.error(
        "Saving gender failed, code:",
        (err as { code?: string }).code,
        err
      );
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await logOut();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-icon" aria-hidden="true">
              ⛅
            </div>
            <h1>One last step</h1>
            <p className="muted">
              Tell us your gender to finish setting up your account.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              Gender
              <select
                name="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                required
              >
                <option value="">Select your gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Continue"}
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleSignOut}
              disabled={saving}
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

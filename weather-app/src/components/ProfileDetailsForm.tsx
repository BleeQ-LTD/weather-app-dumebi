import { useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import {
  GENDER_OPTIONS,
  MAX_NAME_LENGTH,
  saveProfileDetails,
  type ProfileDetails,
  type UserProfile,
} from "../firebaseService/profileService";
import { getAuthErrorMessage } from "../firebaseService/authService";

interface ProfileDetailsFormProps {
  user: User;
  profile: UserProfile | null;
  onSaved: (details: ProfileDetails) => void;
}

function detailsOf(profile: UserProfile | null): ProfileDetails {
  return {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    gender: profile?.gender ?? "",
  };
}

function sameDetails(a: ProfileDetails, b: ProfileDetails): boolean {
  return (
    a.firstName.trim() === b.firstName.trim() &&
    a.lastName.trim() === b.lastName.trim() &&
    a.gender === b.gender
  );
}

// First name, last name and gender can be edited. "Save changes" only
// appears once something differs from what is saved.
export default function ProfileDetailsForm({ user, profile, onSaved }: ProfileDetailsFormProps) {
  const [saved, setSaved] = useState<ProfileDetails>(() => detailsOf(profile));
  const [draft, setDraft] = useState<ProfileDetails>(() => detailsOf(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const changed = !sameDetails(draft, saved);

  function update(field: keyof ProfileDetails, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
    setJustSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || saving) return;

    setSaving(true);
    setError("");

    try {
      const clean = await saveProfileDetails(user, draft);
      setSaved(clean);
      setDraft(clean);
      setJustSaved(true);
      onSaved(clean);
    } catch (err) {
      console.error("Saving profile failed:", (err as { code?: string }).code ?? err);
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="auth-form profile-details" onSubmit={handleSubmit} noValidate>
      <label className="field">
        First name
        <input
          type="text"
          name="given-name"
          value={draft.firstName}
          onChange={(event) => update("firstName", event.target.value)}
          autoComplete="given-name"
          maxLength={MAX_NAME_LENGTH}
          required
        />
      </label>

      <label className="field">
        Last name
        <input
          type="text"
          name="family-name"
          value={draft.lastName}
          onChange={(event) => update("lastName", event.target.value)}
          autoComplete="family-name"
          maxLength={MAX_NAME_LENGTH}
        />
      </label>

      <label className="field">
        Gender
        <select
          name="gender"
          value={draft.gender}
          onChange={(event) => update("gender", event.target.value)}
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

      <label className="field">
        Email address
        <input type="email" value={user.email || "Not available"} readOnly />
      </label>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {changed && (
        <div className="profile-save-bar">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={() => {
              setDraft(saved);
              setError("");
            }}
          >
            Discard
          </button>
        </div>
      )}

      {justSaved && !changed && (
        <p className="success-text" role="status">
          Your changes have been saved.
        </p>
      )}
    </form>
  );
}

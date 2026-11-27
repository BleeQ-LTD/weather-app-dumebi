import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Avatar from "./Avatar";
import { fullName } from "../utils/accountDisplay";
import { AvatarImageError, resizeToAvatar } from "../utils/avatarImage";
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
    photo: profile?.photo ?? "",
  };
}

function sameDetails(a: ProfileDetails, b: ProfileDetails): boolean {
  return (
    a.firstName.trim() === b.firstName.trim() &&
    a.lastName.trim() === b.lastName.trim() &&
    a.gender === b.gender &&
    a.photo === b.photo
  );
}

// Profile picture, first name, last name and gender can be edited. "Save
// changes" only appears once something differs from what is saved.
export default function ProfileDetailsForm({ user, profile, onSaved }: ProfileDetailsFormProps) {
  const [saved, setSaved] = useState<ProfileDetails>(() => detailsOf(profile));
  const [draft, setDraft] = useState<ProfileDetails>(() => detailsOf(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const changed = !sameDetails(draft, saved);
  const fileInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handlePhotoPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again still triggers
    if (!file) return;

    setProcessing(true);
    setError("");
    try {
      update("photo", await resizeToAvatar(file));
    } catch (err) {
      setError(
        err instanceof AvatarImageError ? err.message : "That image couldn't be used. Please try another one."
      );
    } finally {
      setProcessing(false);
    }
  }

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
      <div className="profile-photo">
        <button
          type="button"
          className="profile-photo-button"
          onClick={() => fileInput.current?.click()}
          disabled={processing || saving}
          aria-label={draft.photo || user.photoURL ? "Change profile picture" : "Add a profile picture"}
          title="Change profile picture"
        >
          <Avatar
            user={user}
            photo={draft.photo}
            name={fullName(draft.firstName, draft.lastName)}
            size={96}
          />
          <span className="profile-photo-badge" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhotoPicked}
        />

        {processing ? (
          <p className="muted small" role="status">Preparing picture…</p>
        ) : draft.photo ? (
          <button type="button" className="profile-photo-remove" onClick={() => update("photo", "")}>
            Remove photo
          </button>
        ) : (
          <p className="muted small">Tap the picture to change it</p>
        )}
      </div>

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

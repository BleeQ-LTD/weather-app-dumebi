
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { isValidAvatar } from "../utils/avatarImage";
import { updateProfile } from "firebase/auth";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { AuthError } from "./authService";

export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

export type TemperatureUnit = "celsius" | "fahrenheit";

export interface UserProfile {
  firstName: string;
  lastName: string;
  gender?: string;
  temperatureUnit: TemperatureUnit;
  photo?: string; // uploaded profile picture (small JPEG data URL)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) return null;

  const data = snapshot.data();

  return {
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    gender:
      typeof data.gender === "string" && data.gender !== ""
        ? data.gender
        : undefined,
    temperatureUnit:
      data.temperatureUnit === "fahrenheit" ? "fahrenheit" : "celsius",
    photo:
      typeof data.photo === "string" && isValidAvatar(data.photo)
        ? data.photo
        : undefined,
  };
}

export async function saveGender(uid: string, gender: string): Promise<void> {
  if (!GENDER_OPTIONS.some((option) => option.value === gender)) {
    throw new AuthError("auth/missing-gender", "Please select your gender.");
  }

  await updateDoc(doc(db, "users", uid), { gender });
}

export async function saveTemperatureUnit(
  uid: string,
  temperatureUnit: TemperatureUnit,
): Promise<void> {
  if (
    temperatureUnit !== "celsius" &&
    temperatureUnit !== "fahrenheit"
  ) {
    throw new Error("Invalid temperature unit.");
  }

  await updateDoc(doc(db, "users", uid), { temperatureUnit });
}

export const MAX_NAME_LENGTH = 50;

export interface ProfileDetails {
  firstName: string;
  lastName: string;
  gender: string;
  photo: string; // "" = no uploaded picture
}

// Same limits as sign-up and the Firestore rules. Returns a message, or "" if fine.
export function validateProfileDetails(details: ProfileDetails): string {
  const firstName = details.firstName.trim();
  const lastName = details.lastName.trim();

  if (!firstName) return "First name is required.";
  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
    return `Names must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (!GENDER_OPTIONS.some((option) => option.value === details.gender)) {
    return "Please select your gender.";
  }
  if (details.photo && !isValidAvatar(details.photo)) {
    return "That picture couldn't be saved. Please choose another one.";
  }
  return "";
}

// Saves name, gender and profile picture to users/{uid}, and the name to the sign-in account
// too, so the sidebar shows it.
export async function saveProfileDetails(
  user: User,
  details: ProfileDetails
): Promise<ProfileDetails> {
  const problem = validateProfileDetails(details);
  if (problem) throw new AuthError("app/invalid-profile", problem);

  const clean: ProfileDetails = {
    firstName: details.firstName.trim(),
    lastName: details.lastName.trim(),
    gender: details.gender,
    photo: details.photo,
  };

  await updateDoc(doc(db, "users", user.uid), {
    firstName: clean.firstName,
    lastName: clean.lastName,
    gender: clean.gender,
    // Removing the picture deletes the field rather than storing ""
    photo: clean.photo ? clean.photo : deleteField(),
  });

  const displayName = `${clean.firstName} ${clean.lastName}`.trim();
  if (user.displayName !== displayName) {
    try {
      await updateProfile(user, { displayName });
    } catch (error) {
      // The profile itself is saved; only the sidebar name is behind.
      console.error("Updating the account name failed:", error);
    }
  }

  return clean;
}

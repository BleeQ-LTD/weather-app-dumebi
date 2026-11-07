
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

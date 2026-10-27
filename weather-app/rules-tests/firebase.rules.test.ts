import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

// Test the proposed rules first:  RULES_FILE=firestore.rules.proposed npm run test:rules
const RULES_FILE = process.env.RULES_FILE ?? "firestore.rules";

let env: RulesTestEnvironment;

const valid = () => ({
  name: "Lagos, Nigeria",
  latitude: 6.5244,
  longitude: 3.3792,
  countryCode: "NG",
  createdAt: serverTimestamp(),
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-weather-rules",
    firestore: { rules: readFileSync(RULES_FILE, "utf8") },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
   if (env) {
    await env.cleanup();
  }
});

const alice = () => env.authenticatedContext("alice").firestore();
const bob = () => env.authenticatedContext("bob").firestore();
const visitor = () => env.unauthenticatedContext().firestore();
const path = "users/alice/favourites/lagos_ng";

describe("TC-FB-101 favourites: who can read and delete", () => {
  it("lets the owner read and delete their own favourite", async () => {
    await assertSucceeds(setDoc(doc(alice(), path), valid()));
    await assertSucceeds(getDoc(doc(alice(), path)));
    await assertSucceeds(deleteDoc(doc(alice(), path)));
  });

  it("blocks another signed-in user", async () => {
    await assertSucceeds(setDoc(doc(alice(), path), valid()));
    await assertFails(getDoc(doc(bob(), path)));
    await assertFails(deleteDoc(doc(bob(), path)));
  });

  it("blocks a signed-out visitor", async () => {
    await assertFails(getDoc(doc(visitor(), path)));
    await assertFails(setDoc(doc(visitor(), path), valid()));
  });
});

describe("TC-FB-102 favourites: what can be written", () => {
  it("accepts a valid favourite without a country code", async () => {
    const { countryCode, ...withoutCode } = valid();
    void countryCode;
    await assertSucceeds(setDoc(doc(alice(), path), withoutCode));
  });

  it("lets the owner save the same favourite again (it overwrites)", async () => {
    await assertSucceeds(setDoc(doc(alice(), path), valid()));
    await assertSucceeds(setDoc(doc(alice(), path), valid()));
  });

  it("rejects an extra field", async () => {
    await assertFails(setDoc(doc(alice(), path), { ...valid(), admin: true }));
  });

  it("rejects a missing field", async () => {
    const { name, ...withoutName } = valid();
    void name;
    await assertFails(setDoc(doc(alice(), path), withoutName));
  });

  it("rejects wrong types and out-of-range coordinates", async () => {
    await assertFails(setDoc(doc(alice(), path), { ...valid(), latitude: "6.5" }));
    await assertFails(setDoc(doc(alice(), path), { ...valid(), latitude: 200 }));
    await assertFails(setDoc(doc(alice(), path), { ...valid(), longitude: -181 }));
  });

  it("rejects an empty or very long name", async () => {
    await assertFails(setDoc(doc(alice(), path), { ...valid(), name: "" }));
    await assertFails(setDoc(doc(alice(), path), { ...valid(), name: "x".repeat(121) }));
  });

  it("rejects a client-supplied timestamp, so createdAt is always the server's time", async () => {
    await assertFails(setDoc(doc(alice(), path), { ...valid(), createdAt: Timestamp.fromDate(new Date("2020-01-01")) }));
  });

  it("rejects writing into another user's folder", async () => {
    await assertFails(setDoc(doc(bob(), path), valid()));
  });
});

describe("TC-FB-103 everything else is closed", () => {
  it("blocks reads and writes outside the favourites path", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/profile/me"), { name: "x" }));
    await assertFails(getDoc(doc(alice(), "settings/global")));
  });
});

interface Identity {
  displayName: string | null;
  email: string | null;
}

// First character of a word, safe for emoji and other characters outside the basic range
function firstCharacter(word: string): string {
  return Array.from(word)[0] ?? "";
}

export function getDisplayName(identity: Identity): string {
  const name = identity.displayName?.trim();
  if (name) return name;

  return identity.email?.trim() || "Your account";
}

// "Ada Lovelace" -> "AL", "Ada" -> "A", no name -> first letter of the email
export function getInitials(identity: Identity): string {
  const name = identity.displayName?.trim();

  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    const first = firstCharacter(words[0]);
    const last = words.length > 1 ? firstCharacter(words[words.length - 1]) : "";
    return (first + last).toUpperCase();
  }

  const letter = firstCharacter(identity.email?.trim() ?? "");
  return letter ? letter.toUpperCase() : "?";
}

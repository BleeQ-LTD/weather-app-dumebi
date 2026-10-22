export interface UpdateNotice {
  id: string;
  message: string;
}

export const SEEN_KEY = "seenUpdateId";

export function toNotice(message: string, id: string): UpdateNotice | null {
  const trimmedMessage = message.trim();
  const trimmedId = id.trim();
  return trimmedMessage !== "" && trimmedId !== "" ? { id: trimmedId, message: trimmedMessage } : null;
}

export function isUnseen(notice: UpdateNotice | null, seenId: string | null): notice is UpdateNotice {
  return notice !== null && notice.id !== seenId;
}
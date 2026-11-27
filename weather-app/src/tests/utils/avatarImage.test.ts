import { describe, expect, it } from "vitest";
import { MAX_AVATAR_CHARS, centreSquare, isValidAvatar } from "../../utils/avatarImage";

describe("profile picture", () => {
  it("keeps the centred square of wide and tall photos", () => {
    expect(centreSquare(400, 200)).toEqual({ x: 100, y: 0, side: 200 });
    expect(centreSquare(300, 600)).toEqual({ x: 0, y: 150, side: 300 });
    expect(centreSquare(256, 256)).toEqual({ x: 0, y: 0, side: 256 });
  });

  it("only accepts small JPEG data URLs", () => {
    expect(isValidAvatar("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe(true);
    expect(isValidAvatar("data:image/png;base64,iVBORw0KGgo=")).toBe(false);
    expect(isValidAvatar("https://example.com/me.jpg")).toBe(false);
    expect(isValidAvatar("data:image/jpeg;base64,<script>")).toBe(false);
    expect(isValidAvatar("data:image/jpeg;base64," + "A".repeat(MAX_AVATAR_CHARS))).toBe(false);
  });
});

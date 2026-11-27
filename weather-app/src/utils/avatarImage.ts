// Turns a picked image into a small square JPEG data URL for the profile
// picture: centre-cropped, 256×256, about 20–40 KB, so it can be stored on
// the user's Firestore document (no Firebase Storage needed).

export const AVATAR_SIZE = 256;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB before resizing
export const MAX_AVATAR_CHARS = 200_000; // stored size limit (well under Firestore's 1 MB)

const AVATAR_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;

export class AvatarImageError extends Error {}

export function isValidAvatar(value: string): boolean {
  return value.length <= MAX_AVATAR_CHARS && AVATAR_PATTERN.test(value);
}

// The centred square of an image: what gets kept when cropping to a circle.
export function centreSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { x: (width - side) / 2, y: (height - side) / 2, side };
}

export async function resizeToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new AvatarImageError("Please choose an image file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AvatarImageError("That image is over 10 MB. Please choose a smaller one.");
  }

  let bitmap: ImageBitmap;
  try {
    // from-image: photos taken sideways on phones come out the right way up
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new AvatarImageError("That image couldn't be read. Try a JPEG or PNG.");
  }

  const { x, y, side } = centreSquare(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new AvatarImageError("Your browser couldn't process the image.");

  // JPEG has no transparency: give transparent PNGs a neutral background
  context.fillStyle = "#2b2b2b";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, x, y, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  let quality = 0.85;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > MAX_AVATAR_CHARS && quality > 0.4) {
    quality -= 0.15;
    result = canvas.toDataURL("image/jpeg", quality);
  }

  if (!isValidAvatar(result)) {
    throw new AvatarImageError("That image couldn't be saved. Please try another one.");
  }
  return result;
}

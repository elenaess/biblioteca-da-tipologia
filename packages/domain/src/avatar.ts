export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export function avatarImageType(bytes: ArrayBuffer): { mime: string; extension: string } {
  if (!bytes.byteLength || bytes.byteLength > MAX_AVATAR_BYTES)
    throw new Error("Escolha uma foto de até 3 MB.");
  const b = new Uint8Array(bytes);
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { mime: "image/jpeg", extension: "jpg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v))
    return { mime: "image/png", extension: "png" };
  if (b.length >= 12 && [82, 73, 70, 70].every((v, i) => b[i] === v) &&
      [87, 69, 66, 80].every((v, i) => b[i + 8] === v))
    return { mime: "image/webp", extension: "webp" };
  throw new Error("Use uma foto JPEG, PNG ou WebP.");
}

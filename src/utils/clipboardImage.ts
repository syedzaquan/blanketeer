const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export function canReadClipboard(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.read);
}

/**
 * Checks whether the clipboard contains an image ONLY when permission is already
 * granted so browsers like iOS Safari don't show a system Paste prompt on canvas tap.
 * Returns:
 * - `true` if permission is granted and an image is on the clipboard
 * - `false` if permission is denied or granted with no image
 * - `null` if permission is 'prompt' or Permissions API is unavailable
 */
export async function hasClipboardImageSilently(): Promise<boolean | null> {
  if (!canReadClipboard()) return null;

  try {
    if (!navigator.permissions?.query) return null;
    const status = await navigator.permissions.query({
      name: 'clipboard-read' as PermissionName,
    });
    if (status.state !== 'granted') return null;

    const items = await navigator.clipboard.read();
    return items.some((item) =>
      item.types.some((type) => type.startsWith('image/'))
    );
  } catch {
    return null;
  }
}

export async function readImageFileFromClipboard(): Promise<File | null> {
  if (!canReadClipboard()) return null;

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((t) => t.startsWith('image/'));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    const ext = MIME_TO_EXT[imageType] ?? 'png';
    return new File([blob], `pasted-${Date.now()}.${ext}`, {
      type: imageType,
    });
  }
  return null;
}

export function extractImageFileFromClipboardData(
  data: DataTransfer | null
): File | null {
  if (!data) return null;

  if (data.files && data.files.length > 0) {
    for (const file of Array.from(data.files)) {
      if (file.type.startsWith('image/')) {
        return file;
      }
    }
  }

  if (data.items && data.items.length > 0) {
    for (const item of Array.from(data.items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
  }

  return null;
}


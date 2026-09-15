'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import {
  removeClubLogo,
  setCustomLogoEnabled,
  uploadClubLogo,
  type LogoUpload,
} from '@/lib/data';

/** Mirrors the bucket's file_size_limit in 0011_club_branding.sql. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function revalidateEverywhere() {
  // The logo is in the header and footer of every page.
  revalidatePath('/', 'layout');
}

/**
 * Identifies the image from its first bytes rather than trusting the type the
 * browser sent, which is just a guess from the file name.
 */
function sniffImage(bytes: ArrayBuffer): Pick<LogoUpload, 'contentType' | 'extension'> | null {
  const head = new Uint8Array(bytes.slice(0, 12));
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));

  if (head[0] === 0x89 && ascii(1, 4) === 'PNG') return { contentType: 'image/png', extension: 'png' };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  return null;
}

export async function uploadLogoAction(formData: FormData): Promise<ActionResult> {
  try {
    const file = formData.get('logo');
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose an image to upload.');
    if (file.size > MAX_LOGO_BYTES) throw new Error('That image is over 2 MB. Try a smaller export.');

    const bytes = await file.arrayBuffer();
    const kind = sniffImage(bytes);
    if (!kind) throw new Error('Use a PNG, JPG or WebP image.');

    await uploadClubLogo({ bytes, ...kind });
    revalidateEverywhere();
    return { ok: true, message: 'Logo uploaded. It is now live across the site.' };
  } catch (error) {
    return failure(error);
  }
}

export async function setCustomLogoAction(enabled: boolean): Promise<ActionResult> {
  try {
    await setCustomLogoEnabled(enabled);
    revalidateEverywhere();
    return {
      ok: true,
      message: enabled ? 'Club logo is now live.' : 'Back to the default logo.',
    };
  } catch (error) {
    return failure(error);
  }
}

export async function removeLogoAction(): Promise<ActionResult> {
  try {
    await removeClubLogo();
    revalidateEverywhere();
    return { ok: true, message: 'Logo removed. The default logo is back.' };
  } catch (error) {
    return failure(error);
  }
}

/** Uniform shape returned by every server action so the UI can toast it. */
export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

export function failure(error: unknown): ActionResult<never> {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  if (message === 'NOT_AUTHENTICATED') {
    return { ok: false, message: 'Sign in first.' };
  }
  if (message === 'FORBIDDEN') {
    return { ok: false, message: 'Admins only.' };
  }
  if (message === 'STRAVA_NOT_CONNECTED') {
    return { ok: false, message: 'Connect Strava first.' };
  }
  if (message === 'STRAVA_UNAUTHORIZED') {
    return { ok: false, message: 'Strava access expired. Reconnect your account.' };
  }
  if (message === 'STRAVA_NOT_CONFIGURED') {
    return { ok: false, message: 'Strava is not set up on this deployment.' };
  }
  return { ok: false, message };
}

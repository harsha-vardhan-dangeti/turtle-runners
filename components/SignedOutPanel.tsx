import { SignInButton } from '@/components/auth/SignInButton';
import { TurtleLogo } from '@/components/brand/TurtleLogo';

/** Shown instead of member-only pages when nobody is signed in. */
export function SignedOutPanel({
  title = 'Members only',
  message = 'Sign in with Google to see your training, your bib and this week’s sessions.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="section flex min-h-[60vh] items-center justify-center py-20">
      <div className="card w-full max-w-md p-8 text-center shadow-turtle">
        <div className="flex justify-center">
          <TurtleLogo size={52} />
        </div>
        <h1 className="display mt-5 text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{message}</p>
        <div className="mt-6 flex justify-center">
          <SignInButton />
        </div>
      </div>
    </div>
  );
}

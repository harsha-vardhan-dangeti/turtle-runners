import Link from 'next/link';
import { TurtleLogo } from '@/components/brand/TurtleLogo';

export default function NotFound() {
  return (
    <main id="main" className="section flex min-h-dvh items-center justify-center py-20">
      <div className="card max-w-md p-10 text-center shadow-turtle">
        <div className="flex justify-center">
          <TurtleLogo size={56} />
        </div>
        <p className="display mt-6 text-6xl text-gradient">404</p>
        <h1 className="display mt-2 text-3xl">Wrong turn at the lake</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          This page isn&apos;t on any of our routes. The loop is 5.2 km and it starts here.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Back to the start line
        </Link>
      </div>
    </main>
  );
}

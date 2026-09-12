/**
 * Remounted by the App Router on every navigation, which gives each route
 * change a short cross-fade instead of a hard swap. The animation itself is
 * `.page-enter` in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

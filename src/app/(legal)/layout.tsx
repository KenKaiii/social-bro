import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black px-4 py-16">
      <div className="mx-auto w-full max-w-2xl text-sm leading-7 text-white/80">
        <article className="space-y-4 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </article>
        <nav className="mt-12 flex gap-6 border-t border-white/10 pt-6 text-white/70">
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/login" className="hover:text-white">
            Back to app
          </Link>
        </nav>
      </div>
    </div>
  );
}

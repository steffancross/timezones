import env from '@/lib/env';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {env.NEXT_PUBLIC_SITE_NAME}
        </p>
      </div>
    </footer>
  );
}

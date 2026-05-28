import Link from "next/link";
import type { Metadata } from "next";
import { signIn } from "@klash/klash-app/app/(auth)/actions";
import Card from "@klash/klash-app/components/ui/Card";
import Input from "@klash/klash-app/components/ui/Input";
import { getI18n } from "@klash/klash-app/lib/i18n";
import { buildPageMetadata } from "@klash/klash-app/lib/seo";

const appName = process.env.NEXT_PUBLIC_KLASH_NAME ?? "Klash";

export const metadata: Metadata = buildPageMetadata({
  title: "Connexion",
  description: "Connectez-vous à votre compte " + appName + ".",
  path: "/login",
  noIndex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getI18n();
  const a = t.auth;

  return (
    <div className="page-shell py-16">
      <Card className="mx-auto max-w-md p-6 md:p-8">
        <h1 className="text-3xl font-black mb-2">{a.loginTitle}</h1>
        <p className="text-[color:var(--muted)]">{a.loginSubtitle}</p>

        <form action={signIn} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium">{a.email}</label>
            <Input required type="email" name="email" autoComplete="email" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{a.password}</label>
            <Input required type="password" name="password" autoComplete="current-password" className="mt-1" />
          </div>

          {error ? (
            <p className="text-sm text-red-400">{decodeURIComponent(error)}</p>
          ) : null}

          <button type="submit" className="btn-primary w-full">
            {a.loginBtn}
          </button>
        </form>

        <p className="mt-6 text-sm text-[color:var(--muted)]">
          {a.noAccount}{" "}
          <Link href="/signup" className="text-[color:var(--accent)] hover:underline">
            {a.signupLink}
          </Link>
        </p>
      </Card>
    </div>
  );
}

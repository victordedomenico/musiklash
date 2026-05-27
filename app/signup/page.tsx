import Link from "next/link";
import type { Metadata } from "next";
import { signUp } from "@/app/(auth)/actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { getI18n } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Inscription",
  description: "Créez un compte MusiKlash pour sauvegarder vos brackets et tierlists.",
  path: "/signup",
  noIndex: true,
});

export default async function SignupPage({
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
        <h1 className="text-3xl font-black mb-2">{a.signupTitle}</h1>
        <p className="text-[color:var(--muted)]">{a.signupSubtitle}</p>

        <form action={signUp} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium">{a.email}</label>
            <Input required type="email" name="email" autoComplete="email" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{a.password}</label>
            <Input
              required
              type="password"
              name="password"
              minLength={6}
              autoComplete="new-password"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-[color:var(--muted)]">{a.passwordHint}</p>
          </div>

          {error ? (
            <p className="text-sm text-red-400">{decodeURIComponent(error)}</p>
          ) : null}

          <button type="submit" className="btn-primary w-full">
            {a.signupBtn}
          </button>
        </form>

        <p className="mt-6 text-sm text-[color:var(--muted)]">
          {a.hasAccount}{" "}
          <Link href="/login" className="text-[color:var(--accent)] hover:underline">
            {a.loginLink}
          </Link>
        </p>
      </Card>
    </div>
  );
}

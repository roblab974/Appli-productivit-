import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 pt-10 pb-20">
      <h1 className="font-heading text-3xl font-bold gradient-text mb-1">PersonalDash</h1>
      <p className="text-foreground-muted text-sm mb-6">Crée ton compte pour commencer</p>
      <SignUp signInUrl="/sign-in" />
    </div>
  );
}

import { LoginTabs } from "@/components/auth/LoginTabs";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
       <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
            <Logo />
        </div>
        <LoginTabs />
       </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, UserCheck } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const signUpSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ['confirmPassword'],
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 3.08-4.75 3.08-5.72 0-9.42-4.14-9.42-9.42s3.7-9.42 9.42-9.42c2.86 0 4.88 1.17 6.38 2.58l2.94-2.82C20.02 1.83 16.56 0 12.48 0 5.88 0 .81 5.4 .81 12s5.07 12 11.67 12c3.55 0 6.2-1.23 8.16-3.25 2.05-2.1 2.5-5.05 2.5-7.65 0-.67-.06-1.32-.18-1.95h-10.6z" fill="currentColor"/>
  </svg>
);

export function LoginTabs() {
  const router = useRouter();
  const { toast } = useToast();
  const { loginDemo } = useAuth();
  const [loading, setLoading] = useState<null | 'email' | 'google' | 'demo'>(null);
  const isOnline = isSupabaseConfigured();

  const { register: registerSignIn, handleSubmit: handleSignInSubmit, formState: { errors: signInErrors } } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const { register: registerSignUp, handleSubmit: handleSignUpSubmit, formState: { errors: signUpErrors } } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSignIn = async (data: SignInForm) => {
    setLoading('email');
    try {
      if (!isOnline) {
        await loginDemo('kasir');
        toast({ title: 'Masuk Akun Demo (Offline)', description: 'Supabase offline/belum dikonfigurasi. Menggunakan sesi kasir demo lokal.' });
        router.push('/dashboard');
        return;
      }
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast({ title: 'Berhasil Masuk', description: `Selamat datang kembali, ${authData.user?.email}` });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Gagal Masuk', description: error.message || 'Periksa email dan password Anda.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const onSignUp = async (data: SignUpForm) => {
    setLoading('email');
    try {
      if (!isOnline) {
        toast({ title: 'Pendaftaran Dinonaktifkan', description: 'Mode offline aktif. Silakan gunakan Akun Demo Kasir.', variant: 'destructive' });
        return;
      }
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast({ title: 'Pendaftaran Berhasil', description: 'Akun berhasil dibuat. Silakan periksa email Anda untuk verifikasi atau langsung login.' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Gagal Mendaftar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading('google');
    try {
      if (!isOnline) {
        toast({ title: 'OAuth Google Dinonaktifkan', description: 'Koneksi Supabase offline. Silakan masuk menggunakan Akun Demo.', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: 'Gagal Masuk Google', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleQuickDemoLogin = async (role: 'kasir' | 'admin') => {
    setLoading('demo');
    try {
      await loginDemo(role);
      toast({
        title: 'Masuk Akun Demo',
        description: `Berhasil masuk sebagai ${role === 'admin' ? 'Manager Toko' : 'Staf Kasir'} (Mode Demo Offline).`,
      });
      router.push('/dashboard');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="flex items-center gap-1.5 font-bold">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          Akses Cepat Akun Demo (Lokal & Pengujian)
        </div>
        <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
          Gunakan tombol di bawah untuk masuk langsung sebagai kasir atau manager toko tanpa akun Supabase.
        </p>
        <div className="mt-2.5 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-7 text-xs bg-amber-700 hover:bg-amber-800 text-white font-semibold"
            onClick={() => handleQuickDemoLogin('kasir')}
            disabled={loading !== null}
            data-testid="demo-kasir-btn"
          >
            <UserCheck className="mr-1 h-3.5 w-3.5" />
            Masuk Demo Kasir
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-300 text-amber-900 font-semibold bg-white"
            onClick={() => handleQuickDemoLogin('admin')}
            disabled={loading !== null}
            data-testid="demo-admin-btn"
          >
            Masuk Demo Manager
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sign-in" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/80 p-1 border border-border">
          <TabsTrigger value="sign-in" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">Masuk</TabsTrigger>
          <TabsTrigger value="sign-up" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">Daftar Baru</TabsTrigger>
        </TabsList>
        <TabsContent value="sign-in">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold text-foreground">Masuk ke Akun</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Masuk untuk mengakses sistem kasir dan operasional.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignInSubmit(onSignIn)}>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email-in" className="text-xs font-semibold">Email Pengguna</Label>
                  <Input id="email-in" type="email" {...registerSignIn('email')} placeholder="admin@pos.local" className="h-8 text-xs" />
                  {signInErrors.email && <p className="text-[11px] text-destructive">{signInErrors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password-in" className="text-xs font-semibold">Kata Sandi</Label>
                  <Input id="password-in" type="password" {...registerSignIn('password')} placeholder="••••••••" className="h-8 text-xs" />
                  {signInErrors.password && <p className="text-[11px] text-destructive">{signInErrors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                <Button type="submit" className="w-full h-8 text-xs font-bold shadow-sm" disabled={loading !== null}>
                  {loading === 'email' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Masuk ke Sistem
                </Button>
                <Button type="button" variant="outline" className="w-full h-8 text-xs font-medium border-border" onClick={handleGoogleSignIn} disabled={loading !== null}>
                  {loading === 'google' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <GoogleIcon />}
                  Masuk dengan Akun Google
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="sign-up">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold text-foreground">Buat Akun Staf</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Daftarkan akun staf baru untuk sistem kasir.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUpSubmit(onSignUp)}>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email-up" className="text-xs font-semibold">Email Pengguna</Label>
                  <Input id="email-up" type="email" {...registerSignUp('email')} placeholder="staf@pos.local" className="h-8 text-xs" />
                  {signUpErrors.email && <p className="text-[11px] text-destructive">{signUpErrors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password-up" className="text-xs font-semibold">Kata Sandi</Label>
                  <Input id="password-up" type="password" {...registerSignUp('password')} placeholder="••••••••" className="h-8 text-xs" />
                  {signUpErrors.password && <p className="text-[11px] text-destructive">{signUpErrors.password.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword-up" className="text-xs font-semibold">Ulangi Kata Sandi</Label>
                  <Input id="confirmPassword-up" type="password" {...registerSignUp('confirmPassword')} placeholder="••••••••" className="h-8 text-xs" />
                  {signUpErrors.confirmPassword && <p className="text-[11px] text-destructive">{signUpErrors.confirmPassword.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                <Button type="submit" className="w-full h-8 text-xs font-bold shadow-sm" disabled={loading !== null}>
                  {loading === 'email' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Daftar Akun Baru
                </Button>
                <Button type="button" variant="outline" className="w-full h-8 text-xs font-medium border-border" onClick={handleGoogleSignIn} disabled={loading !== null}>
                  {loading === 'google' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <GoogleIcon />}
                  Daftar dengan Akun Google
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

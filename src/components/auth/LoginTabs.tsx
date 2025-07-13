'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Zod schemas for validation
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;


// Google Logo SVG
const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 3.08-4.75 3.08-5.72 0-9.42-4.14-9.42-9.42s3.7-9.42 9.42-9.42c2.86 0 4.88 1.17 6.38 2.58l2.94-2.82C20.02 1.83 16.56 0 12.48 0 5.88 0 .81 5.4 .81 12s5.07 12 11.67 12c3.55 0 6.2-1.23 8.16-3.25 2.05-2.1 2.5-5.05 2.5-7.65 0-.67-.06-1.32-.18-1.95h-10.6z"/></svg>
);


export function LoginTabs() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<null | 'email' | 'google'>(null);
  const auth = getAuth(app);

  const { register: registerSignIn, handleSubmit: handleSignInSubmit, formState: { errors: signInErrors } } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const { register: registerSignUp, handleSubmit: handleSignUpSubmit, formState: { errors: signUpErrors } } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSignIn = async (data: SignInForm) => {
    setLoading('email');
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Sign In Failed', description: error.code, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const onSignUp = async (data: SignUpForm) => {
    setLoading('email');
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Sign Up Failed', description: error.code, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading('google');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        router.push('/dashboard');
    } catch (error: any) {
        toast({ title: 'Google Sign In Failed', description: error.code, variant: 'destructive' });
    } finally {
        setLoading(null);
    }
  }

  return (
    <Tabs defaultValue="sign-in" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-in">Sign In</TabsTrigger>
        <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignInSubmit(onSignIn)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input id="email-in" type="email" {...registerSignIn('email')} placeholder="m@example.com" />
                {signInErrors.email && <p className="text-xs text-destructive">{signInErrors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-in">Password</Label>
                <Input id="password-in" type="password" {...registerSignIn('password')} />
                {signInErrors.password && <p className="text-xs text-destructive">{signInErrors.password.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading === 'email'}>
                {loading === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="sign-up">
        <Card>
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>Enter your email and password to get started.</CardDescription>
          </CardHeader>
           <form onSubmit={handleSignUpSubmit(onSignUp)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" type="email" {...registerSignUp('email')} placeholder="m@example.com" />
                {signUpErrors.email && <p className="text-xs text-destructive">{signUpErrors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">Password</Label>
                <Input id="password-up" type="password" {...registerSignUp('password')} />
                 {signUpErrors.password && <p className="text-xs text-destructive">{signUpErrors.password.message}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="confirmPassword-up">Confirm Password</Label>
                <Input id="confirmPassword-up" type="password" {...registerSignUp('confirmPassword')} />
                 {signUpErrors.confirmPassword && <p className="text-xs text-destructive">{signUpErrors.confirmPassword.message}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading === 'email'}>
                {loading === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
       <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

       <Button variant="outline" className="w-full mt-6" onClick={handleGoogleSignIn} disabled={loading === 'google'}>
          {loading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Google
       </Button>
    </Tabs>
  );
}

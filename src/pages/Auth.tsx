import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Check, X, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import boxLogoDark from "@/assets/suggistit-box-logo.png";
import boxLogoLight from "@/assets/suggistit-logo-light.png";

// Common weak passwords to reject
const WEAK_PASSWORDS = [
  'password', 'password1', 'password123', 'password1234',
  '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'letmein', 'welcome',
  'admin123', 'login123', 'abc12345', 'iloveyou',
  'monkey123', 'dragon123', 'master123', 'hello123',
  'freedom1', 'whatever1', 'shadow123', 'sunshine1',
  'princess1', 'football1', 'baseball1', 'soccer123',
  'trustno1', 'passw0rd', 'p@ssword', 'p@ssw0rd'
];

const isWeakPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return WEAK_PASSWORDS.some(weak => 
    lowerPassword === weak || 
    lowerPassword.includes(weak) ||
    weak.includes(lowerPassword)
  );
};

const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character (!@#$%^&*...)')
    .refine((val) => !isWeakPassword(val), {
      message: 'This password is too common. Please choose a stronger password.'
    }),
  displayName: z.string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, and underscores')
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(1, 'Password is required')
});

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    { label: 'Not a common password', met: !isWeakPassword(password) },
  ], [password]);

  const metCount = requirements.filter(r => r.met).length;
  const strength = metCount <= 2 ? 'weak' : metCount <= 4 ? 'fair' : 'strong';
  const strengthColor = strength === 'weak' ? 'bg-red-500' : strength === 'fair' ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= metCount ? strengthColor : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {requirements.map((req, i) => (
          <div key={i} className={`flex items-center gap-1.5 ${req.met ? 'text-green-400' : 'text-zinc-500'}`}>
            {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === "dark";

  // Get safe redirect URL from query params
  const getSafeRedirectUrl = () => {
    const redirectTo = searchParams.get('redirect');
    if (!redirectTo) return '/';
    // Only allow relative URLs starting with / to prevent open redirect attacks
    const decoded = decodeURIComponent(redirectTo);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) {
      return decoded;
    }
    return '/';
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(getSafeRedirectUrl());
      }
    });
  }, [navigate, searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate sign-up form
        const validation = signUpSchema.safeParse({
          email,
          password,
          displayName
        });

        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast.error(firstError.message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${getSafeRedirectUrl()}`,
            data: {
              display_name: validation.data.displayName,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now sign in.");
        setIsSignUp(false);
      } else {
        // Validate sign-in form
        const validation = signInSchema.safeParse({
          email,
          password
        });

        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast.error(firstError.message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });
        if (error) throw error;
        toast.success("Signed in successfully!");
        navigate(getSafeRedirectUrl());
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-zinc-950' : 'bg-gradient-to-br from-orange-50 via-white to-orange-50'}`}>
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isDark ? (
          <>
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-200/40 rounded-full blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-100/50 rounded-full blur-[120px]" />
          </>
        )}
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and branding */}
        <div className="flex flex-col items-center mb-8">
          {isDark ? (
            <>
              <img src={boxLogoDark} alt="Suggistit" className="h-24 mb-4" />
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Suggistit
              </h1>
            </>
          ) : (
            <img src={boxLogoLight} alt="Suggistit" className="h-36" />
          )}
          <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            If you see something, Suggistit
          </p>
        </div>

        {/* Auth card */}
        <div className={`backdrop-blur-sm rounded-2xl p-8 shadow-2xl ${
          isDark 
            ? 'bg-zinc-900/80 border border-zinc-800' 
            : 'bg-white/80 border border-orange-100'
        }`}>
          <h2 className={`text-xl font-semibold text-center mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Your name"
                  className={`h-11 ${
                    isDark 
                      ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500' 
                      : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                  } focus:border-orange-500 focus:ring-orange-500/20`}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={`h-11 ${
                  isDark 
                    ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500' 
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                } focus:border-orange-500 focus:ring-orange-500/20`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={8}
                className={`h-11 ${
                  isDark 
                    ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500' 
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                } focus:border-orange-500 focus:ring-orange-500/20`}
              />
              {isSignUp && password && (
                <PasswordStrengthIndicator password={password} />
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className={`text-sm transition-colors ${isDark ? 'text-zinc-400 hover:text-orange-400' : 'text-zinc-500 hover:text-orange-600'}`}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-xs mt-6 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
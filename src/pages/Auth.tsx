import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { Check, X } from "lucide-react";
import logoBlack from "@/assets/suggistit-logo-black.png";

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
  const strengthColor = strength === 'weak' ? 'bg-destructive' : strength === 'fair' ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= metCount ? strengthColor : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {requirements.map((req, i) => (
          <div key={i} className={`flex items-center gap-1 ${req.met ? 'text-green-600' : 'text-muted-foreground'}`}>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

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
            emailRedirectTo: `${window.location.origin}/`,
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
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-6">
          <img src={logoBlack} alt="Suggistit" className="h-12" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
            />
            {isSignUp && password && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
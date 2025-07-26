'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

export default function SuperadminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetTime: number;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/superadmin/dashboard';

  // Check if already authenticated
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const response = await fetch('/api/superadmin/auth/session');
      if (response.ok) {
        // Already logged in, redirect to dashboard
        router.push(redirectTo);
      }
    } catch (error) {
      // Not logged in, stay on login page
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/superadmin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Check rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const resetTime = response.headers.get('X-RateLimit-Reset');
      
      if (remaining && resetTime) {
        setRateLimitInfo({
          remaining: parseInt(remaining),
          resetTime: parseInt(resetTime),
        });
      }

      if (response.ok) {
        const data = await response.json();
        // Successful login, redirect
        router.push(redirectTo);
      } else {
        const errorData = await response.json();
        
        if (response.status === 429) {
          const resetDate = new Date(parseInt(resetTime || '0'));
          setError(`Too many login attempts. Try again after ${resetDate.toLocaleTimeString()}`);
        } else {
          setError(errorData.error || 'Login failed');
        }
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Security Warning */}
        <Alert className="mb-6 border-amber-500 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Restricted Access:</strong> This is a secure administrative interface. 
            All access attempts are logged and monitored.
          </AlertDescription>
        </Alert>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Superadmin Access
            </CardTitle>
            <CardDescription className="text-slate-300">
              Sign in to the Mariana Platform administration panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-500 bg-red-50 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {rateLimitInfo && rateLimitInfo.remaining <= 2 && (
                <Alert className="border-amber-500 bg-amber-50 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: {rateLimitInfo.remaining} login attempts remaining
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  placeholder="admin@mariana-platform.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  placeholder="Enter your secure password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              <p>Secure connection established</p>
              <p className="mt-1">Session expires in 30 minutes</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>© 2024 Mariana Platform - Superadmin Interface</p>
          <p className="mt-1">Access is restricted and monitored</p>
        </div>
      </div>
    </div>
  );
}
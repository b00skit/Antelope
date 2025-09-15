
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isGtawLoading, setIsGtawLoading] = useState(false);
  const [gtawUrl, setGtawUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/auth/gtaw');
        if (res.ok) {
          const data = await res.json();
          if (data.enabled) {
            setGtawUrl(data.url);
          }
        }
      } catch {
        // Ignore errors and fall back to local auth
      }
    };
    fetchConfig();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      router.push('/dashboard');
      router.refresh(); // This will re-fetch server components and update the UI
    } else {
      const data = await response.json();
      setError(data.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const handleGtawLogin = () => {
    if (!gtawUrl) {
      setError('GTAW OAuth is not configured correctly.');
      return;
    }
    setIsGtawLoading(true);
    window.location.href = gtawUrl;
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {gtawUrl ? (
        <Button onClick={handleGtawLogin} className="w-full" disabled={isGtawLoading}>
          {isGtawLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Login with GTA:World
        </Button>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      )}
    </div>
  );
}

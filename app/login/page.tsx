'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { AlertCircle, LogIn } from 'lucide-react';
import { generateOAuthState, storeOAuthState, getGoogleAuthUrl, getMicrosoftAuthUrl } from '@/lib/auth/oauth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, clearError, isAuthenticated, checkAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Verificar se já está autenticado
  useEffect(() => {
    checkAuth().then((authenticated) => {
      if (authenticated) {
        router.push('/');
      }
    });
  }, [checkAuth, router]);

  // Check for OAuth errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_failed: 'Falha na autenticação com SSO. Tente novamente.',
        oauth_not_configured: 'SSO não está configurado no sistema.',
        missing_code: 'Código de autorização não recebido.',
        email_not_verified: 'Email não verificado. Por favor, verifique seu email.',
        account_inactive: 'Sua conta está inativa. Contate o administrador.',
        no_email: 'Email não fornecido pelo provedor SSO.',
      };
      setOauthError(errorMessages[errorParam] || 'Erro desconhecido ao fazer login com SSO.');
    }

    // Check for token in URL (from OAuth redirect)
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      router.push('/');
    }
  }, [searchParams, router]);

  // Mostrar erro
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      router.push('/');
    } catch (err) {
      // Erro já está no state
    }
  };

  const handleGoogleLogin = () => {
    const state = generateOAuthState();
    storeOAuthState(state);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    if (!clientId) {
      setOauthError('Google OAuth não está configurado.');
      return;
    }

    const authUrl = getGoogleAuthUrl({ clientId, clientSecret: '', redirectUri }, state);
    window.location.href = authUrl;
  };

  const handleMicrosoftLogin = () => {
    const state = generateOAuthState();
    storeOAuthState(state);

    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`;

    if (!clientId) {
      setOauthError('Microsoft OAuth não está configurado.');
      return;
    }

    const authUrl = getMicrosoftAuthUrl({ clientId, clientSecret: '', redirectUri }, state);
    window.location.href = authUrl;
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <LogIn className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Bem-vindo de volta
          </CardTitle>
          <CardDescription className="text-center">
            Faça login para acessar a plataforma
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {showError && error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {oauthError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle size={16} />
                <span>{oauthError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={18} className="mr-2" />
                  Entrar
                </>
              )}
            </Button>

            {/* SSO Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              )}

              {process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M13 1h10v10H13z" />
                    <path fill="#05a6f0" d="M1 13h10v10H1z" />
                    <path fill="#ffba08" d="M13 13h10v10H13z" />
                  </svg>
                  Microsoft
                </Button>
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Entre em contato com o administrador para criar uma conta
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

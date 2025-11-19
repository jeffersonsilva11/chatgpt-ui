'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, RefreshCw, LogOut } from 'lucide-react';

export default function PendingPage() {
  const router = useRouter();
  const { user, logout, loadUser, isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  // Polling para verificar se foi aprovado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Verificar a cada 10 segundos
    const interval = setInterval(async () => {
      await checkApprovalStatus();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [isAuthenticated, router]);

  const checkApprovalStatus = async () => {
    setIsChecking(true);
    try {
      await loadUser();

      // Se status mudou para 'active', redirecionar
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.status === 'active') {
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="h-8 w-8 text-warning animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-warning flex items-center justify-center">
                {isChecking ? (
                  <RefreshCw className="h-3 w-3 text-warning animate-spin" />
                ) : (
                  <Clock className="h-3 w-3 text-warning" />
                )}
              </div>
            </div>
          </div>

          <CardTitle className="text-2xl text-center">
            Aguardando Aprovação
          </CardTitle>
          <CardDescription className="text-center">
            Sua conta está sendo revisada pelo administrador
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Conta Criada</p>
                <p className="text-xs text-muted-foreground">
                  Seu login via SSO foi realizado com sucesso
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0 animate-pulse" />
              <div>
                <p className="font-medium text-sm">Aguardando Aprovação</p>
                <p className="text-xs text-muted-foreground">
                  Um administrador precisa aprovar seu acesso e atribuir os workflows
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                <Clock className="h-3 w-3" />
                Pendente
              </span>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-center text-muted-foreground">
              Esta página será atualizada automaticamente quando sua conta for aprovada.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={checkApprovalStatus}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Agora
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

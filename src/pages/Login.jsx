import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const { authError, isAuthenticated, isLoading, login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const loggedUser = await login(formData);

    if (loggedUser) {
      navigate(from, { replace: true });
    }
  };

  return (
    <main className="min-h-screen bg-background font-inter text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
          <img
            src="https://media.base44.com/images/public/69c135c57c9886fec79cebc5/6324de60d_logoclientes-8.png"
            alt="DGC"
            className="absolute left-10 top-8 h-14 object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-accent" />
          <div className="flex h-full flex-col justify-end px-10 pb-14">
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
                Control de Obras DGC
              </p>
              <h1 className="text-4xl font-semibold leading-tight">
                Acceso seguro para controlar avance, personal y restricciones.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-primary-foreground/70">
                Ingresa con tu correo y contraseña para acceder al sistema.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <img
                src="https://media.base44.com/images/public/69c135c57c9886fec79cebc5/6324de60d_logoclientes-8.png"
                alt="DGC"
                className="h-12 object-contain"
              />
              <div>
                <h1 className="text-base font-semibold">Control de Obras</h1>
                <p className="text-xs text-muted-foreground">Obra Eléctrica</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ingresa con tu correo y contraseña para continuar.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="h-11 pl-9"
                      placeholder="correo@dgc.cl"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      autoComplete="current-password"
                      className="h-11 px-9"
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                {authError?.type === 'invalid_credentials' && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {authError.message}
                  </div>
                )}

                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  <LogIn />
                  {isLoading ? 'Validando...' : 'Entrar'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
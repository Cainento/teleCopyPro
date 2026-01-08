import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

          <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 text-center shadow-2xl relative z-10">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-destructive/5 animate-pulse">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Algo deu errado</h1>
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado em nosso sistema.
              </p>
            </div>

            {this.state.error && (
              <div className="mb-6 text-left">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-2 select-none">
                    <span>Ver detalhes do erro</span>
                    <div className="h-px bg-border flex-1" />
                  </summary>
                  <pre className="text-xs font-mono bg-muted/50 p-4 rounded-xl overflow-auto max-h-40 border border-border/50 text-muted-foreground mt-2">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}

            <div className="grid gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Aplicação
              </button>

              <a
                href="/"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-muted/50 hover:bg-muted text-foreground rounded-xl transition-colors font-medium"
              >
                <Home className="h-4 w-4" />
                Voltar ao Início
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

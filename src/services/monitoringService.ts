import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

export function initializeMonitoring(app: App, router: Router) {
  // Só inicializa o Sentry em produção
  if (import.meta.env.PROD) {
    Sentry.init({
      app,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        // Habilita o rastreamento automático de performance com integração de router
        Sentry.browserTracingIntegration({ router }),
        // Habilita o rastreamento de replay (opcional)
        Sentry.replayIntegration()
      ],
      // Configurações de amostragem
      tracesSampleRate: 0.5,
      // Configuração opcional para replay (pode ser removido se não desejar esta funcionalidade)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
      beforeSend(event) {
        // Sanitizar dados pessoais se necessário
        return event;
      },
    });

    // Expõe o Sentry globalmente para diagnóstico
    window.Sentry = Sentry;
    console.info('[Monitoring] Sentry initialized successfully');
  } else {
    console.info('[Monitoring] Sentry disabled in development mode');
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('[Error Captured]', error, context);
  }
}

export function setUserContext(userData: {
  id?: string;
  email?: string;
  username?: string;
}) {
  if (import.meta.env.PROD) {
    Sentry.setUser(userData);
  }
}

export function clearUserContext() {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
}

import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { routes } from './app.routes';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

const config: SocketIoConfig = {
  url: 'http://localhost:3000/pedidos',
  options: {
    transports: ['websocket'],
    autoConnect: true
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideClientHydration(),
    // Importa SocketIoModule aquí
    ...SocketIoModule.forRoot(config).providers || []
  ]
};

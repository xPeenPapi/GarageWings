import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

export enum Role {
  SuperAdmin = 'SUPER_ADMIN',
  AdminEmpresa = 'ADMIN_EMPRESA',
  Gerente = 'GERENTE',
  Cajero = 'CAJA',
  Mesero = 'MESERO',
  Cocinero = 'COCINA',
  Barra = 'BARRA'
}

export interface UserData {
  id: number;
  nombre: string;
  email: string;
  rol: Role;
  empresaId: number;
  sucursalId: number;
}

interface LoginResponse {
  message?: string;
  access_token: string;
  user: UserData;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrl = 'http://localhost:3000/api'; 
  
  // BehaviorSubject inicia con el valor recuperado INMEDIATAMENTE
  private currentUserSubject: BehaviorSubject<UserData | null>;
  public currentUser$: Observable<UserData | null>;

  constructor(private http: HttpClient, private router: Router) {
    // ✅ CLAVE: Cargar usuario síncronamente ANTES de que nada más arranque
    const storedUser = this.getUserFromStorage();
    
    if (storedUser) {
      console.log('✅ Sesión recuperada correctamente:', storedUser.nombre);
    } else {
      console.warn('⚠️ No se encontró sesión guardada o estaba corrupta.');
    }

    // Inicializamos el Subject con el usuario (o null si no había)
    this.currentUserSubject = new BehaviorSubject<UserData | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  // --- LOGIN ---
  login(credentials: {email: string, password: string}): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(tap(res => {
          if (res && res.access_token) {
            this.saveToken(res.access_token);
            this.saveUser(res.user);
          }
        }));
  }

  // --- LOGOUT ---
  logout() {
    console.log('👋 Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('inicioTurno'); // Limpiamos turno de caja también
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // --- GETTERS (Síncronos para los Guards) ---
  
  get currentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): Role | null {
    return this.currentUser ? this.currentUser.rol : null;
  }

  getUserId(): number | null {
    return this.currentUser ? this.currentUser.id : null;
  }

  getNombreUsuario(): string {
    return this.currentUser ? this.currentUser.nombre : '';
  }

  // ✅ Verificación robusta: Solo es true si hay token Y usuario en memoria
  isAuthenticated(): boolean {
    const token = this.token;
    const user = this.currentUser;
    return !!token && !!user;
  }

  // --- STORAGE MANAGEMENT ---

  private saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  private saveUser(user: UserData) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // ✅ Recuperación segura: Si el JSON está roto, limpia y retorna null
  private getUserFromStorage(): UserData | null {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userStr && token) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('❌ Datos de sesión corruptos en LocalStorage. Limpiando...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  }
}
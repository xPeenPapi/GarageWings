import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

// ==========================================
// 1. ENUM DE ROLES (Debe coincidir con la BD)
// ==========================================
export enum Role {
  SuperAdmin = 'SUPER_ADMIN',
  AdminEmpresa = 'ADMIN_EMPRESA', // O 'ADMIN' si así está en tu BD
  Gerente = 'GERENTE',
  Cajero = 'CAJA',      // En BD suele guardarse como 'CAJA'
  Mesero = 'MESERO',
  Cocinero = 'COCINA',  // En BD suele guardarse como 'COCINA'
  Barra = 'BARRA'
}

// ==========================================
// 2. INTERFACES
// ==========================================
export interface UserData {
  id: number;
  nombre: string;
  email: string;
  rol: Role; // Usamos el Enum aquí para tipado estricto
  empresaId: number;
  sucursalId: number;
  sucursalNombre?: string; // Opcional, útil para el dashboard
}

interface LoginResponse {
  message?: string;
  access_token: string;
  user: UserData;
}

// ==========================================
// 3. SERVICIO
// ==========================================
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrl = 'http://localhost:3000/api'; 
  
  // BehaviorSubject para mantener el estado del usuario en toda la app
  private currentUserSubject: BehaviorSubject<UserData | null>;
  public currentUser$: Observable<UserData | null>;

  constructor(private http: HttpClient, private router: Router) {
    // ✅ RECUPERACIÓN SÍNCRONA AL INICIAR LA APP
    const storedUser = this.getUserFromStorage();
    
    if (storedUser) {
      console.log('✅ Sesión recuperada:', storedUser.nombre, '| Rol:', storedUser.rol);
    } else {
      console.warn('⚠️ No hay sesión activa.');
    }

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
    
    // Limpiezas opcionales de otros módulos
    localStorage.removeItem('inicioTurno'); 
    localStorage.removeItem('montoInicial');
    localStorage.removeItem('uniones_mesas'); 

    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // --- GETTERS (Síncronos para Guards y Componentes) ---
  
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

  // Verifica si está logueado (Token + Usuario en memoria)
  isAuthenticated(): boolean {
    const token = this.token;
    const user = this.currentUser;
    return !!token && !!user;
  }

  // --- STORAGE MANAGEMENT (Privados) ---

  private saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  private saveUser(user: UserData) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Recuperación segura con Try-Catch por si el JSON se rompe
  private getUserFromStorage(): UserData | null {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userStr && token) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('❌ Datos de sesión corruptos. Limpiando storage...');
        this.logout(); // Limpia todo si está corrupto
        return null;
      }
    }
    return null;
  }
}
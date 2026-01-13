import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';

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
  sucursalNombre?: string;
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
  private apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<UserData | null>;
  public currentUser$: Observable<UserData | null>;

  constructor(private http: HttpClient, private router: Router) {
    const storedUser = this.getUserFromStorage();
    
    if (storedUser) {
      console.log('✅ Sesión recuperada:', storedUser.nombre, '| Rol:', storedUser.rol, '| Sucursal:', storedUser.sucursalId);
    } else {
      console.warn('⚠️ No hay sesión activa.');
    }

    this.currentUserSubject = new BehaviorSubject<UserData | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(credentials: {email: string, password: string}): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(tap(res => {
          if (res && res.access_token) {
            console.log('📥 Datos recibidos del backend:', res.user);
            this.saveToken(res.access_token);
            this.saveUser(res.user);
          }
        }));
  }

  logout() {
    console.log('👋 Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('inicioTurno'); 
    localStorage.removeItem('montoInicial');
    localStorage.removeItem('uniones_mesas'); 

    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

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

  // ✅ NUEVO: Obtener sucursalId del usuario actual
  getSucursalId(): number | null {
    return this.currentUser ? this.currentUser.sucursalId : null;
  }

  // ✅ NUEVO: Obtener nombre de sucursal del usuario actual
  getSucursalNombre(): string {
    return this.currentUser?.sucursalNombre || 'Sin Sucursal';
  }

  isAuthenticated(): boolean {
    const token = this.token;
    const user = this.currentUser;
    return !!token && !!user;
  }

  private saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  private saveUser(user: UserData) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
    console.log('💾 Usuario guardado en localStorage:', user);
  }

  private getUserFromStorage(): UserData | null {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userStr && token) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('❌ Datos de sesión corruptos. Limpiando storage...');
        this.logout();
        return null;
      }
    }
    return null;
  }
}
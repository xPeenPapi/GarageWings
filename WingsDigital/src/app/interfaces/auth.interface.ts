export interface LoginRequest {
  email: string; // Ojo: Antes usabas 'username', ahora el backend espera 'email'
  password: string;
}

export interface UserData {
  id: number;
  nombre: string;
  email: string;
  rol: 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'GERENTE' | 'CAJA' | 'MESERO' | 'COCINA' | 'BARRA';
  empresaId: number;
  sucursalId: number | null;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: UserData;
}
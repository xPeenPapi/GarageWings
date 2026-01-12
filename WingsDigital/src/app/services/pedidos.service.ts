
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrdenBackend } from '../models/api-models'; // Asegúrate de tener este modelo o quita el tipo si da error
import { environment } from '../../environments/environment';


export interface CreatePedidoDto {
  mesa_id: number | null;
  empleado_id: number;
  items: Array<{
    producto_id: number;
    cantidad: number;
    precio_item: number;
    notas?: string | null;
    opcionesElegidas?: any;
  }>;
  comensales?: number;
  // ✅ ACTUALIZADO: Soportamos ambos nombres para evitar errores
  nota_general?: string; 
  notaGeneral?: string; 
  mesero_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  
  private apiUrl = `${environment.apiUrl}/pedidos`; // ✅ ACTUALIZADO

  constructor(private http: HttpClient) {}

  // ✅ HELPER: Genera los headers con el Token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ==========================================
  // 1. CREACIÓN
  // ==========================================

  crearPedido(dto: CreatePedidoDto): Observable<any> {
    // console.log('📤 Enviando pedido:', dto);
    return this.http.post(`${this.apiUrl}`, dto, { headers: this.getHeaders() });
  }

  // ✅ ALIAS (Para compatibilidad con tu código antiguo)
  crearOrden(dto: CreatePedidoDto): Observable<any> {
    return this.crearPedido(dto);
  }

  // ==========================================
  // 2. CONSULTAS
  // ==========================================

  // Para Cocina y Barra (Solo pendientes)
  getPedidosPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pendientes`, { headers: this.getHeaders() });
  }

  // ✅ ALIAS (Para compatibilidad)
  obtenerPendientes(): Observable<any[]> {
    return this.getPedidosPendientes();
  }

  // 🔥 Para la Caja (Trae todo lo del día para el F5)
  obtenerOrdenesDelDia(): Observable<OrdenBackend[]> {
    return this.http.get<OrdenBackend[]>(`${this.apiUrl}/dia`, { headers: this.getHeaders() });
  }

  getOrdenesPorMesa(mesaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesa/${mesaId}`, { headers: this.getHeaders() });
  }

  getOrden(ordenId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${ordenId}`, { headers: this.getHeaders() });
  }

  // ✅ CORREGIDO: Faltaban los headers en esta función
  getPedidosPorMesa(mesaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesa/${mesaId}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // 3. ACCIONES (Estados / Pagos)
  // ==========================================

  actualizarEstado(ordenId: number, nuevoEstado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${ordenId}/estado`, { estado: nuevoEstado }, { headers: this.getHeaders() });
  }

  solicitarCuenta(ordenId: number): Observable<any> {
    // Apuntamos a la ruta correcta del backend para solicitar cuenta
    return this.http.patch(`${this.apiUrl}/${ordenId}/solicitar-cuenta`, {}, { headers: this.getHeaders() });
  }

  finalizarOrden(ordenId: number, datosPago: any = {}): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${ordenId}/finalizar`, datosPago, { headers: this.getHeaders() });
  }

  cancelarOrden(ordenId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${ordenId}/cancelar`, {}, { headers: this.getHeaders() });
  }
}
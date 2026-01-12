import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ✅ INTERFAZ ACTUALIZADA
export interface CreatePedidoDto {
  mesa_id: number | null;
  empleado_id: number;
  orden_id?: number | null; // Agregado para soportar agregar a orden existente
  items: Array<{
    producto_id: number;
    cantidad: number;
    precio_item: number;
    notas?: string | null;
    opcionesElegidas?: any;
    destino?: string; // ✅ NUEVO: 'COCINA' o 'BARRA'
  }>;
  comensales?: number;
  nota_general?: string; 
  notaGeneral?: string; 
  mesero_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  
  private apiUrl = `${environment.apiUrl}/pedidos`; 

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
    return this.http.post(`${this.apiUrl}`, dto, { headers: this.getHeaders() });
  }

  // ALIAS (Compatibilidad)
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

  // ALIAS
  obtenerPendientes(): Observable<any[]> {
    return this.getPedidosPendientes();
  }

  // Para la Caja (Trae todo lo del día/por cobrar)
  obtenerOrdenesCaja(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/caja`, { headers: this.getHeaders() });
  }
  
  // ALIAS para compatibilidad con código anterior si usabas obtenerOrdenesDelDia
  obtenerOrdenesDelDia(): Observable<any[]> {
    return this.obtenerOrdenesCaja();
  }

  getOrdenesPorMesa(mesaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesa/${mesaId}`, { headers: this.getHeaders() });
  }

  getOrden(ordenId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${ordenId}`, { headers: this.getHeaders() });
  }

  getPedidosPorMesa(mesaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesa/${mesaId}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // 3. ACCIONES (Estados / Pagos)
  // ==========================================

  // Actualizar estado GENERAL de la orden (PENDIENTE -> LISTA -> ENTREGADA)
  actualizarEstado(ordenId: number, nuevoEstado: string): Observable<any> {
    // Nota: Se envía a la raíz ID, el backend decide qué hacer con el body { estado: ... }
    return this.http.patch(`${this.apiUrl}/${ordenId}`, { estado: nuevoEstado }, { headers: this.getHeaders() });  }

  // ✅ MÉTODO FALTANTE AGREGADO: Actualizar estado de UN ITEM (Platillo individual)
  // Esto es lo que permite que el checkmark funcione item por item y notifique a cocina
  actualizarEstadoItem(itemId: number, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/items/${itemId}`, { estado }, { headers: this.getHeaders() });
  }

  solicitarCuenta(ordenId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${ordenId}/cuenta`, {}, { headers: this.getHeaders() });
  }

  finalizarOrden(ordenId: number, datosPago: any = {}): Observable<any> {
    return this.http.post(`${this.apiUrl}/${ordenId}/finalizar`, datosPago, { headers: this.getHeaders() });
  }

  cancelarOrden(ordenId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${ordenId}`, { headers: this.getHeaders() });
  }
}
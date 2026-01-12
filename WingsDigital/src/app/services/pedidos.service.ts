// pedidos.service.ts (FRONTEND) - VERSIÓN FINAL CON TODAS LAS CORRECCIONES

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreatePedidoDto {
  mesa_id?: number;
  empleado_id: number;
  mesero_id?: number;
  items: any[];
  comensales?: number;
  notaGeneral?: string;
  nota_general?: string;
  orden_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private apiUrl = `${environment.apiUrl}/pedidos`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ========================================
  // MÉTODOS DE CREACIÓN
  // ========================================

  crearPedido(pedido: CreatePedidoDto): Observable<any> {
    console.log('📤 Enviando pedido al backend:', pedido);
    return this.http.post(this.apiUrl, pedido, { headers: this.getHeaders() });
  }

  crearOrden(pedido: CreatePedidoDto): Observable<any> {
    return this.crearPedido(pedido);
  }

  // ========================================
  // MÉTODOS DE CONSULTA
  // ========================================

  obtenerPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pendientes`, { headers: this.getHeaders() });
  }

  getPedidosPorMesa(mesaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesa/${mesaId}`, { headers: this.getHeaders() });
  }

  getOrden(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  obtenerOrdenesDelDia(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dia`, { headers: this.getHeaders() });
  }

  // ========================================
  // MÉTODOS DE ACTUALIZACIÓN DE ORDEN
  // ========================================

  /**
   * ✅ CORREGIDO: Actualiza el estado de una orden completa
   * Usa la ruta /pedidos/:id/estado para evitar conflictos 404
   */
  actualizarEstado(id: number, estado: string): Observable<any> {
    console.log(`📡 Actualizando orden ${id} a estado: ${estado}`);
    return this.http.patch(
      `${this.apiUrl}/${id}/estado`, 
      { estado },
      { headers: this.getHeaders() }
    );
  }

  /**
   * ✅ NUEVO: Actualiza el estado de un item individual (para Cocina/Barra)
   * Usa la ruta /pedidos/items/:itemId
   */
  actualizarEstadoItem(itemId: number, estado: string): Observable<any> {
    console.log(`📡 Actualizando item ${itemId} a estado: ${estado}`);
    return this.http.patch(
      `${this.apiUrl}/items/${itemId}`, 
      { estado },
      { headers: this.getHeaders() }
    );
  }

  // ========================================
  // MÉTODOS DE CUENTA Y PAGO
  // ========================================

  /**
   * ✅ CORREGIDO: Solicita la cuenta de una orden
   * Usa la ruta /pedidos/:id/solicitar-cuenta
   */
  solicitarCuenta(id: number): Observable<any> {
    console.log(`📡 Solicitando cuenta para orden ${id}`);
    return this.http.patch(
      `${this.apiUrl}/${id}/solicitar-cuenta`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Finaliza una orden con datos de pago
   */
  finalizarOrden(id: number, datosPago: any): Observable<any> {
    console.log(`📡 Finalizando orden ${id} con pago:`, datosPago);
    return this.http.patch(
      `${this.apiUrl}/${id}/finalizar`,
      datosPago,
      { headers: this.getHeaders() }
    );
  }

  // ========================================
  // MÉTODOS DE CANCELACIÓN
  // ========================================

  /**
   * Cancela una orden
   */
  cancelarOrden(id: number): Observable<any> {
    console.log(`📡 Cancelando orden ${id}`);
    return this.http.patch(
      `${this.apiUrl}/${id}/cancelar`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
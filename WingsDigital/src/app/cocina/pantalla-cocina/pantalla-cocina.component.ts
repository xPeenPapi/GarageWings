import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pantalla-cocina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-cocina.component.html',
  styleUrls: ['./pantalla-cocina.component.css']
})
export class PantallaCocinaComponent implements OnInit, OnDestroy {

  public nuevosPedidos: any[] = [];
  public preparandoPedidos: any[] = [];
  public listosPedidos: any[] = [];

  public iconos = {
    nuevos: 'fas fa-bell',
    preparando: 'fas fa-fire',
    listos: 'fas fa-check-circle'
  };

  private intervalId: any;
  private apiUrl = 'http://localhost:3000/api/pedidos'; 

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.cargarPedidos();
    this.intervalId = setInterval(() => {
      this.cargarPedidos();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  cargarPedidos() {
    this.http.get<any[]>(`${this.apiUrl}/pendientes`).subscribe({
      next: (data) => {
        const nuevos: any[] = [];
        const preparando: any[] = [];
        const listos: any[] = [];

        data.forEach(orden => {
          // Solo mostramos PENDIENTE (ignoramos POR_COBRAR)
          if (orden.estado === 'PENDIENTE') {
            nuevos.push(orden);
          } 
          else if (orden.estado === 'EN_PROCESO' || orden.estado === 'EN_PREPARACION') {
            preparando.push(orden);
          } 
          else if (orden.estado === 'LISTA') {
            listos.push(orden);
          }
          // ENTREGADA ya no se muestra aquí
        });

        this.nuevosPedidos = nuevos;
        this.preparandoPedidos = preparando;
        this.listosPedidos = listos;
      },
      error: (err) => console.error('Error API Cocina:', err)
    });
  }

  marcarComoPreparando(pedido: any) { 
    this.actualizarEstadoBackend(pedido.id, 'EN_PREPARACION'); 
  }

  marcarComoListo(pedido: any) { 
    this.actualizarEstadoBackend(pedido.id, 'LISTA'); 
  }

  // ✅ NUEVA FUNCIÓN: Permite al cocinero limpiar la pantalla
  entregarPedido(pedido: any) {
    this.actualizarEstadoBackend(pedido.id, 'ENTREGADA');
  }

  private actualizarEstadoBackend(id: number, nuevoEstado: string) {
    this.http.patch(`${this.apiUrl}/${id}/estado`, { estado: nuevoEstado }).subscribe({
      next: () => this.cargarPedidos(),
      error: (err) => console.error(err)
    });
  }

  formatearOpcion(valor: any): string {
    if (Array.isArray(valor)) return valor.join(', ');
    return String(valor);
  }
}
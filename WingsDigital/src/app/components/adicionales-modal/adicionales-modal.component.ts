import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faMinus, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

// Interfaz para definir la estructura de un adicional
export interface Adicional {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

@Component({
  selector: 'app-adicionales-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './adicionales-modal.component.html',
  styleUrls: ['./adicionales-modal.component.css']
})
export class AdicionalesModalComponent implements OnInit {
  // Recibe los adicionales que ya están en el pedido para pre-cargarlos
  @Input() adicionalesPrevios: Adicional[] = [];
  
  // Emite los adicionales seleccionados o una señal de cancelación
  @Output() confirmar = new EventEmitter<Adicional[]>();
  @Output() cancelar = new EventEmitter<void>();

  // Lista completa de adicionales disponibles
  public listaAdicionales: Adicional[] = [
    { id: 101, nombre: 'Salsa de Soja', precio: 20, cantidad: 0 },
    { id: 102, nombre: 'Wasabi Extra', precio: 25, cantidad: 0 },
    { id: 103, nombre: 'Jengibre Encurtido', precio: 17, cantidad: 0 },
    { id: 104, nombre: 'Salsa de Anguila', precio: 30, cantidad: 0 },
    { id: 105, nombre: 'Semillas de Ajonjoli', precio: 15, cantidad: 0 }
  ];

  public adicionalesSeleccionados: Adicional[] = [];
  public totalAdicional: number = 0;

  // Iconos
  faPlus = faPlus;
  faMinus = faMinus;
  faMoneyBill = faMoneyBillWave;

  ngOnInit(): void {
    // Si se reciben adicionales previos, se actualizan las cantidades
    this.adicionalesPrevios.forEach(previo => {
      const adicional = this.listaAdicionales.find(a => a.id === previo.id);
      if (adicional) {
        adicional.cantidad = previo.cantidad;
      }
    });
    this.calcularTotales();
  }

  // Incrementa la cantidad de un adicional
  incrementar(adicional: Adicional): void {
    adicional.cantidad++;
    this.calcularTotales();
  }

  // Decrementa la cantidad, con un mínimo de 0
  decrementar(adicional: Adicional): void {
    if (adicional.cantidad > 0) {
      adicional.cantidad--;
      this.calcularTotales();
    }
  }

  // Calcula el resumen y el total
  calcularTotales(): void {
    this.adicionalesSeleccionados = this.listaAdicionales.filter(a => a.cantidad > 0);
    this.totalAdicional = this.adicionalesSeleccionados.reduce((total, item) => {
      return total + (item.precio * item.cantidad);
    }, 0);
  }

  // Emite los adicionales seleccionados y cierra el modal
  onConfirmar(): void {
    this.confirmar.emit(this.adicionalesSeleccionados);
  }

  // Emite el evento de cancelación
  onCancelar(): void {
    this.cancelar.emit();
  }
}
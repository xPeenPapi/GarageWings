import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faMinus, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { ProductosService, Producto } from '../../services/productos.service';

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
  @Input() adicionalesPrevios: Adicional[] = [];
  @Output() confirmar = new EventEmitter<Adicional[]>();
  @Output() cancelar = new EventEmitter<void>();

  // ✅ CAMBIO: Ya no hardcodeamos, cargamos desde BD
  public listaAdicionales: Adicional[] = [];
  public adicionalesSeleccionados: Adicional[] = [];
  public totalAdicional: number = 0;
  public cargando: boolean = true;

  // Iconos
  faPlus = faPlus;
  faMinus = faMinus;
  faMoneyBill = faMoneyBillWave;

  constructor(private productosService: ProductosService) {}

  ngOnInit(): void {
    // ✅ Cargar adicionales desde el backend
    this.productosService.getAdicionales().subscribe({
      next: (adicionales) => {
        console.log('✅ Adicionales cargados:', adicionales);
        
        this.listaAdicionales = adicionales.map(a => ({
          id: a.id,
          nombre: a.nombre,
          precio: Number(a.precioBase),
          cantidad: 0
        }));

        // Si había adicionales previos, restaurar las cantidades
        this.adicionalesPrevios.forEach(previo => {
          const adicional = this.listaAdicionales.find(a => a.id === previo.id);
          if (adicional) {
            adicional.cantidad = previo.cantidad;
          }
        });

        this.calcularTotales();
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error cargando adicionales:', err);
        alert('Error al cargar adicionales. Intenta de nuevo.');
        this.cargando = false;
      }
    });
  }

  incrementar(adicional: Adicional): void {
    adicional.cantidad++;
    this.calcularTotales();
  }

  decrementar(adicional: Adicional): void {
    if (adicional.cantidad > 0) {
      adicional.cantidad--;
      this.calcularTotales();
    }
  }

  calcularTotales(): void {
    this.adicionalesSeleccionados = this.listaAdicionales.filter(a => a.cantidad > 0);
    this.totalAdicional = this.adicionalesSeleccionados.reduce((total, item) => {
      return total + (item.precio * item.cantidad);
    }, 0);
  }

  onConfirmar(): void {
    if (this.adicionalesSeleccionados.length === 0) {
      alert('Selecciona al menos un adicional');
      return;
    }
    this.confirmar.emit(this.adicionalesSeleccionados);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
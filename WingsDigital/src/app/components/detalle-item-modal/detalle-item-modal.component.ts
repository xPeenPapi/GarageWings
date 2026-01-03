import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Producto, OpcionPersonalizacion } from '../../services/productos.service'; 

@Component({
  selector: 'app-detalle-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-item-modal.component.html',
  styleUrls: ['./detalle-item-modal.component.css']
})
export class DetalleItemModalComponent implements OnChanges {
  
  @Input() producto: Producto | null = null;
  @Input() mostrar: boolean = false;
  
  @Output() confirmar = new EventEmitter<Producto>();
  @Output() cerrar = new EventEmitter<void>();

  cantidad: number = 1;
  notas: string = '';
  precioTotal: number = 0;
  
  opcionesSeleccionadas: { [key: string]: any } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['producto'] && this.producto) {
      this.resetearFormulario();
    }
  }

  resetearFormulario() {
    this.cantidad = 1;
    this.notas = '';
    this.opcionesSeleccionadas = {};
    
    if (this.producto && this.producto.configuracion) {
        this.producto.configuracion.forEach(grupo => {
            if (grupo.tipo === 'checkbox') {
                this.opcionesSeleccionadas[grupo.titulo] = [];
            }
        });
    }
    
    this.calcularPrecio();
  }

  aumentar() { this.cantidad++; this.calcularPrecio(); }
  
  disminuir() { 
    if (this.cantidad > 1) {
      this.cantidad--; 
      this.calcularPrecio();
    }
  }

  onOpcionChange(grupo: string, opcion: string, tipo: string, event: any) {
    if (tipo === 'radio') {
      this.opcionesSeleccionadas[grupo] = opcion;
    } else if (tipo === 'checkbox') {
      const checked = event.target.checked;
      if (!this.opcionesSeleccionadas[grupo]) {
        this.opcionesSeleccionadas[grupo] = [];
      }
      
      if (checked) {
        this.opcionesSeleccionadas[grupo].push(opcion);
      } else {
        this.opcionesSeleccionadas[grupo] = this.opcionesSeleccionadas[grupo]
          .filter((o: string) => o !== opcion);
      }
    }
    this.calcularPrecio();
  }

  // ✅ AQUÍ ESTABA EL ERROR MATEMÁTICO
  calcularPrecio() {
    if (!this.producto) return;

    // 1. Forzamos que el precio base sea un Número
    let precioBase = Number(this.producto.precioBase) || 0;
    let costoExtras = 0;

    if (this.producto.configuracion) {
      this.producto.configuracion.forEach((grupo: OpcionPersonalizacion) => {
        const seleccionUsuario = this.opcionesSeleccionadas[grupo.titulo];

        if (grupo.tipo === 'radio' && seleccionUsuario) {
          const opEncontrada = grupo.opciones.find((op: {nombre: string, precio: number}) => op.nombre === seleccionUsuario);
          if (opEncontrada) {
            // 2. Forzamos que el precio extra sea un Número
            costoExtras += Number(opEncontrada.precio);
          }
        } 
        else if (grupo.tipo === 'checkbox' && Array.isArray(seleccionUsuario)) {
          seleccionUsuario.forEach((selNombre: string) => {
             const opEncontrada = grupo.opciones.find((op: {nombre: string, precio: number}) => op.nombre === selNombre);
             if (opEncontrada) {
               // 3. Forzamos que el precio extra sea un Número
               costoExtras += Number(opEncontrada.precio);
             }
          });
        }
      });
    }

    // Ahora la suma es matemática: 185 + 0 = 185. (Antes era "185" + 0 = "1850")
    this.precioTotal = (precioBase + costoExtras) * this.cantidad;
  }

  confirmarSeleccion() {
    if (!this.producto) return;

    // Validar obligatorios
    if (this.producto.configuracion) {
        for (const grupo of this.producto.configuracion) {
            if (grupo.obligatorio) {
                const seleccion = this.opcionesSeleccionadas[grupo.titulo];
                if (!seleccion || (Array.isArray(seleccion) && seleccion.length === 0)) {
                    alert(`Debes seleccionar una opción para: ${grupo.titulo}`);
                    return;
                }
            }
        }
    }

    const itemParaCarrito: Producto = {
      ...this.producto,
      cantidad: this.cantidad,
      notas: this.notas,
      opcionesElegidas: { ...this.opcionesSeleccionadas },
      precio: this.precioTotal / this.cantidad 
    };

    this.confirmar.emit(itemParaCarrito);
  }

  cerrarModal() {
    this.cerrar.emit();
  }
}
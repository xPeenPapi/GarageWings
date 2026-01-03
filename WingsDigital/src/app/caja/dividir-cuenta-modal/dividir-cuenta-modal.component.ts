import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes, faUserPlus, faTrash, faScissors } from '@fortawesome/free-solid-svg-icons';
import { Orden } from '../pagar/pagar.component';

export interface ProductoSplit {
  nombre: string;
  precio: number;
  cantidadOriginal: number;
  cantidadDisponible: number;
}

export interface ClienteCuenta {
  idTemp: number;
  nombre: string;
  items: { nombre: string; precio: number; cantidad: number }[];
  total: number;
  pagado: boolean;
}

@Component({
  selector: 'app-dividir-cuenta-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, FormsModule],
  templateUrl: './dividir-cuenta-modal.component.html',
  styleUrls: ['./dividir-cuenta-modal.component.css']
})
export class DividirCuentaModalComponent implements OnInit {
  @Input() orden!: Orden;
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<ClienteCuenta[]>();

  iconos = { cerrar: faTimes, agregar: faUserPlus, borrar: faTrash, confirmar: faScissors };

  productosDisponibles: ProductoSplit[] = [];
  clientes: ClienteCuenta[] = [];

  totalAsignado = 0;
  totalRestante = 0;

  // Variables para input de nombre
  creandoCliente = false;
  nombreNuevoCliente = '';

  ngOnInit(): void {
    if (this.orden) {
      this.productosDisponibles = this.orden.items.map(item => ({
        nombre: item.nombre,
        precio: item.precioUnitario,
        cantidadOriginal: item.cantidad,
        cantidadDisponible: item.cantidad
      }));
      this.calcularTotales();
    }
  }

  // VALIDACIÓN: ¿Quedan productos por asignar?
  get hayItemsDisponibles(): boolean {
    return this.productosDisponibles.some(p => p.cantidadDisponible > 0);
  }

  activarCrearCliente() {
    if (!this.hayItemsDisponibles) {
      // Opcional: Mostrar un mensaje pequeño o simplemente no hacer nada
      return; 
    }
    this.creandoCliente = true;
    this.nombreNuevoCliente = `Cliente ${this.clientes.length + 1}`;
  }

  confirmarCliente() {
    if (this.nombreNuevoCliente.trim()) {
      this.clientes.push({
        idTemp: Date.now(),
        nombre: this.nombreNuevoCliente,
        items: [],
        total: 0,
        pagado: false
      });
      this.creandoCliente = false;
      this.nombreNuevoCliente = '';
    }
  }

  asignarProducto(producto: ProductoSplit, clienteIndex: number) {
    if (producto.cantidadDisponible > 0) {
      const cliente = this.clientes[clienteIndex];
      const itemExistente = cliente.items.find(i => i.nombre === producto.nombre);
      
      if (itemExistente) {
        itemExistente.cantidad++;
      } else {
        cliente.items.push({ 
          nombre: producto.nombre, 
          precio: producto.precio, 
          cantidad: 1 
        });
      }
      producto.cantidadDisponible--;
      this.calcularTotales();
    }
  }

  removerItemDeCliente(clienteIndex: number, itemIndex: number) {
    const cliente = this.clientes[clienteIndex];
    const item = cliente.items[itemIndex];
    
    const prodDisponible = this.productosDisponibles.find(p => p.nombre === item.nombre);
    if (prodDisponible) {
      prodDisponible.cantidadDisponible++;
    }

    item.cantidad--;
    if (item.cantidad === 0) {
      cliente.items.splice(itemIndex, 1);
    }
    this.calcularTotales();
  }

  calcularTotales() {
    this.totalAsignado = 0;
    this.clientes.forEach(c => {
      c.total = c.items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
      this.totalAsignado += c.total;
    });
    // Ajuste por decimales
    this.totalRestante = Math.max(0, this.orden.total - this.totalAsignado);
  }

  confirmarDivision() {
    this.confirmar.emit(this.clientes);
  }
}
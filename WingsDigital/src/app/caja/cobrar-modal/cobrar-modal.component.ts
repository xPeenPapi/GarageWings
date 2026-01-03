import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-cobrar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './cobrar-modal.component.html',
  styleUrls: ['./cobrar-modal.component.css']
})
export class CobrarModalComponent implements OnChanges {
  @Input() orden: any;
  @Output() confirmar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  iconos = { user: faUser }; // Agrega los iconos que necesites

  metodoPago = 'Efectivo';
  propinaMonto: number = 0;
  propinaPorcentaje: number = 0;
  
  // ✅ NUEVO: Variable para el dinero recibido
  montoRecibido: number | null = null; 

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orden']) {
      this.resetData();
    }
  }

  resetData() {
    this.propinaMonto = 0;
    this.propinaPorcentaje = 0;
    this.metodoPago = 'Efectivo';
    this.montoRecibido = null; // Reiniciar recibido
  }

  setPropina(porcentaje: number) {
    this.propinaPorcentaje = porcentaje;
    if (this.orden) {
      this.propinaMonto = Number((this.orden.total * (porcentaje / 100)).toFixed(2));
    }
  }

  onPropinaManualChange() {
    this.propinaPorcentaje = 0; 
  }

  get totalFinal(): number {
    return (this.orden?.total || 0) + (this.propinaMonto || 0);
  }

  // ✅ NUEVO: Cálculo automático del cambio
  get cambio(): number {
    const recibido = this.montoRecibido || 0;
    return recibido - this.totalFinal;
  }

  onConfirmar() {
    if (!this.orden || this.orden.total < 0) return;
    
    // Validación extra de seguridad
    if (this.metodoPago === 'Efectivo' && this.cambio < 0) {
      alert('El monto recibido es insuficiente.');
      return;
    }
    
    this.confirmar.emit({
      totalPagado: this.orden.total, 
      propina: this.propinaMonto,
      metodo: this.metodoPago,
      // Opcional: podrías enviar cuánto se recibió para el ticket
      recibido: this.montoRecibido, 
      cambio: this.cambio
    });
  }
}
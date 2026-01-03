import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUtensils, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export interface Order{
  items:{
    nombre: string;
    cantidad: number;
    precio: number;
  }[];
  total: number;
}

@Component({
  selector: 'app-enviar-cocina-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './enviar-cocina-modal.component.html',
  styleUrls: ['./enviar-cocina-modal.component.css']
})
export class EnviarCocinaModalComponent {

  @Input() orden: Order | null = null;
  // aqui emite eventos para notificar la accion del usuario
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  iconoChef = faUtensils;
  iconoAlerta = faExclamationTriangle;

  
  
  onConfirmar(): void {
    console.log('Pedido confirmado y enviado a cocina.');
    this.confirmar.emit();
  }

  
  onCancelar(): void {
    console.log('Envio a cocina cancelado.');
    this.cancelar.emit();
  }
}
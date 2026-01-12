import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'pedidos', // ⚠️ IMPORTANTE: El frontend debe conectar a /pedidos
  cors: {
    origin: true, 
    credentials: true
  },
})
export class PedidosGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server;

  private logger = new Logger('PedidosGateway');

  // 🧠 MEMORIA RAM: Mapa de usuarios conectados { userId (NUMBER) : socketId (STRING) }
  private connectedUsers = new Map<number, string>();

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket de Pedidos listo y blindado');
  }

  handleConnection(client: Socket) {
    // Solo log básico, la lógica real ocurre en 'registrar-usuario'
  }

  handleDisconnect(client: Socket) {
    // Buscamos si este socket pertenecía a alguien y lo borramos
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.logger.log(`❌ Usuario ID ${userId} se desconectó (Socket: ${socketId})`);
        break;
      }
    }
  }

  // ==========================================
  // 1. GESTIÓN DE SESIÓN ÚNICA (Seguridad)
  // ==========================================
  @SubscribeMessage('registrar-usuario')
  registrarUsuario(
    @ConnectedSocket() client: Socket, 
    @MessageBody() userId: any // Recibimos 'any' para manejar string o number
  ) {
    // 1. FORZAR A NÚMERO (Esto arregla el error de tipos String vs Number)
    const idNumerico = Number(userId);

    if (isNaN(idNumerico) || idNumerico === 0) {
        this.logger.warn(`⚠️ Intento de registro con ID inválido: ${userId}`);
        return;
    }

    this.logger.log(`🔐 Verificando sesión para Usuario ID: ${idNumerico} (Nuevo Socket: ${client.id})`);

    // 2. BUSCAR SESIÓN ANTERIOR
    const socketIdAnterior = this.connectedUsers.get(idNumerico);

    if (socketIdAnterior) {
      // Caso A: Es el mismo socket (ej. reconexión rápida de internet), no hacemos nada malo
      if (socketIdAnterior === client.id) {
        this.logger.log(`ℹ️ El usuario ${idNumerico} refrescó conexión en el mismo socket.`);
        return;
      }

      // Caso B: Es un socket diferente (otra pestaña/navegador) -> EXPULSAR
      this.logger.warn(`🚨 DUPLICADO DETECTADO: Usuario ${idNumerico} ya estaba en ${socketIdAnterior}. EXPULSANDO...`);
      
      // Enviamos la orden de salida al socket viejo
      this.server.to(socketIdAnterior).emit('force-logout');
    } else {
      this.logger.log(`✅ Primera sesión activa para Usuario ${idNumerico}`);
    }

    // 3. GUARDAR LA NUEVA SESIÓN COMO LA OFICIAL
    this.connectedUsers.set(idNumerico, client.id);
  }

  // ==========================================
  // 2. GESTIÓN DE PEDIDOS (Cocina/Barra/Caja)
  // ==========================================
  
  // Método puente llamado desde el Controller para Cocina y Meseros
  notificarNuevoPedido(orden: any) {
    this.logger.log(`📢 EMITIENDO 'nuevoPedido' para orden #${orden.id}`);
    this.server.emit('nuevoPedido', orden);
  }

  // ✅ MÉTODO AGREGADO: Notificar a Caja que alguien pidió la cuenta
  notificarPedidoParaCobrar(orden: any) {
    this.logger.log(`💸 EMITIENDO 'pedidoParaCobrar' para orden #${orden.id}`);
    this.server.emit('pedidoParaCobrar', orden);
  }

  @SubscribeMessage('pedidoListo')
  handlePedidoListo(@MessageBody() data: { ordenId: number }) {
    this.logger.log(`✅ Cocina marcó orden #${data.ordenId} como LISTA`);
    this.server.emit('listoParaCobrar', data);
  }

  // ==========================================
  // 3. BLOQUEO DE MESAS (Concurrencia)
  // ==========================================

  @SubscribeMessage('bloquear-mesa')
  handleBloquearMesa(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mesaId: number, usuario: string }
  ) {
    // Reenviamos a todos MENOS al que emitió (broadcast)
    client.broadcast.emit('mesa-bloqueada', data);
  }

  @SubscribeMessage('desbloquear-mesa')
  handleDesbloquearMesa(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mesaId: number }
  ) {
    client.broadcast.emit('mesa-desbloqueada', data);
  }
}
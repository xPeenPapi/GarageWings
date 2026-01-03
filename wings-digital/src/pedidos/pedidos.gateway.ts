import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'pedidos', // ⚠️ IMPORTANTE: El frontend debe conectarse a /pedidos
  cors: {
    origin: true, // Permite conexión desde cualquier lado (Angular)
    credentials: true
  },
})
export class PedidosGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server;

  private logger = new Logger('PedidosGateway');

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket de Pedidos listo para la acción');
  }

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Cliente desconectado: ${client.id}`);
  }

  // 📢 MÉTODO PUENTE: El controlador llamará a esto
  notificarNuevoPedido(orden: any) {
    this.logger.log(`📢 EMITIENDO evento 'nuevoPedido' para la orden #${orden.id}`);
    this.server.emit('nuevoPedido', orden);
  }

  @SubscribeMessage('pedidoListo')
  handlePedidoListo(@MessageBody() data: { ordenId: number }) {
    this.logger.log(`✅ Cocina marcó orden #${data.ordenId} como LISTA`);
    this.server.emit('listoParaCobrar', data);
  }
}
import { Test, TestingModule } from '@nestjs/testing';
import { PedidosGateway } from './pedidos.gateway';

describe('PedidosGateway', () => {
  let gateway: PedidosGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PedidosGateway],
    }).compile();

    gateway = module.get<PedidosGateway>(PedidosGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

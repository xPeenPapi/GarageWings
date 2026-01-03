import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Buscar por Email para el Login
  async findOneByEmail(email: string) {
    return this.prisma.empleado.findUnique({
      where: { email }
    });
  }

  // Buscar por ID
  async findOne(id: number) {
    return this.prisma.empleado.findUnique({
      where: { id }
    });
  }

  // Crear usuario (básico)
  async create(data: any) {
    return this.prisma.empleado.create({
      data
    });
  }
}
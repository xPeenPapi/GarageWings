import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ⚠️ IMPORTANTE: En producción usa process.env.JWT_SECRET
      secretOrKey: 'TU_CLAVE_SECRETA_SUPER_SEGURA', 
    });
  }

  async validate(payload: any) {
    // Esto es lo que tendrás disponible en @Request() req.user en tus controladores
    return { 
      userId: payload.sub, 
      email: payload.email, 
      rol: payload.rol,
      empresaId: payload.empresaId,
      sucursalId: payload.sucursalId
    };
  }
}
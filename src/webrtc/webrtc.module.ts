import { Module } from '@nestjs/common';
import { WebrtcGateway } from './webrtc.gateway';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})],
  providers: [WebrtcGateway, JwtService],
  exports: [WebrtcGateway],
})
export class WebrtcModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { GroupsModule } from './groups/groups.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';

function maskValue(value: string | undefined, visibleChars = 4): string {
  if (!value) {
    return '<undefined>';
  }

  if (value.length <= visibleChars * 2) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, visibleChars)}***${value.slice(-visibleChars)}`;
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env-prod', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Debug: show the DB target used by TypeORM without exposing secrets.
        // This helps verify the Render/Neon connection before the first query.
        ...(console.log('🗄️ TypeORM DB target:'), console.log('  DATABASE_URL =', maskValue(configService.get<string>('DATABASE_URL'), 12)), console.log('  DATABASE_HOST =', configService.get<string>('DATABASE_HOST') ?? '<undefined>'), console.log('  DATABASE_PORT =', configService.get<string | number>('DATABASE_PORT') ?? '<undefined>'), console.log('  DATABASE_NAME =', configService.get<string>('DATABASE_NAME') ?? '<undefined>'), {}),
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<string | number>('DATABASE_PORT')
          ? Number(configService.get<string | number>('DATABASE_PORT'))
          : undefined,
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // Throttler
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    PostsModule,
    CommentsModule,
    GroupsModule,
    MessagesModule,
    NotificationsModule,
    UploadsModule,

    // WebRTC signaling
    require('./webrtc/webrtc.module').WebrtcModule,
  ],
  
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
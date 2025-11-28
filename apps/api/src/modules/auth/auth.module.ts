import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [UserService],
  exports: [UserService],
})
export class AuthModule {}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Get()
  list() {
    return this.userService.listUsers();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Post()
  register(@Body() dto: RegisterUserDto) {
    return this.userService.registerUser(dto);
  }
}

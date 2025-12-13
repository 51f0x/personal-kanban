import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserService } from "./user.service";
import { Public } from "../../decorators/public.decorator";
import { RegisterUserDto } from "./dto/register-user.dto";

@ApiTags("users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List users",
    description: "Get a list of all users",
  })
  @ApiResponse({ status: 200, description: "List of users" })
  list() {
    return this.userService.listUsers();
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user", description: "Get user by ID" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User information" })
  @ApiResponse({ status: 404, description: "User not found" })
  get(@Param("id") id: string) {
    return this.userService.getUser(id);
  }

  @Post()
  @Public()
  @ApiOperation({
    summary: "Register user",
    description: "Register a new user account",
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  register(@Body() dto: RegisterUserDto) {
    // eslint-disable-next-line no-console
    console.log("Registration endpoint called with:", {
      email: dto.email,
      name: dto.name,
    });
    return this.userService.registerUser(dto);
  }
}

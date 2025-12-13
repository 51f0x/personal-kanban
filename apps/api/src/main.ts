import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import session from "express-session";

import { AppModule } from "./modules/app.module";
import { SessionStoreService } from "./modules/auth/session.store";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  app.setGlobalPrefix("api/v1");

  // Configure CORS with credentials
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<string>("CORS_ORIGIN", "http://localhost:5173"),
    credentials: true,
  });

  // Configure session middleware
  const sessionStoreService = app.get(SessionStoreService);
  app.use(session(sessionStoreService.getSessionConfig()));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle("Personal Kanban API")
    .setDescription("API documentation for Personal Kanban application")
    .setVersion("1.0")
    .addTag("health", "Health check endpoints")
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management endpoints")
    .addTag("boards", "Board management endpoints")
    .addTag("tasks", "Task management endpoints")
    .addTag("checklist", "Checklist management endpoints")
    .addTag("hints", "Task hints endpoints")
    .addTag("tags", "Tag management endpoints")
    .addTag("rules", "Rule management endpoints")
    .addTag("templates", "Template management endpoints")
    .addTag("agents", "Agent processing endpoints")
    .addTag("analytics", "Analytics and reporting endpoints")
    .addTag("capture", "Quick capture endpoints")
    .addTag("clarification", "Task clarification endpoints")
    .addTag("email-actions", "Email action endpoints")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", name: "X-Capture-Token", in: "header" },
      "capture-token",
    )
    .addApiKey(
      { type: "apiKey", name: "X-Internal-Service-Token", in: "header" },
      "internal-service-token",
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT || 3000);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("API bootstrap failure", error);
  process.exit(1);
});

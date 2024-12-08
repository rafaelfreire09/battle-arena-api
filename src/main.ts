import { NestFactory } from "@nestjs/core";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL,
  });

  const limiter = rateLimit({
    windowMs:
      Number(process.env.WINDOW_REMEMBER_REQUEST_IN_MINUTES) * 60 * 1000,
    max: Number(process.env.MAX_CONNECTION_LIMIT_PER_IP),
  });

  app.use(limiter);

  const logger = new Logger('Server HTTP')

  const PORT = process.env.HTTP_SERVER_PORT || 5000;
  await app.listen(PORT, () => {
    logger.log(`Server running at ${PORT}`);
  });
}
bootstrap();

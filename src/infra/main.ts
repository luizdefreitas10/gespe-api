import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { Env } from './env'

// main.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: false,
  })

  // code for debugg http request
  // app.use(bodyParser.json());
  // app.use((req, res, next) => {
  //   console.log("--- RAW REQ ---");
  //   console.log("headers:", req.headers);
  //   console.log("body:", req.body);
  //   console.log("params:", req.params);
  //   next();
  // });

  // CORS
  const configService = app.get<ConfigService<Env, true>>(ConfigService)
  const corsOrigins = configService.get('CORS_ORIGIN', { infer: true })
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  })

  const port = configService.get('PORT', { infer: true })

  await app.listen(port)
}

bootstrap()

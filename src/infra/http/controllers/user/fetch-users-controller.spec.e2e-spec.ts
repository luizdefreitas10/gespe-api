import { AppModule } from "@/infra/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";

describe("Fetch recent posts (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    prisma = moduleRef.get(PrismaService);

    await app.init();
  });

  test("[GET] /accounts", async () => {
    await Promise.all([
      prisma.user.create({
        data: {
          userName: "John Doe",
          email: "johndoe@email.com",
          password: "123456",
        },
      }),

      prisma.user.create({
        data: {
          userName: "Jane Doe",
          email: "janedoe@email.com",
          password: "123456",
        },
      }),

      prisma.user.create({
        data: {
          userName: "Lukas Doe",
          email: "lukasdoe@email.com",
          password: "123456",
        },
      }),
    ]);

    const response = await request(app.getHttpServer()).get("/accounts").send();

    console.log(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      users: [
        expect.objectContaining({
          userName: "Lukas Doe",
          email: "lukasdoe@email.com",
          password: "123456",
        }),
        expect.objectContaining({
          userName: "Jane Doe",
          email: "janedoe@email.com",
          password: "123456",
        }),
        expect.objectContaining({
          userName: "John Doe",
          email: "johndoe@email.com",
          password: "123456",
        }),
      ],
    });
  });
});

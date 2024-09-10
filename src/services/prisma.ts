import { Prisma, PrismaClient } from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";

const prismaClient = new PrismaClient();

const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
  models: [
    { model: "Sound", invalidateRelated: ["Server"] },
    { model: "Server", invalidateRelated: ["Sound"] },
  ],
  storage: { type: "memory", options: { invalidation: true } },
  cacheTime: 300,
});

prismaClient.$use(cacheMiddleware);

export default prismaClient;

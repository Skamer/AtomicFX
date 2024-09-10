FROM node:18-alpine as base

RUN apk add  --no-cache ffmpeg
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /app

FROM base as deps
COPY package.json yarn.lock ./
COPY ./prisma ./prisma

FROM deps as deps-builder 
RUN yarn install --frozen-lockfile
RUN yarn prisma generate

FROM deps-builder as builder
COPY . .
RUN yarn run build

FROM deps as runner
COPY --from=deps-builder /app/node_modules ./node_modules
COPY --from=deps-builder /app/prisma ./prisma
COPY --from=builder /app/build ./build
COPY --from=builder /app/images ./images
COPY --from=builder /app/fonts ./fonts
CMD ["yarn", "run", "start"]
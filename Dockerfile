FROM node:18

WORKDIR /app

# Copy all the necessary stuff
COPY src/ prisma/ package.json pnpm-lock.yaml pnpm-workspace.yml tsconfig.json tsconfig.build.json ./

RUN pnpm install
RUN pnpm prisma generate
RUN pnpm build

CMD ["/bin/sh", "-c", "pnpm prisma migrate deploy; pnpm start:prod"]
EXPOSE $PORT

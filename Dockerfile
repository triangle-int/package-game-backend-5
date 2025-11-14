FROM node:20

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /backend

# Copy all the necessary stuff
COPY src/ prisma/ package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json ./

RUN pnpm install
RUN pnpm prisma generate
RUN pnpm build

EXPOSE $PORT
EXPOSE $WS_PORT
CMD ["/bin/sh", "-c", "pnpm prisma migrate deploy; pnpm start:prod"]

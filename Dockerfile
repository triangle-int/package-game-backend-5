FROM node:24

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /backend

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=package-backend-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/
RUN pnpm prisma generate
RUN pnpm build

EXPOSE $PORT
EXPOSE $WS_PORT
CMD ["/bin/sh", "-c", "pnpm prisma migrate deploy && exec pnpm start:prod"]

FROM node:18-alpine

WORKDIR /app

# Copy all the necessary stuff
COPY src/ prisma/ package.json yarn.lock tsconfig.json tsconfig.build.json ./

RUN yarn install
RUN yarn prisma generate
RUN yarn build

CMD ["/bin/sh", "-c", "yarn prisma migrate deploy; yarn start:prod"]
EXPOSE $PORT

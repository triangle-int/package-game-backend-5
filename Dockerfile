FROM node:18-alpine

WORKDIR /app

# Copy all the necessary stuff
COPY src/ package.json yarn.lock tsconfig.json tsconfig.build.json ./

RUN yarn install
RUN yarn build

CMD ["yarn", "start:prod"]
EXPOSE 3000

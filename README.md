# Package Game Backend

This repository contains full source code for the backend part of the package game.

# About

`// TODO:` Add some info about the game.
Official telegram channel: https://t.me/packagegame

# Deployment

## Requirements

In order to launch this abomination you need to have these things installed:

- docker for the database
- node v18
- yarn
- firebase project to attach this thing to

## Deploying the database

The easiest way to deploy the database locally is to use docker. This is actually the only part we need docker for. Use this command to start container with the database:

```bash
$ docker compose up -d
```

## Installing dependencies

We use yarn for our dependencies management. To install dependencies (dev deps included) use this command:

```bash
$ yarn install
```

## Environment variables

The server needs these environment variables to run (they can be placed in `.env` file):

| Key name | Description |
---------- | -----------
| `DATABASE_URL` | database url (`"postgresql://dev:dev@localhost:5434/package?schema=public"` if we're using our local docker database)
| `RUN_DISCORD` | `"yes"` if you want to run administration discord bot, `"no"` otherwise
| `RUN_METRICS` | `"yes"` if idk, `"no"` otherwise
| `DISCORD_TOKEN` | discord administration bot token
| `DISCORD_CLIENT_ID` | another magical discord token
| `TEST_ACCOUNT_EMAIL` | firebase testing account email
| `TEST_ACCOUNT_PASSWORD` | freibase testing account password
| `MAPBOX_TOKEN` | mapbox token for discord previews
| `SERVER_ID` | unique server id for the tasks database
| `ADMIN_PASSWORD` | password for accessing admin requests
| `PORT` | port

## Firebase configuration

This is the neat part. I don't remember what and where needs to be placed.

## Launching

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Running tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

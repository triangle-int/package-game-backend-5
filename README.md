# Package Game Backend

This repository contains full source code for the backend part of the package game.

# About

imo this section should contain info about the game

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

## Configuration

Put this to `.env` file in a project root:

```
idk i don't remember everything
```

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

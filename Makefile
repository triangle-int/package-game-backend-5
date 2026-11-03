.PHONY: install run dev stop clear test test-all test-unit test-e2e test-coverage

install:
	@command -v docker >/dev/null 2>&1 || { echo 'Установите Docker Desktop или Docker Engine с Compose.' >&2; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo 'Установите Docker Compose v2.' >&2; exit 1; }
	@docker info >/dev/null 2>&1 || { echo 'Запустите Docker и повторите make install.' >&2; exit 1; }
	@test -f .env || { echo 'Создайте .env для локального сервера перед установкой.' >&2; exit 1; }
	docker compose -f isolated-db.yml -f dev-server.yml pull package-isolated-db
	docker compose -f isolated-db.yml -f dev-server.yml build package-dev-server
	@echo 'Образы сервера и базы данных готовы. Контейнеры не запускались.'

run:
	@test -f .env.production || { echo 'Создайте .env.production с настройками рабочего окружения.' >&2; exit 1; }
	PACKAGE_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.yml up -d --build

dev:
	docker compose -f isolated-db.yml -f dev-server.yml up -d --build

stop:
	docker compose -f isolated-db.yml -f dev-server.yml stop
	@if [ -f .env.production ]; then PACKAGE_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.yml stop; fi

# Destructive: remove the isolated development database and its Docker volume.
# Run `make dev` afterwards to create a fresh schema again.
clear:
	docker compose -f isolated-db.yml -f dev-server.yml down --volumes --remove-orphans

test: test-all

test-all:
	@result=0; \
	$(MAKE) test-unit || result=1; \
	$(MAKE) test-e2e || result=1; \
	$(MAKE) test-coverage || result=1; \
	exit $$result

test-unit:
	npm run test

test-e2e:
	npm run test:e2e

test-coverage:
	npm run test:cov

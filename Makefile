## Project Makefile

# Docker commands using Docker's built‑in compose sub‑command
up:
	@docker compose up -d

down:
	@docker compose down

# Lint all packages
lint:
	@pnpm -r lint

# Test all packages
test:
	@pnpm -r test

# Install dependencies
install:
	@pnpm -w install

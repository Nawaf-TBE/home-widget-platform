# Security Policy

## No Real Secrets Required
This repository is designed for local development and technical evaluation. It does not contain any real production secrets.

## Environment Variables
All sensitive configurations (passwords, JWT secrets, database URLs) are handled via environment variables with safe defaults for local development in `docker-compose.yml`.

To override these values locally, create a `.env` file at the root based on `.env.example`.

## Secrets Management
- DO NOT commit `.env` files.
- DO NOT commit real API keys or private keys.
- If you find a hardcoded secret that appears to be non-public, please report it.

## Testing
Tests use the same non-sensitive defaults as the Docker stack. No third-party API keys are required to run the full integration suite.

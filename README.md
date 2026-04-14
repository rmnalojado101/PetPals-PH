# PetPals PH - Laravel Backend

This folder contains the Laravel backend scaffold for the PetPals PH veterinary clinic management application.

## Setup

1. Install PHP >= 8.1 and Composer.
2. Run `composer install` in the `backend` folder.
3. Copy `.env.example` to `.env` and update database credentials.
4. Run `php artisan key:generate`.
5. Run `php artisan migrate` to create the schema.
6. Run `php artisan serve` to start the backend.

## Notes

- This scaffold contains the application-specific controllers, models, routes, migrations, middleware, and view templates described in `docs/LARAVEL_BACKEND.md`.
- The Laravel framework core is not included in this repository. You must install dependencies with Composer after `composer.json` is present.

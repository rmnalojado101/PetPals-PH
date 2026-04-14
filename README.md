# PetPals PH - Veterinary Clinic Management System

This is a modern full-stack web application built using **Laravel** (Backend) and **React + Vite** (Frontend).

## Prerequisites

Before running the application, make sure you have the following installed:
- **Laragon** (with PHP >= 8.1 and MySQL configured)
- **Composer** (PHP Package Manager)
- **Node.js & npm** (Javascript Runtime and Package Manager)

## Step-by-Step Guide to Access the System

### 1. Start the Laragon Services
1. Open **Laragon**.
2. Click the **Start All** button. This will boot up your Apache/Nginx web server and your MySQL database. 
3. *Note: Laragon automatically creates a local domain for folders inside `C:\laragon\www`. You will be able to access the Laravel backend using `http://petpals-ph.test` (if Laragon's Auto Virtual Hosts is enabled).*

### 2. Configure Your Database
1. Open Laragon and click on **Database** (this usually opens HeidiSQL or phpMyAdmin).
2. Create a new database named **`petpals_ph`**.
3. *This matches the configuration inside your `.env` file where `DB_DATABASE=petpals_ph`.*

### 3. Open Your Terminal
Open your terminal (PowerShell, Git Bash, or Laragon's Terminal) and make sure you are inside the project folder:
```bash
cd C:\laragon\www\Petpals-PH
```

### 4. Install Dependencies
Run these commands to verify/install your dependencies for both the backend and frontend:
```bash
# Install PHP dependencies
composer install

# Install Node/React dependencies
npm install
```

### 5. Setup Application Keys & Database
Run these artisan commands to generate your app encryption key and create the database tables:
```bash
# Generate App Key (if not already done)
php artisan key:generate

# Run Database Migrations to create your tables
php artisan migrate
```

### 6. Run the Development Servers
Because this is a Laravel + Vite + React project, you need to run **two** things at the same time to have the full live-reloading experience.

**Terminal 1 (Backend):**
Serve the Laravel API.
```bash
php artisan serve
```
*The API will be available at `http://127.0.0.1:8000`.*

**Terminal 2 (Frontend):**
Open a new terminal tab/window in the same folder and start the Vite development server for React.
```bash
npm run dev
```

### 7. Accessing the Application

Now that everything is running, open your web browser and go to:
**👉 http://127.0.0.1:8000** (or `http://localhost:8000`)

*If you are using Laragon's virtual host feature, you can also access it via **http://petpals-ph.test**!*

---

## Demo Accounts
Once the application loads, you can navigate to the Login page and use one of the demo roles (if database seeding was run, or use the Register form to create an Owner or Doctor account).

Enjoy building PetPals PH! 🐾

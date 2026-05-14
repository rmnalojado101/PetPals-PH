# 🐾 PetPals PH - Clinic Management System

PetPals PH is a premium, full-stack clinic management solution designed for veterinary practices. It streamlines patient records, vaccinations, billing, and appointments while ensuring data portability through a database-integrated storage system.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure your development environment meets these requirements:
*   **PHP:** v8.1 or higher
*   **Node.js:** v18.x or higher (LTS recommended)
*   **Database:** MySQL (via Laragon, XAMPP, or Docker)
*   **Tools:** Composer, Git

### 2. Installation & Setup

#### **Step A: Clone & Backend Setup**
1. Extract or clone the project into your local server directory (e.g., `C:\laragon\www\Petpals-PH`).
2. Open a terminal in the project root and run:
   ```bash
   composer install
   ```
3. Initialize your environment file:
   ```bash
   copy .env.example .env
   ```
4. Generate the application encryption key:
   ```bash
   php artisan key:generate
   ```

#### **Step B: Frontend Setup**
1. Install the required Node packages:
   ```bash
   npm install
   ```

---

## 🗄️ Database Management

### 1. Configuration
Open your `.env` file and configure your database connection:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=petpals_ph
DB_USERNAME=root
DB_PASSWORD=
```

### 2. Building the Schema
Run the migrations and seeders to create all tables and default accounts (Admin, Clinic, etc.):
```bash
php artisan migrate:fresh --seed
```

---

## 🛠️ Critical Server Configuration (Important!)

Since PetPals PH utilizes **Base64 Database Storage** for all attachments (PDFs, Images, QR Codes), you must increase your server limits to handle larger data packets.

### **PHP Optimization (`php.ini`)**
Find your `php.ini` file in Laragon/XAMPP and update these values:
*   `post_max_size = 64M`
*   `upload_max_filesize = 64M`
*   `memory_limit = 256M`
*   `max_execution_time = 300`

### **MySQL Optimization**
If you experience "Packet too large" errors when uploading 10MB+ files, update your MySQL configuration (`my.ini`):
*   `max_allowed_packet = 64M`

---

## 🖥️ Running the Application

To run the system fully, you must have two terminals open:

### **Terminal 1: Laravel Backend**
```bash
php artisan serve
```
*Accessible at: http://localhost:8000*

### **Terminal 2: React Frontend (HMR)**
```bash
npm run dev
```
*Handles real-time UI updates and asset compilation.*

---

## ✨ Key Features
*   **Consolidated Database Storage**: All medical attachments and QR codes are stored as Base64 strings in MySQL—no physical file management required.
*   **Role-Based Access (RBAC)**: Distinct interfaces for Admins, Veterinarians, Clinic Staff, and Pet Owners.
*   **Guided User Tours**: Automated onboarding for new Vets, Owners, and Staff.
*   **Advanced Reporting**: Generate Vaccination, Billing, and Medical reports in PDF/CSV format.
*   **Real-time Notifications**: Alerts for appointments and medical updates.

---

## 📂 Project Structure
*   `app/Http/Controllers/Api`: Core backend logic and file processing.
*   `resources/src/pages`: React UI components and routing.
*   `resources/src/contexts`: State management for Auth and Tours.
*   `database/migrations`: Schema definitions for the integrated storage system.

---

## 🆘 Troubleshooting
*   **Unknown Database Error**: Ensure you have created a database named `petpals_ph` in MySQL before running migrations.
*   **Tour Not Showing**: Tours are disabled for 'admin' users. Register as a 'vet_clinic' or 'owner' to see the walkthrough.
*   **Vite Manifest Error**: Ensure `npm run dev` is running, or run `npm run build` for production mode.

---
*Developed with ❤️ for PetPals PH.*

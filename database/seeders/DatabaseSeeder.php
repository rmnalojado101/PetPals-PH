<?php

namespace Database\Seeders;

use App\Models\ClinicSettings;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@petpalsph.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'phone' => '09171234567',
        ]);

        User::create([
            'name' => 'Dr. Maria Cruz',
            'email' => 'drcruz@petpalsph.com',
            'password' => Hash::make('password'),
            'role' => 'veterinarian',
            'phone' => '09181234567',
        ]);

        User::create([
            'name' => 'Reception Staff',
            'email' => 'reception@petpalsph.com',
            'password' => Hash::make('password'),
            'role' => 'receptionist',
            'phone' => '09191234567',
        ]);

        $owner = User::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'owner@petpalsph.com',
            'password' => Hash::make('password'),
            'role' => 'owner',
            'phone' => '09201234567',
        ]);

        ClinicSettings::create([
            'name' => 'PetPals PH Veterinary Clinic',
            'address' => '123 Veterinary Street, Makati City, Philippines',
            'phone' => '(02) 8123-4567',
            'email' => 'info@petpalsph.com',
            'opening_hours' => [
                ['day' => 'Monday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Tuesday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Wednesday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Thursday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Friday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Saturday', 'open' => '09:00', 'close' => '15:00', 'isOpen' => true],
                ['day' => 'Sunday', 'open' => '00:00', 'close' => '00:00', 'isOpen' => false],
            ],
        ]);

        Pet::create([
            'owner_id' => $owner->id,
            'name' => 'Buddy',
            'species' => 'dog',
            'breed' => 'Labrador Retriever',
            'age' => 4,
            'sex' => 'male',
            'weight' => 22.50,
            'color' => 'yellow',
            'medical_notes' => 'Healthy dog with occasional ear allergies.',
        ]);
    }
}

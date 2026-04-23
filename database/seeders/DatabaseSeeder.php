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
        $admin = User::create([
            'name' => 'System Administrator',
            'email' => 'admin@petpalsph.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'phone' => '+63 917 123 4567',
        ]);

        $clinic = User::create([
            'name' => 'PetPals Vet Clinic',
            'email' => 'clinic@petpalsph.com',
            'password' => Hash::make('clinic123'),
            'role' => 'vet_clinic',
            'phone' => '+63 900 123 4567',
        ]);

        $vet1 = \App\Models\Veterinarian::create([
            'name' => 'Dr. Maria Cruz',
            'clinicId' => $clinic->id,
            'email' => 'drcruz@petpalsph.com',
            'phone' => '+63 918 234 5678',
            'specialty' => 'General Practice',
            'background' => 'Dr. Cruz has over 10 years of experience in small animal medicine.',
        ]);

        $vet2 = \App\Models\Veterinarian::create([
            'name' => 'Dr. Juan Santos',
            'clinicId' => $clinic->id,
            'email' => 'drsantos@petpalsph.com',
            'phone' => '+63 919 345 6789',
            'specialty' => 'Surgery',
            'background' => 'Dr. Santos specializes in soft tissue and orthopedic surgery.',
        ]);

        $owner = User::create([
            'name' => 'Carlo Mendoza',
            'email' => 'owner@petpalsph.com',
            'password' => Hash::make('owner123'),
            'role' => 'owner',
            'phone' => '+63 921 567 8901',
            'address' => '456 Pet Lover Lane, Quezon City',
        ]);

        ClinicSettings::create([
            'name' => 'PetPals PH',
            'address' => '123 Veterinary Street, Makati City, Philippines',
            'phone' => '+63 2 8888 1234',
            'email' => 'info@petpalsph.com',
            'opening_hours' => [
                ['day' => 'Monday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Tuesday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Wednesday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Thursday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Friday', 'open' => '08:00', 'close' => '18:00', 'isOpen' => true],
                ['day' => 'Saturday', 'open' => '09:00', 'close' => '14:00', 'isOpen' => true],
                ['day' => 'Sunday', 'open' => '00:00', 'close' => '00:00', 'isOpen' => false],
            ],
            'vaccine_types' => [
                'Rabies',
                '5-in-1 (DHPP)',
                'Bordetella',
                'Leptospirosis',
                'Lyme Disease',
                'Canine Influenza',
                'FVRCP (Cats)',
                'FeLV (Cats)',
            ],
        ]);

        $pet1 = Pet::create([
            'owner_id' => $owner->id,
            'name' => 'Bantay',
            'species' => 'dog',
            'breed' => 'Aspin',
            'age' => 3,
            'sex' => 'male',
            'weight' => 15,
            'color' => 'Brown',
            'medical_notes' => 'Healthy and active',
        ]);

        $pet2 = Pet::create([
            'owner_id' => $owner->id,
            'name' => 'Mingming',
            'species' => 'cat',
            'breed' => 'Puspin',
            'age' => 2,
            'sex' => 'female',
            'weight' => 4,
            'color' => 'Orange tabby',
            'medical_notes' => 'Indoor cat, very friendly',
        ]);

        \App\Models\Appointment::create([
            'pet_id' => $pet1->id,
            'owner_id' => $owner->id,
            'veterinarian_id' => $vet1->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '10:00:00',
            'reason' => 'Annual checkup',
            'status' => 'approved',
        ]);

        \App\Models\Appointment::create([
            'pet_id' => $pet2->id,
            'owner_id' => $owner->id,
            'veterinarian_id' => $vet2->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '14:00:00',
            'reason' => 'Vaccination',
            'status' => 'pending',
        ]);

        \App\Models\MedicalRecord::create([
            'pet_id' => $pet1->id,
            'veterinarian_id' => $vet1->id,
            'record_date' => now()->subDays(5)->toDateString(),
            'diagnosis' => 'Mild skin allergy',
            'treatment' => 'Prescribed antihistamines and medicated shampoo',
            'prescription' => 'Cetirizine 5mg once daily for 7 days',
            'weight' => 15,
            'temperature' => 38.5,
            'notes' => 'Follow up in 2 weeks if symptoms persist',
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\ClinicSettings;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $admin = User::updateOrCreate([
            'email' => 'admin@petpalsph.com',
        ], [
            'name' => 'System Administrator',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'phone' => '+63 917 123 4567',
        ]);

        $clinic = User::updateOrCreate([
            'email' => 'clinic@petpalsph.com',
        ], [
            'name' => 'PetPals Vet Clinic',
            'password' => Hash::make('clinic123'),
            'role' => 'vet_clinic',
            'phone' => '+63 900 123 4567',
        ]);

        $vet1 = Veterinarian::updateOrCreate([
            'email' => 'drcruz@petpalsph.com',
        ], [
            'name' => 'Dr. Maria Cruz',
            'clinicId' => $clinic->id,
            'phone' => '+63 918 234 5678',
            'specialty' => 'General Practice',
            'background' => 'Dr. Cruz has over 10 years of experience in small animal medicine.',
        ]);

        $vet2 = Veterinarian::updateOrCreate([
            'email' => 'drsantos@petpalsph.com',
        ], [
            'name' => 'Dr. Juan Santos',
            'clinicId' => $clinic->id,
            'phone' => '+63 919 345 6789',
            'specialty' => 'Surgery',
            'background' => 'Dr. Santos specializes in soft tissue and orthopedic surgery.',
        ]);

        $owner = User::updateOrCreate([
            'email' => 'owner@petpalsph.com',
        ], [
            'name' => 'Carlo Mendoza',
            'password' => Hash::make('owner123'),
            'role' => 'owner',
            'phone' => '+63 921 567 8901',
            'address' => '456 Pet Lover Lane, Quezon City',
        ]);

        ClinicSettings::updateOrCreate([
            'email' => 'info@petpalsph.com',
        ], [
            'name' => 'PetPals PH',
            'address' => '123 Veterinary Street, Makati City, Philippines',
            'phone' => '+63 2 8888 1234',
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

        $pet1 = Pet::updateOrCreate([
            'owner_id' => $owner->id,
            'name' => 'Bantay',
        ], [
            'owner_id' => $owner->id,
            'species' => 'dog',
            'breed' => 'Aspin',
            'age' => 3,
            'sex' => 'male',
            'weight' => 15,
            'color' => 'Brown',
            'medical_notes' => 'Healthy and active',
            'allergies' => [],
        ]);

        $pet2 = Pet::updateOrCreate([
            'owner_id' => $owner->id,
            'name' => 'Mingming',
        ], [
            'owner_id' => $owner->id,
            'species' => 'cat',
            'breed' => 'Puspin',
            'age' => 2,
            'sex' => 'female',
            'weight' => 4,
            'color' => 'Orange tabby',
            'medical_notes' => 'Indoor cat, very friendly',
            'allergies' => [],
        ]);

        Appointment::updateOrCreate([
            'pet_id' => $pet1->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '10:00:00',
        ], [
            'pet_id' => $pet1->id,
            'owner_id' => $owner->id,
            'veterinarian_id' => $vet1->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '10:00:00',
            'reason' => 'Annual checkup',
            'status' => 'approved',
        ]);

        Appointment::updateOrCreate([
            'pet_id' => $pet2->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '14:00:00',
        ], [
            'pet_id' => $pet2->id,
            'owner_id' => $owner->id,
            'veterinarian_id' => $vet2->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '14:00:00',
            'reason' => 'Vaccination',
            'status' => 'pending',
        ]);

        MedicalRecord::updateOrCreate([
            'pet_id' => $pet1->id,
            'record_date' => now()->subDays(5)->toDateString(),
            'diagnosis' => 'Mild skin allergy',
        ], [
            'pet_id' => $pet1->id,
            'veterinarian_id' => $vet1->id,
            'treatment' => 'Prescribed antihistamines and medicated shampoo',
            'prescription' => 'Cetirizine 5mg once daily for 7 days',
            'weight' => 15,
            'temperature' => 38.5,
            'notes' => 'Follow up in 2 weeks if symptoms persist',
        ]);
    }
}

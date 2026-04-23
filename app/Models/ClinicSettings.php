<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'opening_hours',
        'logo',
        'vaccine_types',
    ];

    protected $casts = [
        'opening_hours' => 'array',
        'vaccine_types' => 'array',
    ];

    public static function getInstance(): self
    {
        return self::firstOrCreate([], [
            'name' => 'PetPals PH ',
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
    }
}

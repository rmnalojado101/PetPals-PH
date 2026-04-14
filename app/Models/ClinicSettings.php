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
    ];

    protected $casts = [
        'opening_hours' => 'array',
    ];

    public static function getInstance(): self
    {
        return self::firstOrCreate([], [
            'name' => 'PetPals PH Veterinary Clinic',
        ]);
    }
}

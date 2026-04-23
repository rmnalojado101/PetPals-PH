<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Veterinarian extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'clinicId',
        'email',
        'phone',
        'specialty',
        'background',
    ];

    public function clinic()
    {
        return $this->belongsTo(User::class, 'clinicId');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'veterinarian_id');
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'veterinarian_id');
    }

    public function vaccinations()
    {
        return $this->hasMany(Vaccination::class, 'administered_by');
    }
}

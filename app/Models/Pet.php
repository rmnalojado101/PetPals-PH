<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pet extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'species',
        'breed',
        'age',
        'sex',
        'weight',
        'color',
        'microchip_id',
        'allergies',
        'medical_notes',
        'photo',
    ];

    protected $casts = [
        'allergies' => 'array',
        'weight' => 'decimal:2',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function vaccinations()
    {
        return $this->hasMany(Vaccination::class);
    }

    public function getSpeciesLabelAttribute(): string
    {
        return ucfirst($this->species);
    }

    public function getSexLabelAttribute(): string
    {
        return ucfirst($this->sex);
    }

    public function scopeBySpecies($query, string $species)
    {
        return $query->where('species', $species);
    }

    public function scopeByOwner($query, int $ownerId)
    {
        return $query->where('owner_id', $ownerId);
    }
}

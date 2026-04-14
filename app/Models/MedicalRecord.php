<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'appointment_id',
        'veterinarian_id',
        'record_date',
        'diagnosis',
        'treatment',
        'prescription',
        'lab_results',
        'notes',
        'weight',
        'temperature',
        'follow_up_date',
    ];

    protected $casts = [
        'record_date' => 'date',
        'follow_up_date' => 'date',
        'weight' => 'decimal:2',
        'temperature' => 'decimal:1',
    ];

    public function pet()
    {
        return $this->belongsTo(Pet::class);
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function veterinarian()
    {
        return $this->belongsTo(User::class, 'veterinarian_id');
    }

    public function scopeForPet($query, int $petId)
    {
        return $query->where('pet_id', $petId);
    }

    public function scopeByVeterinarian($query, int $vetId)
    {
        return $query->where('veterinarian_id', $vetId);
    }

    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('record_date', '>=', now()->subDays($days));
    }
}

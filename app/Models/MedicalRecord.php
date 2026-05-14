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
        'attachment_path',
        'attachment_name',
        'attachment_data',
        'clinical_details',
    ];

    protected $hidden = ['attachment_data'];

    protected $casts = [
        'record_date' => 'date',
        'follow_up_date' => 'date',
        'weight' => 'decimal:2',
        'temperature' => 'decimal:1',
        'clinical_details' => 'array',
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
        return $this->belongsTo(Veterinarian::class, 'veterinarian_id');
    }

    public function billing()
    {
        return $this->hasOne(Billing::class);
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

    protected $appends = ['attachment_url'];

    public function getAttachmentUrlAttribute()
    {
        return ($this->attachment_data || $this->attachment_path)
            ? "/api/medical-records/{$this->id}/download-attachment"
            : null;
    }
}

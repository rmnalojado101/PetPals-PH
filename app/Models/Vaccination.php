<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vaccination extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'name',
        'date_administered',
        'next_due_date',
        'administered_by',
        'batch_number',
        'notes',
    ];

    protected $casts = [
        'date_administered' => 'date',
        'next_due_date' => 'date',
    ];

    public function pet()
    {
        return $this->belongsTo(Pet::class);
    }

    public function administeredByUser()
    {
        return $this->belongsTo(User::class, 'administered_by');
    }

    public function scopeForPet($query, int $petId)
    {
        return $query->where('pet_id', $petId);
    }

    public function scopeDueSoon($query, int $days = 30)
    {
        return $query->whereNotNull('next_due_date')
                     ->whereBetween('next_due_date', [now(), now()->addDays($days)]);
    }

    public function scopeOverdue($query)
    {
        return $query->whereNotNull('next_due_date')
                     ->where('next_due_date', '<', now());
    }
}

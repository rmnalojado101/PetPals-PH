<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'owner_id',
        'veterinarian_id',
        'appointment_date',
        'appointment_time',
        'reason',
        'status',
        'notes',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'datetime:H:i',
    ];

    public function pet()
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function veterinarian()
    {
        return $this->belongsTo(Veterinarian::class, 'veterinarian_id');
    }

    public function medicalRecord()
    {
        return $this->hasOne(MedicalRecord::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('appointment_date', Carbon::today());
    }

    public function scopeUpcoming($query)
    {
        return $query->where('appointment_date', '>=', Carbon::today())
                     ->whereIn('status', ['pending', 'approved']);
    }

    public function scopeForVeterinarian($query, int $vetId)
    {
        return $query->where('veterinarian_id', $vetId);
    }

    public function scopeForOwner($query, int $ownerId)
    {
        return $query->where('owner_id', $ownerId);
    }

    public static function hasConflict(int $vetId, string $date, string $time, ?int $excludeId = null): bool
    {
        $query = self::where('veterinarian_id', $vetId)
                     ->where('appointment_date', $date)
                     ->where('appointment_time', $time)
                     ->whereIn('status', ['pending', 'approved']);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }
}

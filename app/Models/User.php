<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
        'avatar',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function pets()
    {
        return $this->hasMany(Pet::class, 'owner_id');
    }

    public function appointmentsAsOwner()
    {
        return $this->hasMany(Appointment::class, 'owner_id');
    }

    public function appointmentsAsVet()
    {
        return $this->hasMany(Appointment::class, 'veterinarian_id');
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'veterinarian_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function scopeVeterinarians($query)
    {
        return $query->where('role', 'veterinarian');
    }

    public function scopeOwners($query)
    {
        return $query->where('role', 'owner');
    }

    public function scopeStaff($query)
    {
        return $query->whereIn('role', ['admin', 'veterinarian', 'receptionist']);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isVeterinarian(): bool
    {
        return $this->role === 'veterinarian';
    }

    public function isReceptionist(): bool
    {
        return $this->role === 'receptionist';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function canManageUsers(): bool
    {
        return $this->isAdmin();
    }

    public function canManageAppointments(): bool
    {
        return in_array($this->role, ['admin', 'veterinarian', 'receptionist']);
    }

    public function canViewMedicalRecords(): bool
    {
        return in_array($this->role, ['admin', 'veterinarian']);
    }

    public function canCreateMedicalRecords(): bool
    {
        return $this->isVeterinarian();
    }
}

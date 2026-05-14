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

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'owner_id');
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

    public function clinicVeterinarians()
    {
        return $this->hasMany(Veterinarian::class, 'clinicId');
    }

    public function clinicSettings()
    {
        return $this->hasOne(ClinicSettings::class, 'clinic_id');
    }

    public function scopeClinics($query)
    {
        return $query->where('role', 'vet_clinic');
    }

    public function scopeOwners($query)
    {
        return $query->where('role', 'owner');
    }

    public function scopeStaff($query)
    {
        return $query->whereIn('role', ['admin', 'vet_clinic']);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isVetClinic(): bool
    {
        return $this->role === 'vet_clinic';
    }

    public function canManageUsers(): bool
    {
        return $this->isAdmin();
    }

    public function canManageAppointments(): bool
    {
        return in_array($this->role, ['admin', 'vet_clinic']);
    }

    public function canViewMedicalRecords(): bool
    {
        return in_array($this->role, ['admin', 'vet_clinic']);
    }

    public function canCreateMedicalRecords(): bool
    {
        return in_array($this->role, ['admin', 'vet_clinic']);
    }

    public function linkedVeterinarian(): ?Veterinarian
    {
        return null;
    }

    public function linkedVeterinarianId(): ?int
    {
        return null;
    }
}

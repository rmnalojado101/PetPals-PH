<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Billing extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'pet_id',
        'owner_id',
        'medical_record_id',
        'vaccination_id',
        'total_amount',
        'status',
        'payment_method',
        'items',
        'billing_date',
        'notes',
        'proof_of_payment_path',
        'proof_of_payment_name',
        'proof_of_payment_data',
    ];

    protected $appends = ['proof_of_payment_url'];

    protected $hidden = ['proof_of_payment_data'];

    public function getProofOfPaymentUrlAttribute()
    {
        return ($this->proof_of_payment_data || $this->proof_of_payment_path)
            ? "/api/billings/{$this->id}/download-proof"
            : null;
    }

    protected $casts = [
        'items' => 'array',
        'billing_date' => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function pet()
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class);
    }

    public function vaccination()
    {
        return $this->belongsTo(Vaccination::class);
    }
}

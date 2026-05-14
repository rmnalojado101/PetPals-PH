<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'address',
        'phone',
        'email',
        'opening_hours',
        'logo',
        'vaccine_types',
        'payment_qr_code_path',
        'payment_qr_code_data',
        'payment_methods',
        'medical_record_templates',
    ];

    protected $appends = ['payment_qr_code_url', 'payment_methods_with_urls'];

    protected $hidden = ['payment_qr_code_data', 'payment_methods'];

    public function clinic()
    {
        return $this->belongsTo(User::class, 'clinic_id');
    }

    public function getPaymentMethodsWithUrlsAttribute()
    {
        $methods = $this->payment_methods ?? [];
        return array_map(function ($method) {
            if (!empty($method['qr_code_data'])) {
                $method['qr_code_url'] = $method['qr_code_data'];
            } elseif (isset($method['qr_code_path'])) {
                $method['qr_code_url'] = asset('storage/' . $method['qr_code_path']);
            }

            unset($method['qr_code_data']);

            return $method;
        }, $methods);
    }

    public function getPaymentQrCodeUrlAttribute()
    {
        if ($this->payment_qr_code_data) {
            return $this->payment_qr_code_data;
        }

        return $this->payment_qr_code_path
            ? asset('storage/' . $this->payment_qr_code_path) 
            : null;
    }

    protected $casts = [
        'opening_hours' => 'array',
        'vaccine_types' => 'array',
        'payment_methods' => 'array',
        'medical_record_templates' => 'array',
    ];

    public static function getInstance(?int $clinicId = null): self
    {
        $search = ['clinic_id' => $clinicId];
        return self::firstOrCreate($search, [
            'name' => 'Veterinary Clinic',
            'vaccine_types' => [
                'Rabies',
                '5-in-1 (DHPP)',
                'Bordetella',
                'Leptospirosis',
                'Lyme Disease',
                'Canine Influenza',
                'FVRCP (Cats)',
                'FeLV (Cats)',
            ],
        ]);
    }
}

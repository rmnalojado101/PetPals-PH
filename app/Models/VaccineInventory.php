<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VaccineInventory extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'batch_number',
        'origin',
        'expiration_date',
        'description',
        'stock',
    ];

    protected $casts = [
        'expiration_date' => 'date',
        'stock' => 'integer',
    ];

    public function clinic()
    {
        return $this->belongsTo(User::class, 'clinic_id');
    }
}

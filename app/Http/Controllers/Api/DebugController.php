<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;

class DebugController extends Controller
{
    public function medicalRecords()
    {
        return response()->json([
            'total_count' => MedicalRecord::count(),
            'with_attachments' => MedicalRecord::whereNotNull('attachment_path')->count(),
            'with_attachment_data' => MedicalRecord::whereNotNull('attachment_data')->count(),
            'sample_records' => MedicalRecord::with(['pet.owner', 'veterinarian'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn($r) => [
                    'id' => $r->id,
                    'pet' => $r->pet?->name,
                    'veterinarian' => $r->veterinarian?->name,
                    'attachment_path' => $r->attachment_path,
                    'attachment_name' => $r->attachment_name,
                    'has_attachment_data' => !is_null($r->attachment_data),
                    'attachment_data_size' => $r->attachment_data ? strlen($r->attachment_data) : 0,
                ])
        ]);
    }
}

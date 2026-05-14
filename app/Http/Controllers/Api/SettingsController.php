<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicSettings;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        $user = request()->user();
        $clinicId = $user->isVetClinic() ? $user->id : null;
        $settings = ClinicSettings::getInstance($clinicId);
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'opening_hours' => 'nullable|array',
            'logo' => 'nullable|string',
            'payment_qr_code' => 'nullable|file|image|mimes:jpg,jpeg,png,webp,gif|max:10240',
            'vaccine_types' => 'nullable|array',
            'vaccine_types.*' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('payment_qr_code')) {
            $file = $request->file('payment_qr_code');

            // Store content in database as base64
            $validated['payment_qr_code_data'] = 'data:' . $file->getMimeType() . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));
        }

        unset($validated['payment_qr_code']);

        $user = $request->user();
        $clinicId = $user->isVetClinic() ? $user->id : null;
        $settings = ClinicSettings::getInstance($clinicId);
        $settings->update($validated);

        return response()->json($settings);
    }

    public function addPaymentMethod(Request $request)
    {
        $request->validate([
            'label' => 'required|string|max:50',
            'qr_code' => 'required|file|image|mimes:jpg,jpeg,png,webp,gif|max:10240',
        ]);

        $user = $request->user();
        $clinicId = $user->isVetClinic() ? $user->id : null;
        $settings = ClinicSettings::getInstance($clinicId);
        $methods = $settings->payment_methods ?? [];

        $file = $request->file('qr_code');

        
        $methods[] = [
            'id' => uniqid(),
            'label' => $request->label,

            'qr_code_data' => 'data:' . $file->getMimeType() . ';base64,' . base64_encode(file_get_contents($file->getRealPath())),
        ];

        $settings->update(['payment_methods' => $methods]);

        return response()->json($settings);
    }

    public function deletePaymentMethod($id)
    {
        $user = request()->user();
        $clinicId = $user->isVetClinic() ? $user->id : null;
        $settings = ClinicSettings::getInstance($clinicId);
        $methods = $settings->payment_methods ?? [];

        $filtered = array_filter($methods, function ($method) use ($id) {
            if ($method['id'] === $id && isset($method['qr_code_path'])) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($method['qr_code_path']);
                return false;
            }
            return true;
        });

        $settings->update(['payment_methods' => array_values($filtered)]);

        return response()->json($settings);
    }

    public function getClinicSettings($clinicId)
    {
        $settings = ClinicSettings::getInstance($clinicId);
        return response()->json($settings);
    }
}

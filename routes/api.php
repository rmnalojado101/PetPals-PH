<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\MedicalRecordController;
use App\Http\Controllers\Api\VaccinationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/password', [AuthController::class, 'changePassword']);

    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    Route::get('/veterinarians', [UserController::class, 'veterinarians']);
    Route::get('/owners', [UserController::class, 'owners'])->middleware('role:admin,veterinarian,receptionist');

    Route::apiResource('pets', PetController::class);
    Route::apiResource('appointments', AppointmentController::class);
    Route::get('/appointments-today', [AppointmentController::class, 'today']);
    Route::get('/appointments-upcoming', [AppointmentController::class, 'upcoming']);

    Route::apiResource('medical-records', MedicalRecordController::class);
    Route::get('/medical-records/{medicalRecord}/pdf', [MedicalRecordController::class, 'exportPdf']);
    Route::get('/pets/{petId}/medical-history', [MedicalRecordController::class, 'petHistory']);

    Route::apiResource('vaccinations', VaccinationController::class);
    Route::get('/vaccinations-due-soon', [VaccinationController::class, 'dueSoon']);
    Route::get('/vaccinations-overdue', [VaccinationController::class, 'overdue']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    Route::middleware('role:admin,veterinarian')->group(function () {
        Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
        Route::get('/reports/appointments', [ReportController::class, 'appointmentStats']);
        Route::get('/reports/species', [ReportController::class, 'speciesDistribution']);
        Route::get('/reports/veterinarians', [ReportController::class, 'veterinarianActivity']);
        Route::get('/reports/export/appointments', [ReportController::class, 'exportAppointments']);
    });

    Route::get('/settings', [SettingsController::class, 'index']);
    Route::middleware('role:admin')->group(function () {
        Route::put('/settings', [SettingsController::class, 'update']);
    });
});

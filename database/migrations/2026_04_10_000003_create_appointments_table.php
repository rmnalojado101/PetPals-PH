<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->onDelete('cascade');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('veterinarian_id')->constrained('veterinarians')->onDelete('cascade');
            $table->date('appointment_date');
            $table->time('appointment_time');
            $table->text('reason');
            $table->enum('status', ['pending', 'approved', 'completed', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('appointment_date');
            $table->index('status');
            $table->index('veterinarian_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};

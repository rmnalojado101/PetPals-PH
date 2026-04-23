<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('veterinarian_id')->constrained('veterinarians')->onDelete('cascade');
            $table->date('record_date');
            $table->text('diagnosis');
            $table->text('treatment');
            $table->text('prescription')->nullable();
            $table->text('lab_results')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->date('follow_up_date')->nullable();
            $table->timestamps();

            $table->index('pet_id');
            $table->index('record_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_records');
    }
};

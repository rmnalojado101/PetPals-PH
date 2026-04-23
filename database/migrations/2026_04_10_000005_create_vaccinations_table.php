<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->date('date_administered');
            $table->date('next_due_date')->nullable();
            $table->foreignId('administered_by')->constrained('veterinarians')->onDelete('cascade');
            $table->string('batch_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('pet_id');
            $table->index('next_due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccinations');
    }
};

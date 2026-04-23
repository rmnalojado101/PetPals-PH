<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('PetPals PH ');
            $table->text('address')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->json('opening_hours')->nullable();
            $table->string('logo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_settings');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->enum('species', ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other']);
            $table->string('breed');
            $table->unsignedInteger('age');
            $table->enum('sex', ['male', 'female']);
            $table->decimal('weight', 5, 2)->nullable();
            $table->string('color', 100)->nullable();
            $table->string('microchip_id', 50)->unique()->nullable();
            $table->json('allergies')->nullable();
            $table->text('medical_notes')->nullable();
            $table->string('photo')->nullable();
            $table->timestamps();

            $table->index('owner_id');
            $table->index('species');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};

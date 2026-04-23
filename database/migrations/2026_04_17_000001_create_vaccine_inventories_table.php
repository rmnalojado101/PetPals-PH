<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccine_inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('batch_number')->nullable();
            $table->string('origin')->nullable();
            $table->date('expiration_date')->nullable();
            $table->text('description')->nullable();
            $table->integer('stock')->default(0);
            $table->timestamps();

            $table->unique(['clinic_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccine_inventories');
    }
};

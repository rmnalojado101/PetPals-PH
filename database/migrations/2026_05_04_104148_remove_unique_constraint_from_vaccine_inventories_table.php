<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vaccine_inventories', function (Blueprint $table) {
            // MySQL needs an index on clinic_id for the foreign key before we drop the unique index that starts with clinic_id
            $table->index('clinic_id');
            $table->dropUnique(['clinic_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vaccine_inventories', function (Blueprint $table) {
            $table->unique(['clinic_id', 'name']);
            $table->dropIndex(['clinic_id']);
        });
    }
};

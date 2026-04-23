<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('clinic_settings', 'vaccine_types')) {
            Schema::table('clinic_settings', function (Blueprint $table) {
                $table->json('vaccine_types')->nullable()->after('logo');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('clinic_settings', 'vaccine_types')) {
            Schema::table('clinic_settings', function (Blueprint $table) {
                $table->dropColumn('vaccine_types');
            });
        }
    }
};

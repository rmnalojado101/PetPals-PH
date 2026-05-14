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
        if (!Schema::hasColumn('medical_records', 'clinical_details')) {
            Schema::table('medical_records', function (Blueprint $table) {
                $table->json('clinical_details')->nullable()->after('notes');
            });
        }

        if (!Schema::hasColumn('clinic_settings', 'medical_record_templates')) {
            Schema::table('clinic_settings', function (Blueprint $table) {
                $table->json('medical_record_templates')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('medical_records', 'clinical_details')) {
            Schema::table('medical_records', function (Blueprint $table) {
                $table->dropColumn('clinical_details');
            });
        }

        if (Schema::hasColumn('clinic_settings', 'medical_record_templates')) {
            Schema::table('clinic_settings', function (Blueprint $table) {
                $table->dropColumn('medical_record_templates');
            });
        }
    }
};

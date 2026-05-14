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
        if (!Schema::hasColumn('medical_records', 'attachment_path')) {
            Schema::table('medical_records', function (Blueprint $table) {
                $table->string('attachment_path')->nullable()->after('follow_up_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('medical_records', 'attachment_path')) {
            Schema::table('medical_records', function (Blueprint $table) {
                $table->dropColumn('attachment_path');
            });
        }
    }
};

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
        Schema::table('medical_records', function (Blueprint $table) {
            $table->string('attachment_path')->nullable();
            $table->text('diagnosis')->nullable()->change();
            $table->text('treatment')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropColumn('attachment_path');
            $table->text('diagnosis')->nullable(false)->change();
            $table->text('treatment')->nullable(false)->change();
        });
    }
};

<?php
/**
 * Migration to add payment-related fields to billings and clinic_settings tables.
 * 
 * Added fields:
 * - billings: proof_of_payment_path, proof_of_payment_name
 * - clinic_settings: payment_qr_code_path
 */

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
        Schema::table('billings', function (Blueprint $table) {
            $table->string('proof_of_payment_path')->nullable()->after('notes');
            $table->string('proof_of_payment_name')->nullable()->after('proof_of_payment_path');
        });

        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->string('payment_qr_code_path')->nullable()->after('logo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->dropColumn(['proof_of_payment_path', 'proof_of_payment_name']);
        });

        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->dropColumn('payment_qr_code_path');
        });
    }
};

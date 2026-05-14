<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('billings', 'proof_of_payment_data')) {
            Schema::table('billings', function (Blueprint $table) {
                $table->longText('proof_of_payment_data')
                    ->nullable()
                    ->after('proof_of_payment_name');
            });
        }

        DB::table('billings')
            ->whereNotNull('proof_of_payment_path')
            ->whereNull('proof_of_payment_data')
            ->orderBy('id')
            ->select(['id', 'proof_of_payment_path'])
            ->chunk(25, function ($billings) {
                foreach ($billings as $billing) {
                    $path = storage_path('app/public/' . $billing->proof_of_payment_path);

                    if (!is_file($path) || !is_readable($path)) {
                        continue;
                    }

                    $mimeType = function_exists('mime_content_type')
                        ? mime_content_type($path)
                        : null;

                    DB::table('billings')
                        ->where('id', $billing->id)
                        ->update([
                            'proof_of_payment_data' => 'data:' . ($mimeType ?: 'application/octet-stream') . ';base64,' . base64_encode(file_get_contents($path)),
                        ]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasColumn('billings', 'proof_of_payment_data')) {
            Schema::table('billings', function (Blueprint $table) {
                $table->dropColumn('proof_of_payment_data');
            });
        }
    }
};

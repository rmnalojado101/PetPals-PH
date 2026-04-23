<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

require __DIR__.'/database/seeders/DatabaseSeeder.php';
(new Database\Seeders\DatabaseSeeder())->run();
echo "Successfully seeded database!\n";

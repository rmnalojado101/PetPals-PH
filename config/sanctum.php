<?php

use Laravel\Sanctum\Sanctum;

return [
    'stateful' => [
        'localhost',
        '127.0.0.1',
        'localhost:8000',
        '127.0.0.1:8000',
        'localhost:5173',
        '127.0.0.1:5173',
    ],

    'guard' => ['web'],

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],
];

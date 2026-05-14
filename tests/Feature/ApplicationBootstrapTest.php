<?php

namespace Tests\Feature;

use Illuminate\Contracts\Console\Kernel;
use Tests\TestCase;

class ApplicationBootstrapTest extends TestCase
{
    public function test_application_bootstraps(): void
    {
        $this->assertTrue($this->app->bound(Kernel::class));
    }
}

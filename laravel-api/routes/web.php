<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Apple Grading Laravel API',
        'docs' => 'See README.md',
        'api_base' => '/api/v1',
        'python_ml' => 'Separate service — only Grade A/B via PYTHON_ML_URL',
    ]);
});

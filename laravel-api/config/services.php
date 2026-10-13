<?php

return [
    'python_ml' => [
        'url' => env('PYTHON_ML_URL', 'http://127.0.0.1:8000'),
        'grade_path' => env('PYTHON_ML_GRADE_PATH', '/api/v1/grade'),
        'timeout' => env('PYTHON_ML_TIMEOUT', 300),
    ],
];

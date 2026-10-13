<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Calls the Python ML service for apple Grade A / Grade B only.
 * Does not contain ML logic — that stays in grader.py.
 */
class PythonGraderClient
{
    public function gradeImages(array $absolutePaths): array
    {
        $base = rtrim(config('services.python_ml.url'), '/');
        $path = config('services.python_ml.grade_path', '/api/v1/grade');
        $timeout = (int) config('services.python_ml.timeout', 300);

        if ($base === '') {
            throw new RuntimeException('PYTHON_ML_URL is not configured');
        }

        $request = Http::timeout($timeout)->asMultipart();

        foreach ($absolutePaths as $i => $filePath) {
            if (! is_file($filePath)) {
                throw new RuntimeException("Image missing: {$filePath}");
            }
            $request = $request->attach(
                'images',
                file_get_contents($filePath),
                basename($filePath)
            );
        }

        try {
            $response = $request->post($base.$path);
        } catch (ConnectionException $e) {
            throw new RuntimeException(
                'Python ML service unreachable at '.$base.'. Start: uvicorn api.main:app --port 8000. '.$e->getMessage(),
                0,
                $e
            );
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                'Python ML error HTTP '.$response->status().': '.$response->body()
            );
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new RuntimeException('Invalid JSON from Python ML service');
        }

        return $json;
    }
}

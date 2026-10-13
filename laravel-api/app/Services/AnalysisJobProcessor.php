<?php

namespace App\Services;

use App\Models\AnalysisJob;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AnalysisJobProcessor
{
    public function __construct(
        protected PythonGraderClient $grader,
        protected WeightCalculator $weights,
    ) {}

    public function process(AnalysisJob $job): AnalysisJob
    {
        $job->update([
            'status' => 'processing',
            'started_at' => now(),
            'error_message' => null,
        ]);

        $paths = $job->image_paths ?? [];
        $absolute = [];
        foreach ($paths as $relative) {
            $absolute[] = Storage::disk('local')->path($relative);
        }

        try {
            if (count($absolute) < 1) {
                throw new \RuntimeException('No images to process');
            }

            $grade = $this->grader->gradeImages($absolute);
            $summary = $grade['summary'] ?? [];
            $gradeA = (int) ($summary['good_apples'] ?? $summary['grade_A_count'] ?? 0);
            $gradeB = (int) ($summary['bad_apples'] ?? $summary['grade_B_count'] ?? 0);

            $weight = $this->weights->calculate(
                $gradeA,
                $gradeB,
                $job->crates_sampled,
                $job->average_weight_kg,
                $job->total_sampled_weight_kg,
            );

            $result = [
                'lot_id' => $job->lot_id,
                'lot_name' => $job->lot_name,
                'grading' => $grade,
                'weights' => $weight,
            ];

            // Temporary image lifecycle: delete after successful process
            $this->deleteImages($paths);

            $job->update([
                'status' => 'completed',
                'result_json' => $result,
                'image_paths' => null,
                'completed_at' => now(),
                'error_message' => null,
            ]);
        } catch (Throwable $e) {
            Log::error('Analysis job failed', ['job' => $job->id, 'error' => $e->getMessage()]);
            $job->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
        }

        return $job->fresh();
    }

    protected function deleteImages(array $relativePaths): void
    {
        foreach ($relativePaths as $relative) {
            try {
                Storage::disk('local')->delete($relative);
            } catch (Throwable $e) {
                Log::warning('Failed deleting temp image '.$relative.': '.$e->getMessage());
            }
        }
    }
}

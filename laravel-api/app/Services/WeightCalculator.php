<?php

namespace App\Services;

class WeightCalculator
{
    /**
     * Total Sampled Weight = crates_sampled * average_weight_kg
     * Estimated A/B weights proportional to apple counts.
     */
    public function calculate(
        int $gradeACount,
        int $gradeBCount,
        ?float $cratesSampled = null,
        ?float $averageWeightKg = null,
        ?float $totalSampledWeightKg = null,
    ): array {
        $totalCount = $gradeACount + $gradeBCount;

        if ($totalSampledWeightKg !== null && $totalSampledWeightKg > 0) {
            $total = (float) $totalSampledWeightKg;
            $source = 'client_lot_weight';
        } elseif ($cratesSampled !== null && $averageWeightKg !== null && $cratesSampled > 0 && $averageWeightKg > 0) {
            $total = (float) $cratesSampled * (float) $averageWeightKg;
            $source = 'crates_times_average';
        } else {
            $total = 0.0;
            $source = 'unavailable';
        }

        if ($totalCount > 0 && $total > 0) {
            $estA = round($total * ($gradeACount / $totalCount), 4);
            $estB = round($total * ($gradeBCount / $totalCount), 4);
        } else {
            $estA = 0.0;
            $estB = 0.0;
        }

        return [
            'total_sampled_weight_kg' => round($total, 4),
            'estimated_grade_a_weight_kg' => $estA,
            'estimated_grade_b_weight_kg' => $estB,
            'weight_source' => $source,
            'crates_sampled' => $cratesSampled,
            'average_weight_kg' => $averageWeightKg,
            'grade_a_count' => $gradeACount,
            'grade_b_count' => $gradeBCount,
            'total_count' => $totalCount,
        ];
    }
}

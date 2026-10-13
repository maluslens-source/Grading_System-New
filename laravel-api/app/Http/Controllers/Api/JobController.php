<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalysisJob;
use App\Services\AnalysisJobProcessor;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class JobController extends Controller
{
    public function __construct(protected AnalysisJobProcessor $processor) {}

    public function submit(Request $request)
    {
        $data = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => ['file', 'image', 'max:25600'],
            'lot_id' => ['nullable', 'string', 'max:100'],
            'lot_name' => ['nullable', 'string', 'max:200'],
            'crates_sampled' => ['nullable', 'numeric', 'min:0'],
            'average_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'total_sampled_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'auto_process' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        $jobId = (string) Str::uuid();
        $dir = "uploads/{$jobId}";
        $paths = [];

        foreach ($request->file('images') as $i => $file) {
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $stored = $file->storeAs($dir, "img_{$i}.".$ext, 'local');
            $paths[] = $stored;
        }

        $auto = $request->boolean('auto_process', true);
        $crates = isset($data['crates_sampled']) ? (float) $data['crates_sampled'] : null;
        $avg = isset($data['average_weight_kg']) ? (float) $data['average_weight_kg'] : null;
        $total = isset($data['total_sampled_weight_kg']) ? (float) $data['total_sampled_weight_kg'] : null;
        if ($total === null && $crates !== null && $avg !== null) {
            $total = $crates * $avg;
        }

        $job = AnalysisJob::create([
            'id' => $jobId,
            'user_id' => $user->id,
            'organization_id' => $user->organization_id,
            'status' => $auto ? 'queued' : 'uploaded',
            'lot_id' => $data['lot_id'] ?? null,
            'lot_name' => $data['lot_name'] ?? null,
            'crates_sampled' => $crates,
            'average_weight_kg' => $avg,
            'total_sampled_weight_kg' => $total,
            'image_paths' => $paths,
            'retry_count' => 0,
            'max_retries' => 3,
        ]);

        if ($auto) {
            // Sync process (QUEUE_CONNECTION=sync). Swap to queue later if needed.
            $this->processor->process($job);
            $job->refresh();
        }

        return response()->json([
            'job_id' => $job->id,
            'status' => $job->status,
            'message' => $auto
                ? 'Image(s) uploaded and analysis '.($job->status === 'completed' ? 'completed' : 'processed')
                : 'Image(s) uploaded. Call POST /jobs/{id}/process to start analysis.',
        ], 202);
    }

    public function process(string $id, Request $request)
    {
        $job = $this->findOwnedJob($request, $id);
        if (! in_array($job->status, ['uploaded', 'failed'], true)) {
            return response()->json([
                'detail' => "Cannot process job in status '{$job->status}'",
            ], 409);
        }
        if (empty($job->image_paths)) {
            return response()->json(['detail' => 'Image no longer available'], 409);
        }

        $job->update(['status' => 'queued', 'error_message' => null]);
        $this->processor->process($job);

        return response()->json([
            'job_id' => $job->id,
            'status' => $job->fresh()->status,
            'message' => 'Analysis processed',
        ]);
    }

    public function status(string $id, Request $request)
    {
        return response()->json($this->findOwnedJob($request, $id)->toStatusArray());
    }

    public function results(string $id, Request $request)
    {
        $job = $this->findOwnedJob($request, $id);
        if ($job->status !== 'completed') {
            return response()->json([
                'detail' => "Results not ready. Current status: {$job->status}",
            ], 409);
        }

        return response()->json($job->toStatusArray());
    }

    public function retry(string $id, Request $request)
    {
        $job = $this->findOwnedJob($request, $id);
        if ($job->status !== 'failed') {
            return response()->json([
                'detail' => "Only failed jobs can be retried (status={$job->status})",
            ], 409);
        }
        if ($job->retry_count >= $job->max_retries) {
            return response()->json([
                'detail' => "Max retries ({$job->max_retries}) reached",
            ], 409);
        }
        if (empty($job->image_paths)) {
            return response()->json([
                'detail' => 'Cannot retry: temporary images already deleted. Re-submit a new job.',
            ], 409);
        }

        $job->update([
            'status' => 'retrying',
            'retry_count' => $job->retry_count + 1,
            'error_message' => null,
            'completed_at' => null,
        ]);
        $this->processor->process($job->fresh());
        $job->refresh();

        return response()->json([
            'job_id' => $job->id,
            'status' => $job->status,
            'retry_count' => $job->retry_count,
            'message' => "Retry {$job->retry_count}/{$job->max_retries} processed",
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $q = AnalysisJob::query()->orderByDesc('created_at');
        if (! $user->isAdmin()) {
            $q->where('user_id', $user->id);
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        $limit = min((int) $request->get('limit', 50), 200);
        $offset = max((int) $request->get('offset', 0), 0);

        return response()->json(
            $q->skip($offset)->take($limit)->get()->map->toStatusArray()
        );
    }

    protected function findOwnedJob(Request $request, string $id): AnalysisJob
    {
        $job = AnalysisJob::findOrFail($id);
        $user = $request->user();
        if (! $user->isAdmin() && $job->user_id !== $user->id) {
            throw new HttpResponseException(response()->json(['detail' => 'Not your job'], 403));
        }

        return $job;
    }
}

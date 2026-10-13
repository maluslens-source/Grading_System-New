<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function pendingUsers()
    {
        $users = User::where('status', 'pending')->orderBy('id')->get()
            ->map(fn (User $u) => $u->toPublicArray());

        return response()->json($users);
    }

    public function listUsers(Request $request)
    {
        $q = User::query()->orderBy('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('org_id')) {
            $q->where('organization_id', $request->integer('org_id'));
        }

        return response()->json($q->get()->map(fn (User $u) => $u->toPublicArray()));
    }

    public function approveUser(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'org_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'role' => ['nullable', 'in:user,admin'],
        ]);

        $user = User::findOrFail($id);
        $user->status = $data['status'];
        if (array_key_exists('org_id', $data) && $data['org_id'] !== null) {
            $user->organization_id = $data['org_id'];
        }
        if (! empty($data['role'])) {
            $user->role = $data['role'];
        }
        $user->save();

        return response()->json(['message' => "User {$id} set to status '{$data['status']}'"]);
    }

    public function updateUser(Request $request, int $id)
    {
        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:200'],
            'role' => ['sometimes', 'in:user,admin'],
            'status' => ['sometimes', 'in:pending,approved,rejected'],
            'org_id' => ['sometimes', 'nullable', 'integer', 'exists:organizations,id'],
        ]);

        $user = User::findOrFail($id);
        if (isset($data['full_name'])) {
            $user->name = $data['full_name'];
        }
        if (isset($data['role'])) {
            $user->role = $data['role'];
        }
        if (isset($data['status'])) {
            $user->status = $data['status'];
        }
        if (array_key_exists('org_id', $data)) {
            $user->organization_id = $data['org_id'];
        }
        $user->save();

        return response()->json($user->toPublicArray());
    }

    public function createOrganization(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:200', 'unique:organizations,name'],
        ]);

        $org = Organization::create([
            'name' => trim($data['name']),
            'subscription_status' => 'inactive',
        ]);

        return response()->json($this->orgPayload($org), 201);
    }

    public function listOrganizations()
    {
        return response()->json(
            Organization::orderBy('id')->get()->map(fn ($o) => $this->orgPayload($o))
        );
    }

    public function getOrganization(int $id)
    {
        return response()->json($this->orgPayload(Organization::findOrFail($id)));
    }

    public function setSubscription(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,inactive,expired'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $org = Organization::findOrFail($id);
        $org->subscription_status = $data['status'];
        $org->subscription_expires_at = $data['expires_at'] ?? null;
        $org->save();

        return response()->json($this->orgPayload($org));
    }

    protected function orgPayload(Organization $org): array
    {
        return [
            'id' => $org->id,
            'name' => $org->name,
            'subscription_status' => $org->subscription_status,
            'subscription_expires_at' => optional($org->subscription_expires_at)?->toIso8601String(),
            'created_at' => optional($org->created_at)?->toIso8601String(),
            'updated_at' => optional($org->updated_at)?->toIso8601String(),
        ];
    }
}

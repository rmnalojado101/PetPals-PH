<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Notification;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Notify all admins about the new user
        $admins = User::where('role', 'admin')->get();
        
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'title' => 'New User Registered',
                'message' => "A new user \"{$user->name}\" with role \"{$user->role}\" has joined the system.",
                'type' => 'system',
                'is_read' => false,
            ]);
        }
    }
}

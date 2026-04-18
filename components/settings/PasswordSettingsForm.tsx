'use client';

import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';

export function PasswordSettingsForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.email) {
      setIsLoading(false);
      toast.error('Could not verify current session.');
      return;
    }

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });

    if (reAuthError) {
      setIsLoading(false);
      toast.error('Current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to update password.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated successfully.');
  };

  return (
    <section className="card settings-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Account Settings</h2>
          <p className="section-subtitle">Change your account password for this internal app.</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            name="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Current password"
            minLength={8}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            minLength={8}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            minLength={8}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}

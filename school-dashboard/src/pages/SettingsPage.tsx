import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { schoolsApi } from '../api';
import { Card, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const { school, updateSchool } = useAuthStore();

  const [profileData, setProfileData] = useState({
    name: school?.name || '',
    contactPerson: school?.contactPerson || '',
    phoneNumber: school?.phoneNumber || '',
    address: school?.address || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!school) throw new Error('No school found');
      const updated = await schoolsApi.update(school.$id, profileData);
      updateSchool(updated);
      return updated;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      await schoolsApi.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/50 mt-1">
          Manage your school profile and account settings
        </p>
      </div>

      <div className="space-y-6">
        {/* School Profile */}
        <Card>
          <CardHeader
            title="School Profile"
            description="Update your school's information"
          />

          <div className="space-y-4">
            <Input
              label="School Name"
              value={profileData.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              placeholder="Enter school name"
              icon={<Building2 className="w-5 h-5" />}
            />

            <Input
              label="Contact Person"
              value={profileData.contactPerson}
              onChange={(e) => handleProfileChange('contactPerson', e.target.value)}
              placeholder="Administrator name"
              icon={<User className="w-5 h-5" />}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={school?.email || ''}
                disabled
                icon={<Mail className="w-5 h-5" />}
                className="opacity-50"
              />

              <Input
                label="Phone"
                value={profileData.phoneNumber}
                onChange={(e) => handleProfileChange('phoneNumber', e.target.value)}
                placeholder="Phone number"
                icon={<Phone className="w-5 h-5" />}
              />
            </div>

            <Input
              label="Address"
              value={profileData.address}
              onChange={(e) => handleProfileChange('address', e.target.value)}
              placeholder="School address"
              icon={<MapPin className="w-5 h-5" />}
            />

            <div className="pt-4">
              <Button
                onClick={() => updateProfileMutation.mutate()}
                isLoading={updateProfileMutation.isPending}
                disabled={updateProfileMutation.isPending}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader
            title="Change Password"
            description="Update your account password"
          />

          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              placeholder="Enter current password"
              icon={<Lock className="w-5 h-5" />}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Enter new password"
                icon={<Shield className="w-5 h-5" />}
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
                icon={<Shield className="w-5 h-5" />}
              />
            </div>

            <p className="text-sm text-white/50">
              Password must be at least 8 characters long
            </p>

            <div className="pt-4">
              <Button
                onClick={() => changePasswordMutation.mutate()}
                isLoading={changePasswordMutation.isPending}
                disabled={
                  changePasswordMutation.isPending ||
                  !passwordData.currentPassword ||
                  !passwordData.newPassword ||
                  !passwordData.confirmPassword
                }
              >
                <Lock className="w-4 h-4" />
                Change Password
              </Button>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader
            title="Account Information"
            description="Your account details"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-300 rounded-xl p-4">
              <p className="text-sm text-white/50 mb-1">School ID</p>
              <p className="text-white font-mono text-sm">{school?.$id}</p>
            </div>

            <div className="bg-dark-300 rounded-xl p-4">
              <p className="text-sm text-white/50 mb-1">Account Created</p>
              <p className="text-white">
                {school?.$createdAt
                  ? new Date(school.$createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
            </div>

            <div className="bg-dark-300 rounded-xl p-4">
              <p className="text-sm text-white/50 mb-1">Account Status</p>
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  school?.isVerified
                    ? 'bg-accent-500/20 text-accent-500'
                    : 'bg-yellow-500/20 text-yellow-500'
                }`}
              >
                {school?.isVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>

            <div className="bg-dark-300 rounded-xl p-4">
              <p className="text-sm text-white/50 mb-1">Subscription Status</p>
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  school?.subscriptionStatus === 'active'
                    ? 'bg-accent-500/20 text-accent-500'
                    : school?.subscriptionStatus === 'trial'
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {school?.subscriptionStatus || 'None'}
              </span>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/20">
          <CardHeader
            title="Danger Zone"
            description="Irreversible account actions"
          />

          <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
            <div>
              <p className="text-white font-medium">Delete Account</p>
              <p className="text-sm text-white/50">
                Permanently delete your school account and all associated data
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
              onClick={() => {
                toast.error('Please contact support to delete your account');
              }}
            >
              Delete Account
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { User, Lock, Shield, Trash2, Save, AlertCircle, CheckCircle, Eye, EyeOff, Camera, X as XIcon } from 'lucide-react';
import { userApi } from '../services/api';
import toast from 'react-hot-toast';
import UnsavedChangesModal from '../components/UnsavedChangesModal';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';

const ProfileSettings = () => {

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    created_at: null,
    profile_image_url: null,
  });

  const [originalProfile, setOriginalProfile] = useState({
    full_name: '',
    email: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const blockerRef = useRef(null);

  // Handle navigation blocking when there are unsaved changes
  useUnsavedChanges(hasUnsavedChanges, (blocker) => {
    blockerRef.current = blocker;
    setShowUnsavedModal(true);
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  // Track changes
  useEffect(() => {
    if (!loading && originalProfile.full_name !== undefined) {
      const changed =
        profile.full_name !== originalProfile.full_name ||
        profile.email !== originalProfile.email;
      setHasUnsavedChanges(changed);
    }
  }, [profile, originalProfile, loading]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile();
      setProfile(response.data);
      setOriginalProfile({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
      });

      // Dispatch event to update sidebar and header
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: response.data }));
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (shouldNavigate = false) => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    const promise = userApi.updateProfile({
      full_name: profile.full_name,
      email: profile.email,
    });

    toast.promise(promise, {
      loading: 'Saving profile...',
      success: () => {
        // Update original profile to match saved state
        setOriginalProfile({
          full_name: profile.full_name,
          email: profile.email,
        });

        setHasUnsavedChanges(false);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);

        // If this save was triggered by navigation, proceed with it
        if (shouldNavigate && blockerRef.current) {
          blockerRef.current.proceed();
          blockerRef.current = null;
        }
        return 'Profile updated successfully!';
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to update profile'
        });
        return err.response?.data?.detail || 'Failed to update profile';
      }
    }).finally(() => {
      setSaving(false);
    });
  };

  const handleDiscard = () => {
    setProfile({
      ...profile,
      full_name: originalProfile.full_name,
      email: originalProfile.email,
    });
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);

    // If there was a pending navigation, proceed with it
    if (blockerRef.current) {
      blockerRef.current.proceed();
      blockerRef.current = null;
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    const promise = userApi.changePassword({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
    });

    toast.promise(promise, {
      loading: 'Changing password...',
      success: () => {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setShowPasswords({ current: false, new: false, confirm: false });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        return 'Password changed successfully!';
      },
      error: (err) => {
        console.error('Error changing password:', err);
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to change password'
        });
        return err.response?.data?.detail || 'Failed to change password';
      }
    }).finally(() => {
      setSaving(false);
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }

    const promise = userApi.deleteAccount();

    toast.promise(promise, {
      loading: 'Deleting account...',
      success: () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return 'Account deleted successfully';
      },
      error: (err) => {
        console.error('Error deleting account:', err);
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to delete account'
        });
        return err.response?.data?.detail || 'Failed to delete account';
      }
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setUploadingImage(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('photo', file);

    const promise = userApi.uploadProfileImage(formData);

    toast.promise(promise, {
      loading: 'Uploading image...',
      success: (response) => {
        setProfile(response.data);
        setMessage({ type: 'success', text: 'Profile image updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);

        // Dispatch event to update sidebar and header
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: response.data }));
        return 'Profile image updated successfully!';
      },
      error: (err) => {
        console.error('Error uploading image:', err);
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to upload image'
        });
        return err.response?.data?.detail || 'Failed to upload image';
      }
    }).finally(() => {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleDeleteImage = async () => {
    setUploadingImage(true);
    setMessage({ type: '', text: '' });

    const promise = userApi.deleteProfileImage();

    toast.promise(promise, {
      loading: 'Deleting image...',
      success: (response) => {
        setProfile(response.data);
        setMessage({ type: 'success', text: 'Profile image removed successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);

        // Dispatch event to update sidebar and header
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: response.data }));
        return 'Profile image removed successfully!';
      },
      error: (err) => {
        console.error('Error deleting image:', err);
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to delete image'
        });
        return err.response?.data?.detail || 'Failed to delete image';
      }
    }).finally(() => {
      setUploadingImage(false);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Profile Settings
            </h1>
            <p className="text-lg text-gray-600">
              Manage your account and preferences
            </p>
          </div>
          {hasUnsavedChanges && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-amber-800">Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Banner (Mobile) */}
      {hasUnsavedChanges && (
        <div className="md:hidden mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-amber-800">You have unsaved changes</span>
        </div>
      )}

      {/* Success/Error Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </h2>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="h-5 w-5" />
              Change Password
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border-2 border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </h2>
            <p className="text-gray-600 mb-4">
              Once you delete your account, there is no going back. All your data will be permanently removed.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Profile Picture & Quick Actions */}
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
            <div className="flex flex-col items-center">
              <div className="relative group">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                    {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : profile.email ? profile.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="mt-4 flex gap-2">
                {profile.profile_image_url ? (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Update
                    </button>
                    <button
                      onClick={handleDeleteImage}
                      disabled={uploadingImage}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <XIcon className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Upload Photo
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                JPG, PNG or GIF (max 5MB)
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="font-medium text-gray-900 truncate ml-2">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">{formatDate(profile.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Status</span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="font-medium text-gray-900">Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Save Button - Only show when there are changes */}
          {hasUnsavedChanges && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full px-6 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-slow"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={() => {
          setShowUnsavedModal(false);
          handleSave(true);
        }}
        onDiscard={handleDiscard}
        onCancel={() => {
          setShowUnsavedModal(false);
          if (blockerRef.current) {
            blockerRef.current.reset();
            blockerRef.current = null;
          }
        }}
        saving={saving}
      />

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                  setShowPasswords({ current: false, new: false, confirm: false });
                  setMessage({ type: '', text: '' });
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Delete Account</h2>
            </div>
            <div className="p-4 md:p-6">
              <p className="text-gray-600 mb-4">
                Are you absolutely sure? This action cannot be undone. All your data, including interaction history, contacts, and settings will be permanently deleted.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  Type "DELETE" to confirm
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-2 bg-white border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setMessage({ type: '', text: '' });
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;

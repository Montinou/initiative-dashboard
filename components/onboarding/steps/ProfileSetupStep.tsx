'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, Phone, FileText } from 'lucide-react';

interface ProfileSetupStepProps {
  userProfile: any;
  profileData: any;
  onUpdateProfile: (data: any) => void;
  onNext: () => void;
}

export default function ProfileSetupStep({ 
  userProfile, 
  profileData,
  onUpdateProfile,
  onNext 
}: ProfileSetupStepProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localData, setLocalData] = useState({
    fullName: profileData.fullName || userProfile.full_name || '',
    phone: profileData.phone || userProfile.phone || '',
    bio: profileData.bio || '',
    avatar: profileData.avatar || userProfile.avatar_url || ''
  });

  const handleSave = async () => {
    setIsUpdating(true);
    
    try {
      // Update profile via API
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: userProfile.id,
          updates: {
            full_name: localData.fullName,
            phone: localData.phone,
            avatar_url: localData.avatar,
            metadata: {
              bio: localData.bio
            }
          }
        })
      });

      if (response.ok) {
        onUpdateProfile(localData);
        onNext();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complete Your Profile
        </h2>
        <p className="text-gray-600">
          Help your teammates get to know you better
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center space-x-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={localData.avatar} />
              <AvatarFallback className="text-2xl">
                {getInitials(localData.fullName || userProfile.email)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <Label htmlFor="avatar">Profile Picture</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // In production, this would open a file picker
                    alert('File upload would be implemented here');
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
                <span className="text-sm text-gray-500">
                  or use your current avatar
                </span>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">
              <User className="w-4 h-4 inline mr-1" />
              Full Name
            </Label>
            <Input
              id="fullName"
              value={localData.fullName}
              onChange={(e) => setLocalData({...localData, fullName: e.target.value})}
              placeholder="Enter your full name"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number <span className="text-gray-500">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={localData.phone}
              onChange={(e) => setLocalData({...localData, phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
            <p className="text-xs text-gray-500">
              Only visible to your team members
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              <FileText className="w-4 h-4 inline mr-1" />
              About You <span className="text-gray-500">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={localData.bio}
              onChange={(e) => setLocalData({...localData, bio: e.target.value})}
              placeholder="Tell us a bit about yourself, your experience, and what you're excited about..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {localData.bio.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role & Department Info */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <h3 className="font-medium text-gray-900 mb-3">Your Position</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium">{userProfile.role}</span>
            </div>
            {userProfile.area && (
              <div className="flex justify-between">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium">{userProfile.area.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{userProfile.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isUpdating || !localData.fullName}
          size="lg"
        >
          {isUpdating ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
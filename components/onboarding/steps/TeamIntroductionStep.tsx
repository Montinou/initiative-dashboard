'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, UserCheck } from 'lucide-react';

interface TeamIntroductionStepProps {
  userProfile: any;
  teamMembers: any[];
  onNext: () => void;
}

export default function TeamIntroductionStep({ 
  userProfile, 
  teamMembers,
  onNext 
}: TeamIntroductionStepProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-purple-100 text-purple-800';
      case 'Admin':
        return 'bg-blue-100 text-blue-800';
      case 'Manager':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const manager = userProfile.area?.manager;
  const otherTeamMembers = teamMembers.filter(member => 
    member.id !== manager?.id
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-green-600 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Meet Your Team
        </h2>
        <p className="text-gray-600">
          {userProfile.area 
            ? `These are the people you'll be working with in ${userProfile.area.name}`
            : 'Get to know your colleagues'
          }
        </p>
      </div>

      {/* Manager Card */}
      {manager && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Your Manager</h3>
              <UserCheck className="w-5 h-5 text-indigo-600" />
            </div>
            
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={manager.avatar_url} />
                <AvatarFallback className="text-lg">
                  {getInitials(manager.full_name || manager.email)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {manager.full_name || manager.email}
                </h4>
                <p className="text-sm text-gray-600">{manager.email}</p>
                <Badge className={`mt-2 ${getRoleBadgeColor('Manager')}`}>
                  Area Manager
                </Badge>
              </div>
              
              <a
                href={`mailto:${manager.email}`}
                className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5 text-indigo-600" />
              </a>
            </div>
            
            <p className="mt-4 text-sm text-gray-600 italic">
              Feel free to reach out if you have any questions!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      {otherTeamMembers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Your Teammates ({otherTeamMembers.length})
            </h3>
            
            <div className="space-y-4">
              {otherTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>
                      {getInitials(member.full_name || member.email)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {member.full_name || member.email}
                    </h4>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  
                  <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No team members message */}
      {teamMembers.length === 0 && !manager && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              You'll meet your team members as they join the organization.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Organization Overview */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            About {userProfile.tenant?.organization?.name}
          </h3>
          {userProfile.tenant?.organization?.description ? (
            <p className="text-sm text-gray-600">
              {userProfile.tenant.organization.description}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Welcome to our organization! We're excited to have you as part of the team.
            </p>
          )}
          
          {userProfile.tenant?.organization?.website && (
            <a 
              href={userProfile.tenant.organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
            >
              Visit our website →
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Calendar, TrendingUp, CheckCircle2, Circle } from 'lucide-react';

interface FirstTasksStepProps {
  userProfile: any;
  initialTasks: any[];
  onNext: () => void;
}

export default function FirstTasksStep({ 
  userProfile, 
  initialTasks,
  onNext 
}: FirstTasksStepProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusColor = (progress: number) => {
    if (progress >= 75) return 'text-green-600 bg-green-50';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-50';
    if (progress >= 25) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your First Initiatives
        </h2>
        <p className="text-gray-600">
          {initialTasks.length > 0 
            ? `Here are the initiatives you'll be working on in ${userProfile.area?.name || 'your area'}`
            : 'You'll be assigned to initiatives soon'
          }
        </p>
      </div>

      {/* Active Initiatives */}
      {initialTasks.length > 0 ? (
        <div className="space-y-4">
          {initialTasks.map((task) => {
            const daysRemaining = task.due_date ? getDaysRemaining(task.due_date) : null;
            const activitiesCount = task.activities?.[0]?.count || 0;
            
            return (
              <Card key={task.id} className="overflow-hidden">
                <div className={`h-1 ${task.progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} />
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    
                    <Badge className={getStatusColor(task.progress)}>
                      {task.progress}% Complete
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <Progress value={task.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{activitiesCount} activities</span>
                      <span>{Math.round(activitiesCount * task.progress / 100)} completed</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-sm">
                    {task.due_date && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Due {formatDate(task.due_date)}</span>
                        {daysRemaining !== null && (
                          <Badge 
                            variant="outline" 
                            className={`ml-2 ${daysRemaining <= 7 ? 'text-red-600' : ''}`}
                          >
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center text-gray-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span>In Progress</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">
              No initiatives assigned yet
            </p>
            <p className="text-sm text-gray-500">
              Your manager will assign you to initiatives based on your role and area.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Quick Tips for Success
          </h3>
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-gray-600">
                Check your dashboard daily for updates on initiatives and activities
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-gray-600">
                Collaborate with your team members on shared initiatives
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-gray-600">
                Update your progress regularly to keep everyone informed
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-gray-600">
                Don't hesitate to ask your manager if you need help
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific information */}
      {userProfile.role === 'Manager' && (
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              As a Manager, you'll be able to:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <Circle className="w-1.5 h-1.5 mt-1.5 fill-current" />
                <span>Create and manage initiatives for your area</span>
              </li>
              <li className="flex items-start space-x-2">
                <Circle className="w-1.5 h-1.5 mt-1.5 fill-current" />
                <span>Assign activities to team members</span>
              </li>
              <li className="flex items-start space-x-2">
                <Circle className="w-1.5 h-1.5 mt-1.5 fill-current" />
                <span>Track progress and generate reports</span>
              </li>
              <li className="flex items-start space-x-2">
                <Circle className="w-1.5 h-1.5 mt-1.5 fill-current" />
                <span>View analytics for your area's performance</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
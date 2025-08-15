'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Clock, 
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InvitationStatsProps {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    acceptanceRate: number;
  };
}

export default function InvitationStats({ stats }: InvitationStatsProps) {
  const t = useTranslations('invitations');
  
  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return {
      value: Math.abs(change).toFixed(1),
      isPositive,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-600' : 'text-red-600'
    };
  };

  const statsCards = [
    {
      title: t('stats.total'),
      value: stats.total,
      icon: Users,
      description: 'All time invitations sent',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    {
      title: t('stats.pending'),
      value: stats.pending,
      icon: Clock,
      description: 'Awaiting response',
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      showWarning: stats.pending > 10
    },
    {
      title: t('stats.accepted'),
      value: stats.accepted,
      icon: UserCheck,
      description: 'Successfully joined',
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700'
    },
    {
      title: t('stats.expired'),
      value: stats.expired,
      icon: AlertCircle,
      description: 'Need to resend',
      color: 'bg-red-500',
      lightColor: 'bg-red-100',
      textColor: 'text-red-700',
      showWarning: stats.expired > 5
    }
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.lightColor}`}>
                  <Icon className={`h-4 w-4 ${stat.textColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  {stat.showWarning && (
                    <div className="flex items-center text-xs text-orange-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Action needed
                    </div>
                  )}
                </div>
              </CardContent>
              {/* Decorative gradient bar */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.color}`} />
            </Card>
          );
        })}
      </div>

      {/* Acceptance Rate Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('stats.acceptanceRate')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Percentage of invitations that were accepted
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{stats.acceptanceRate}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.accepted} of {stats.total}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={stats.acceptanceRate} className="h-3" />
            
            <div className="grid grid-cols-3 gap-4 text-center pt-2">
              <div>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.accepted}
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.accepted')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-yellow-600">
                  {stats.pending}
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.pending')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-red-600">
                  {stats.expired}
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.expired')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Based on Stats */}
      {(stats.expired > 0 || stats.pending > 10) && (
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.expired > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium">
                      {stats.expired} expired invitation{stats.expired > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    Resend →
                  </button>
                </div>
              )}
              
              {stats.pending > 10 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm font-medium">
                      {stats.pending} pending invitation{stats.pending > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    Send reminders →
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
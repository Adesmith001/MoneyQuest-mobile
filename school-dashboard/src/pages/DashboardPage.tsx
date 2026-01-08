import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { statsApi, codesApi } from '../api';
import { formatCurrency, formatDate, getDaysRemaining } from '../lib/utils';
import StatCard from '../components/ui/StatCard';
import { Card, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Users,
  CreditCard,
  TrendingUp,
  ShoppingCart,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { school } = useAuthStore();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', school?.$id],
    queryFn: () => statsApi.get(school!.$id),
    enabled: !!school?.$id,
  });

  const { data: codes, isLoading: codesLoading } = useQuery({
    queryKey: ['codes', school?.$id],
    queryFn: () => codesApi.getAll(school!.$id),
    enabled: !!school?.$id,
  });

  const recentCodes = codes?.slice(0, 5) || [];
  const expiringCodes = codes?.filter(
    (c) => c.status === 'active' && getDaysRemaining(c.expirationDate) <= 30
  ) || [];

  if (statsLoading || codesLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {school?.contactPerson?.split(' ')[0]}!
          </h1>
          <p className="text-white/50 mt-1">
            Here's what's happening with your school subscriptions
          </p>
        </div>
        <Button onClick={() => navigate('/buy-seats')}>
          <ShoppingCart className="w-4 h-4" />
          Buy Seats
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Codes"
          value={stats?.activeCodes || 0}
          description={`of ${stats?.totalCodes || 0} total`}
          icon={QrCode}
          iconClassName="bg-primary-500/20"
        />
        <StatCard
          title="Active Students"
          value={stats?.activeStudents || 0}
          description={`of ${stats?.totalStudents || 0} enrolled`}
          icon={Users}
          iconClassName="bg-accent-500/20"
        />
        <StatCard
          title="Seats Available"
          value={stats?.seatsAvailable || 0}
          description={`of ${stats?.totalSeatsPurchased || 0} purchased`}
          icon={TrendingUp}
          iconClassName="bg-green-500/20"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(stats?.totalSpent || 0)}
          description="All time"
          icon={CreditCard}
          iconClassName="bg-purple-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Codes */}
        <Card>
          <CardHeader
            title="Recent Codes"
            description="Your latest enrollment codes"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/codes')}>
                View all
              </Button>
            }
          />
          {recentCodes.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No codes yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/buy-seats')}
              >
                Buy your first seats
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCodes.map((code) => (
                <div
                  key={code.$id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                >
                  <div>
                    <p className="font-mono text-white font-medium">{code.code}</p>
                    <p className="text-sm text-white/50">{code.name}</p>
                  </div>
                  <div className="text-right">
                    <Badge status={code.status} />
                    <p className="text-xs text-white/40 mt-1">
                      {code.seatsUsed}/{code.seatsPurchased} seats
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader
            title="Expiring Soon"
            description="Codes expiring in the next 30 days"
            action={
              expiringCodes.length > 0 ? (
                <span className="flex items-center gap-1 text-sm text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  {expiringCodes.length} code{expiringCodes.length !== 1 ? 's' : ''}
                </span>
              ) : null
            }
          />
          {expiringCodes.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No codes expiring soon</p>
              <p className="text-sm text-white/30 mt-1">
                All your codes are valid for more than 30 days
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringCodes.slice(0, 5).map((code) => {
                const daysLeft = getDaysRemaining(code.expirationDate);
                return (
                  <div
                    key={code.$id}
                    className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
                  >
                    <div>
                      <p className="font-mono text-white font-medium">{code.code}</p>
                      <p className="text-sm text-white/50">{code.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-yellow-400 font-medium">
                        {daysLeft} days left
                      </p>
                      <p className="text-xs text-white/40">
                        Expires {formatDate(code.expirationDate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

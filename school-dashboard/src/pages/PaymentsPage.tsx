import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { paymentsApi } from '../api';
import { formatCurrency, formatDateTime } from '../lib/utils';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { CreditCard, Download, Receipt } from 'lucide-react';

export default function PaymentsPage() {
  const { school } = useAuthStore();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', school?.$id],
    queryFn: () => paymentsApi.getAll(school!.$id),
    enabled: !!school?.$id,
  });

  const successfulPayments = payments?.filter((p) => p.status === 'success') || [];
  const totalSpent = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-white">Payment History</h1>
          <p className="text-white/50 mt-1">
            View all your subscription payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-white/50">Total Spent</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-white/50">Successful Payments</p>
              <p className="text-2xl font-bold text-white">{successfulPayments.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-accent-500" />
            </div>
            <div>
              <p className="text-sm text-white/50">Total Payments</p>
              <p className="text-2xl font-bold text-white">{payments?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      {payments?.length === 0 ? (
        <Card className="text-center py-12">
          <CreditCard className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No payments yet</h3>
          <p className="text-white/50">
            Your payment history will appear here once you purchase seats
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Reference
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Amount
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Seats
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Plan
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Date
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments?.map((payment) => (
                  <tr
                    key={payment.$id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-mono">
                        {payment.transactionReference.slice(0, 16)}...
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-medium">
                        {formatCurrency(payment.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white/70">{payment.seats} seats</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white/70 capitalize">{payment.planType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white/70">
                        {formatDateTime(payment.createdAt)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

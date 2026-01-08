import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { codesApi, studentsApi } from '../api';
import { formatCurrency, formatDate, getDaysRemaining } from '../lib/utils';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { SchoolCode } from '../types';
import toast from 'react-hot-toast';
import {
  QrCode,
  Copy,
  RotateCw,
  Pause,
  Play,
  Search,
  Users,
  Calendar,
  Eye,
  X,
} from 'lucide-react';

export default function CodesPage() {
  const { school } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState<SchoolCode | null>(null);

  const { data: codes, isLoading } = useQuery({
    queryKey: ['codes', school?.$id],
    queryFn: () => codesApi.getAll(school!.$id),
    enabled: !!school?.$id,
  });

  const { data: codeStudents } = useQuery({
    queryKey: ['code-students', selectedCode?.$id],
    queryFn: () => studentsApi.getByCode(selectedCode!.$id),
    enabled: !!selectedCode?.$id,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ codeId, status }: { codeId: string; status: 'active' | 'suspended' }) =>
      codesApi.toggleStatus(codeId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes'] });
      toast.success('Code status updated');
    },
    onError: () => {
      toast.error('Failed to update code status');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (codeId: string) => codesApi.regenerateCode(codeId),
    onSuccess: (newCode) => {
      queryClient.invalidateQueries({ queryKey: ['codes'] });
      toast.success(`New code: ${newCode.code}`);
    },
    onError: () => {
      toast.error('Failed to regenerate code');
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const filteredCodes = codes?.filter(
    (code) =>
      code.code.toLowerCase().includes(search.toLowerCase()) ||
      code.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
          <h1 className="text-2xl font-bold text-white">Enrollment Codes</h1>
          <p className="text-white/50 mt-1">
            Manage your student enrollment codes
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-5 h-5" />}
          className="max-w-md"
        />
      </div>

      {/* Codes Grid */}
      {filteredCodes.length === 0 ? (
        <Card className="text-center py-12">
          <QrCode className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No codes found</h3>
          <p className="text-white/50 mb-6">
            {codes?.length === 0
              ? 'Purchase seats to generate enrollment codes'
              : 'No codes match your search'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCodes.map((code) => {
            const daysLeft = getDaysRemaining(code.expirationDate);
            const isExpiring = daysLeft <= 30 && code.status === 'active';

            return (
              <Card
                key={code.$id}
                className={`relative ${isExpiring ? 'border-yellow-500/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge status={code.status} />
                    <p className="text-xs text-white/40 mt-1">
                      {code.planType === 'annual' ? 'Annual' : 'Monthly'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCode(code)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {/* Code Display */}
                <div className="bg-dark-300 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xl font-bold text-white">{code.code}</p>
                    <button
                      onClick={() => copyToClipboard(code.code)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                </div>

                <p className="font-medium text-white mb-3">{code.name}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/70">
                      {code.seatsUsed}/{code.seatsPurchased}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className={`text-sm ${isExpiring ? 'text-yellow-400' : 'text-white/70'}`}>
                      {daysLeft}d left
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/40 mb-4">
                  Expires: {formatDate(code.expirationDate)}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        codeId: code.$id,
                        status: code.status === 'active' ? 'suspended' : 'active',
                      })
                    }
                    disabled={code.status === 'expired' || code.status === 'depleted'}
                  >
                    {code.status === 'active' ? (
                      <>
                        <Pause className="w-3 h-3" /> Suspend
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateMutation.mutate(code.$id)}
                  >
                    <RotateCw className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Code Details Modal */}
      {selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Code Details</h3>
              <button
                onClick={() => setSelectedCode(null)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-dark-300 rounded-xl p-4 text-center">
                <p className="font-mono text-2xl font-bold text-white">
                  {selectedCode.code}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/50">Name</p>
                  <p className="font-medium text-white">{selectedCode.name}</p>
                </div>
                <div>
                  <p className="text-sm text-white/50">Status</p>
                  <Badge status={selectedCode.status} className="mt-1" />
                </div>
                <div>
                  <p className="text-sm text-white/50">Seats Used</p>
                  <p className="font-medium text-white">
                    {selectedCode.seatsUsed} / {selectedCode.seatsPurchased}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/50">Price Paid</p>
                  <p className="font-medium text-white">
                    {formatCurrency(selectedCode.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/50">Activated</p>
                  <p className="font-medium text-white">
                    {formatDate(selectedCode.activationDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/50">Expires</p>
                  <p className="font-medium text-white">
                    {formatDate(selectedCode.expirationDate)}
                  </p>
                </div>
              </div>

              {/* Enrolled Students */}
              <div className="mt-6">
                <p className="text-sm text-white/50 mb-3">
                  Enrolled Students ({codeStudents?.length || 0})
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {codeStudents?.length === 0 ? (
                    <p className="text-center text-white/40 py-4">No students enrolled yet</p>
                  ) : (
                    codeStudents?.map((student) => (
                      <div
                        key={student.$id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-white">Student ID: {student.userId}</p>
                          <p className="text-xs text-white/50">
                            Enrolled: {formatDate(student.enrolledAt)}
                          </p>
                        </div>
                        <Badge status={student.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setSelectedCode(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

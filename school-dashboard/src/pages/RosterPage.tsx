import { ChangeEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { paymentsApi, schoolInvitesApi, RosterRow, SchoolInvite } from '../api';
import { SCHOOL_PRICING } from '../config';
import { calculatePrice, formatCurrency } from '../lib/utils';
import { generateReference, initializeKoraPayCheckout } from '../lib/korapay';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardHeader } from '../components/ui/Card';
import { FileSpreadsheet, Upload, Users, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

function parseRosterText(value: string): RosterRow[] {
  const rows: RosterRow[] = [];
  const seen = new Set<string>();

  value.split(/\r?\n/).forEach((line, index) => {
    const parts = line.split(/[,;\t]/).map((part) => part.trim().replace(/^"|"$/g, ''));
    const email = parts.find((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part.toLowerCase()))?.toLowerCase();
    if (!email || seen.has(email)) return;
    if (index === 0 && email === 'email') return;
    seen.add(email);
    rows.push({
      email,
      studentName: parts[0]?.toLowerCase() === email ? '' : parts[0],
      className: parts.length > 2 ? parts[2] : '',
    });
  });

  return rows;
}

export default function RosterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { school } = useAuthStore();
  const [rosterName, setRosterName] = useState('Student Roster');
  const [planType, setPlanType] = useState<'monthly' | 'annual'>('annual');
  const [rosterText, setRosterText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const batchId = searchParams.get('batchId');
  const { data: invites } = useQuery({
    queryKey: ['school-invites', school?.$id, batchId],
    queryFn: () => schoolInvitesApi.list(school!.$id, batchId!),
    enabled: Boolean(school?.$id && batchId),
    refetchInterval: batchId ? 5000 : false,
  });
  const rows = useMemo(() => parseRosterText(rosterText), [rosterText]);
  const plan = SCHOOL_PRICING[planType];
  const pricing = calculatePrice(planType, rows.length);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setRosterText(await file.text());
  };

  const handlePayment = async () => {
    if (!school || rows.length === 0) {
      toast.error('Add at least one valid student email');
      return;
    }

    setIsProcessing(true);
    const reference = generateReference();
    const expiresAt = new Date();
    if (planType === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    try {
      const batch = await schoolInvitesApi.prepareRoster({
        schoolId: school.$id,
        name: rosterName,
        planType,
        expiresAt: expiresAt.toISOString(),
        paymentReference: reference,
        rows,
      });
      await paymentsApi.createPending(school.$id, rows.length, planType, reference, rosterName, batch.batchId);
      await initializeKoraPayCheckout({
        amount: pricing.totalPrice,
        schoolName: school.name,
        schoolEmail: school.email,
        schoolId: school.$id,
        reference,
        seats: rows.length,
        planType,
        codeName: rosterName,
        rosterBatchId: batch.batchId,
        onSuccess: () => {
          toast.success('Payment received. Invites will activate shortly.');
          setIsProcessing(false);
          navigate(`/roster?batchId=${batch.batchId}`);
        },
        onFailed: () => {
          toast.error('Payment failed. No student access was activated.');
          setIsProcessing(false);
        },
        onClose: () => setIsProcessing(false),
      });
    } catch (error: any) {
      toast.error(error.message || 'Could not start roster payment');
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Student Roster</h1>
        <p className="text-white/50 mt-1">Buy seats for named students and generate personal fallback codes.</p>
      </div>

      <Card>
        <CardHeader title="Upload students" description="Use a CSV with email, name, and class columns, or paste emails one per line." />
        <div className="space-y-6">
          <Input label="Roster name" value={rosterName} onChange={(event) => setRosterName(event.target.value)} />
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white cursor-pointer hover:bg-white/5">
              <Upload className="w-4 h-4" /> Upload CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
            <div className="flex items-center gap-2 text-sm text-white/50"><FileSpreadsheet className="w-4 h-4" /> CSV or pasted email list</div>
          </div>
          <textarea
            value={rosterText}
            onChange={(event) => setRosterText(event.target.value)}
            placeholder={'email,name,class\nstudent@example.com,Student Name,JSS 2'}
            className="w-full min-h-56 rounded-xl bg-dark-300 border border-white/10 text-white p-4 outline-none focus:border-primary-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 rounded-xl p-4">
            <div><p className="text-white/50 text-sm">Valid students</p><p className="text-2xl font-bold text-white">{rows.length}</p></div>
            <div><p className="text-white/50 text-sm">Plan</p><select value={planType} onChange={(event) => setPlanType(event.target.value as 'monthly' | 'annual')} className="mt-1 bg-dark-300 text-white rounded-lg p-2"><option value="annual">Annual</option><option value="monthly">Monthly</option></select></div>
            <div><p className="text-white/50 text-sm">Total</p><p className="text-2xl font-bold text-white">{formatCurrency(pricing.totalPrice)}</p><p className="text-xs text-white/50">{formatCurrency(plan.pricePerSeat)} per seat</p></div>
          </div>
          <Button onClick={handlePayment} isLoading={isProcessing} disabled={rows.length === 0}>
            <Users className="w-4 h-4" /> Pay for {rows.length} seats <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {batchId && (
        <Card className="mt-6">
          <CardHeader title="Personal invite codes" description="Share each code with its matching student if email claiming is unavailable." />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-white/10 text-white/50 text-sm"><th className="py-3 pr-4">Student</th><th className="py-3 pr-4">Email</th><th className="py-3 pr-4">Code</th><th className="py-3">Status</th></tr></thead>
              <tbody>
                {(invites || []).map((invite: SchoolInvite) => (
                  <tr key={invite.$id} className="border-b border-white/5 text-sm">
                    <td className="py-3 pr-4 text-white">{invite.studentName || 'Student'}</td>
                    <td className="py-3 pr-4 text-white/70">{invite.email}</td>
                    <td className="py-3 pr-4 font-mono text-white">{invite.inviteCode || invite.codeLast4 || 'Pending'}</td>
                    <td className="py-3 text-white/70">{invite.status}</td>
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

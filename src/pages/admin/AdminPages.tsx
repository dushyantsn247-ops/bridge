import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type {
  AuditLogEntry,
  Campaign,
  DisputeRecord,
  User,
  VerificationRequest,
} from '../../types/domain';

export const AdminControlCenterPage: React.FC = () => {
  const { showToast } = useApp();
  const location = useLocation();
  const section = location.pathname.split('/')[2] || 'overview';

  const [metrics, setMetrics] = useState({
    totalCreators: 0,
    totalBrands: 0,
    activeCampaigns: 0,
    activeDeals: 0,
    completedDeals: 0,
    simulatedTransactionVolumeINR: 0,
    openDisputes: 0,
    pendingVerifications: 0,
    matchToApplicationRatePct: 38.4,
    avgDaysToFirstDeal: 4.2,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const loadAdmin = useCallback(async () => {
    try {
      const res = await api.getAdminOverview();
      setMetrics(res.metrics);
      setUsers(res.users);
      setVerifications(res.verifications);
      setCampaigns(res.campaigns);
      setDisputes(res.disputes);
      setAuditLogs(res.auditLogs);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const handleDecideVerification = async (
    id: string,
    decision: 'verified' | 'rejected'
  ) => {
    try {
      await api.decideVerification(id, {
        decision,
        adminNote:
          noteById[id] ||
          (decision === 'verified'
            ? 'Documentation verified by Bridge Trust & Safety.'
            : 'Please resubmit clearer 30-day insights proof.'),
      });
      showToast(`Verification marked ${decision}`, 'success');
      loadAdmin();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleModerateCampaign = async (
    id: string,
    status: Campaign['status']
  ) => {
    await api.moderateCampaign(id, status);
    showToast(`Campaign updated to ${status}`, 'info');
    loadAdmin();
  };

  const handleResolveDispute = async (
    id: string,
    outcome: 'Resolved - Released to Creator' | 'Resolved - Refunded to Brand'
  ) => {
    await api.resolveDispute(id, {
      outcome,
      resolutionNote:
        noteById[id] || 'Reviewed Deal Room submission history & scope terms.',
    });
    showToast(`Dispute resolved: ${outcome}`, 'success');
    loadAdmin();
  };

  const handleToggleSuspend = async (id: string) => {
    await api.toggleSuspendUser(id);
    showToast('Account suspension status updated', 'info');
    loadAdmin();
  };

  return (
    <DashboardLayout
      title="Admin Control Center"
      subtitle="Backend-enforced marketplace governance, verification queue, dispute resolution, and audit logs."
    >
      {loading ? (
        <div className="h-72 rounded-xl bg-[#101426] animate-pulse" />
      ) : (
        <div className="space-y-8">
          {/* Metrics Grid */}
          {(section === 'overview' || !section) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="rounded-xl bg-[#101426] border border-white/8 p-4">
                <p className="text-xs text-[#9295A9]">Total Creators</p>
                <p className="font-mono-tabular text-2xl font-bold mt-1">
                  {metrics.totalCreators}
                </p>
              </div>
              <div className="rounded-xl bg-[#101426] border border-white/8 p-4">
                <p className="text-xs text-[#9295A9]">Total Brands</p>
                <p className="font-mono-tabular text-2xl font-bold mt-1">
                  {metrics.totalBrands}
                </p>
              </div>
              <div className="rounded-xl bg-[#101426] border border-white/8 p-4">
                <p className="text-xs text-[#9295A9]">Active Campaigns</p>
                <p className="font-mono-tabular text-2xl font-bold text-[#00D5FF] mt-1">
                  {metrics.activeCampaigns}
                </p>
              </div>
              <div className="rounded-xl bg-[#101426] border border-white/8 p-4">
                <p className="text-xs text-[#9295A9]">Simulated Volume (INR)</p>
                <p className="font-mono-tabular text-xl font-bold text-[#34D399] mt-1">
                  ₹{metrics.simulatedTransactionVolumeINR.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl bg-[#101426] border border-white/8 p-4">
                <p className="text-xs text-[#9295A9]">Open Disputes / Verif.</p>
                <p className="font-mono-tabular text-2xl font-bold text-[#F59E0B] mt-1">
                  {metrics.openDisputes} / {metrics.pendingVerifications}
                </p>
              </div>
            </div>
          )}

          {/* Verification Queue */}
          {(section === 'overview' || section === 'verifications') && (
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                Identity & Insights Verification Queue
              </h2>
              <div className="space-y-3">
                {verifications.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl bg-[#0B0D18] border border-white/8 p-4 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#F5F5FA]">
                          {v.userName} ({v.userRole.toUpperCase()})
                        </p>
                        <p className="text-[#9295A9]">
                          {v.documentType} ·{' '}
                          <span className="font-mono-tabular text-[#00D5FF]">
                            {v.documentReference}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`font-semibold uppercase ${
                          v.status === 'verified'
                            ? 'text-[#34D399]'
                            : v.status === 'rejected'
                            ? 'text-[#EF4444]'
                            : 'text-[#F59E0B]'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    {v.status === 'pending' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/6">
                        <input
                          type="text"
                          value={noteById[v.id] || ''}
                          onChange={(e) =>
                            setNoteById({ ...noteById, [v.id]: e.target.value })
                          }
                          placeholder="Admin decision note..."
                          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#050509] border border-white/12"
                        />
                        <button
                          type="button"
                          onClick={() => handleDecideVerification(v.id, 'verified')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#34D399] text-[#050509] font-bold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Badge
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecideVerification(v.id, 'rejected')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-[#EF4444] text-[#EF4444] font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disputes Resolution */}
          {(section === 'overview' || section === 'disputes') && (
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#F59E0B]" />
                Dispute Resolution Center
              </h2>
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl bg-[#0B0D18] border border-white/8 p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#F5F5FA]">{d.campaignTitle}</p>
                      <p className="text-[#9295A9]">
                        Raised by {d.raisedByName} ({d.raisedByRole}) · ₹
                        {d.amountInDisputeINR.toLocaleString('en-IN')} Simulated Escrow
                      </p>
                    </div>
                    <span className="font-semibold text-[#F59E0B]">{d.status}</span>
                  </div>
                  <p className="text-[#9295A9]">{d.details}</p>

                  {d.status === 'Open' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/6">
                      <input
                        type="text"
                        value={noteById[d.id] || ''}
                        onChange={(e) =>
                          setNoteById({ ...noteById, [d.id]: e.target.value })
                        }
                        placeholder="Resolution note..."
                        className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#050509] border border-white/12"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveDispute(d.id, 'Resolved - Released to Creator')
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#34D399] text-[#050509] font-bold cursor-pointer"
                      >
                        Release Simulated Funds to Creator
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveDispute(d.id, 'Resolved - Refunded to Brand')
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#246BFD] text-[#F5F5FA] font-semibold cursor-pointer"
                      >
                        Refund Simulated Funds to Brand
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Campaign Moderation */}
          {section === 'campaigns' && (
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-3">
              <h2 className="font-display text-lg font-bold">Campaign Moderation</h2>
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/8 text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#F5F5FA]">{c.title}</p>
                    <p className="text-[#9295A9]">
                      {c.brandName} · Status: {c.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleModerateCampaign(c.id, 'Active')}
                      className="px-3 py-1 rounded bg-[#171B2C] hover:bg-[#34D399] hover:text-[#050509] cursor-pointer"
                    >
                      Approve Active
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerateCampaign(c.id, 'Under Moderation')}
                      className="px-3 py-1 rounded border border-[#F59E0B] text-[#F59E0B] cursor-pointer"
                    >
                      Hold for Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Management */}
          {section === 'users' && (
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-3">
              <h2 className="font-display text-lg font-bold">
                Platform Users ({users.length})
              </h2>
              <div className="divide-y divide-white/8 text-xs">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-[#F5F5FA]">
                        {u.fullName}{' '}
                        <span className="text-[#9295A9]">
                          ({u.email}) · {u.role.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-[#9295A9]">
                        {u.isDemo ? 'Demo Environment Account' : 'Live Registered User'} ·{' '}
                        {u.suspended ? 'SUSPENDED' : 'Active'}
                      </p>
                    </div>
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(u.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          u.suspended
                            ? 'bg-[#34D399] text-[#050509]'
                            : 'border border-[#EF4444]/60 text-[#EF4444]'
                        }`}
                      >
                        {u.suspended ? 'Reinstate' : 'Suspend'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {(section === 'overview' || section === 'audit') && (
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-3">
              <h2 className="font-display text-lg font-bold">Immutable Audit Logs</h2>
              <div className="divide-y divide-white/8 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex justify-between gap-4">
                    <div>
                      <span className="font-mono-tabular text-[#00D5FF] font-semibold">
                        {log.action}
                      </span>{' '}
                      <span className="text-[#F5F5FA]">{log.summary}</span>
                    </div>
                    <span className="text-[#9295A9] shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

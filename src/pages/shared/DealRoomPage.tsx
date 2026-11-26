import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Handshake,
  Send,
  ShieldCheck,
  Star,
  Upload,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Conversation, Deal, Message, ReviewRecord } from '../../types/domain';

export const DealsListPage: React.FC = () => {
  const { user } = useApp();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDeals()
      .then((res) => setDeals(res.deals))
      .finally(() => setLoading(false));
  }, []);

  const baseRoute = user?.role === 'brand' ? '/brand/deals' : '/creator/deals';

  return (
    <DashboardLayout
      title="Deal Rooms"
      subtitle="Shared workspaces for milestones, deliverable cuts, revisions, and simulated escrow."
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-[#101426] animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-xl bg-[#101426] border border-white/8 p-12 text-center space-y-3">
          <Handshake className="w-8 h-8 text-[#00D5FF] mx-auto" />
          <h2 className="font-display text-lg font-bold">No Active Deal Rooms Yet</h2>
          <p className="text-xs text-[#9295A9] max-w-md mx-auto">
            {user?.role === 'brand'
              ? 'Accept a creator application in your Applications pipeline to initialize a Deal Room.'
              : 'Apply to open campaigns—when a brand accepts your pitch, your shared Deal Room opens automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deals.map((d) => (
            <Link
              key={d.id}
              to={`${baseRoute}/${d.id}`}
              className="block rounded-xl bg-[#101426] border border-white/8 hover:border-[#00D5FF]/60 transition-colors p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#9295A9]">
                    <span className="font-semibold text-[#F5F5FA]">{d.brandName}</span>
                    <span aria-hidden="true">×</span>
                    <span className="font-semibold text-[#F5F5FA]">{d.creatorName}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        d.status === 'Completed'
                          ? 'text-[#34D399]'
                          : d.status === 'Disputed'
                          ? 'text-[#EF4444]'
                          : 'text-[#00D5FF]'
                      }
                    >
                      {d.status}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
                    {d.campaignTitle}
                  </h2>
                  <p className="text-xs text-[#9295A9]">
                    {d.deliverables.filter((x) => x.status === 'Approved').length} of{' '}
                    {d.deliverables.length} deliverables approved · Due {d.deadline}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-mono-tabular text-xl font-bold text-[#F5F5FA]">
                    ₹{d.agreedAmountINR.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-[#9295A9]">
                    Simulated Escrow:{' '}
                    <span className="text-[#00D5FF] font-medium">{d.paymentStatus}</span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export const DealRoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, showToast } = useApp();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Creator Deliverable Submission state
  const [activeDelivId, setActiveDelivId] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState('');
  const [captionOrNotes, setCaptionOrNotes] = useState('');
  const [fileName, setFileName] = useState('');

  // Brand Review / Revision state
  const [revisionDelivId, setRevisionDelivId] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState('');

  // Shared file state
  const [newAssetName, setNewAssetName] = useState('');

  // Chat state
  const [chatText, setChatText] = useState('');

  // Reputation Review state
  const [revMetrics, setRevMetrics] = useState({
    communication: 5,
    qualityOrClarity: 5,
    timelinessOrPayment: 5,
    professionalism: 5,
  });
  const [revComment, setRevComment] = useState('');

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');

  const loadRoom = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getDealDetail(id);
      setDeal(res.deal);
      setReviews(res.reviews);
      setConversation(res.conversation);
      setMessages(res.messages);
    } catch (e: any) {
      setError(e.message || 'Could not load Deal Room');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const handleFundEscrow = async () => {
    if (!deal) return;
    try {
      const res = await api.updateDealPayment(
        deal.id,
        'Funded',
        `Brand funded ₹${deal.agreedAmountINR.toLocaleString('en-IN')} into Simulated Escrow (Test Mode).`
      );
      setDeal(res.deal);
      showToast('Simulated Escrow marked Funded (Test Mode)', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !activeDelivId) return;
    try {
      const res = await api.submitDeliverable(deal.id, activeDelivId, {
        contentUrl,
        captionOrNotes,
        fileName: fileName || undefined,
      });
      setDeal(res.deal);
      setActiveDelivId(null);
      setContentUrl('');
      setCaptionOrNotes('');
      setFileName('');
      showToast('Deliverable cut submitted for brand review', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleBrandApprove = async (delivId: string) => {
    if (!deal) return;
    try {
      const res = await api.reviewDeliverable(deal.id, delivId, {
        decision: 'Approved',
        feedback: 'Approved by brand partner.',
      });
      setDeal(res.deal);
      showToast(
        res.deal.status === 'Completed'
          ? 'All deliverables approved! Deal completed & simulated payout released.'
          : 'Deliverable approved!',
        'success'
      );
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleBrandRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !revisionDelivId) return;
    try {
      const res = await api.reviewDeliverable(deal.id, revisionDelivId, {
        decision: 'Revision Requested',
        feedback: revisionNote,
      });
      setDeal(res.deal);
      setRevisionDelivId(null);
      setRevisionNote('');
      showToast('Revision feedback sent to creator', 'info');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleAddSharedFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !newAssetName.trim()) return;
    try {
      const res = await api.uploadSharedFile(deal.id, {
        fileName: newAssetName.trim(),
        fileSizeLabel: '2.4 MB',
      });
      setDeal(res.deal);
      setNewAssetName('');
      showToast('Asset added to Deal Room files', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !chatText.trim()) return;
    try {
      const res = await api.sendMessage(conversation.id, { text: chatText.trim() });
      setMessages((prev) => [...prev, res.message]);
      setChatText('');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    try {
      const res = await api.submitDealReview(deal.id, {
        metrics: revMetrics,
        comment: revComment,
      });
      setDeal(res.deal);
      setReviews((prev) => [res.review, ...prev]);
      setRevComment('');
      showToast('Reputation review published!', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    try {
      const res = await api.openDispute(deal.id, {
        reason: disputeReason,
        details: disputeDetails,
      });
      setDeal(res.deal);
      setShowDisputeModal(false);
      showToast('Dispute filed with Bridge Trust & Safety', 'info');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Deal Room">
        <div className="h-80 rounded-xl bg-[#101426] animate-pulse" />
      </DashboardLayout>
    );
  }

  if (error || !deal) {
    return (
      <DashboardLayout title="Deal Room">
        <div className="rounded-xl bg-[#101426] border border-[#EF4444]/40 p-8 text-sm text-[#EF4444]">
          {error || 'Deal Room not found.'}
        </div>
      </DashboardLayout>
    );
  }

  const isBrand = user?.role === 'brand' && deal.brandUserId === user.id;
  const isCreator = user?.role === 'creator' && deal.creatorUserId === user.id;
  const alreadyReviewed = reviews.some((r) => r.reviewerUserId === user?.id);

  return (
    <DashboardLayout
      title={`Deal Room · ${deal.campaignTitle}`}
      subtitle={`${deal.brandName} × ${deal.creatorName} · Deadline ${deal.deadline}`}
      actions={
        deal.status === 'Active' ? (
          <button
            type="button"
            onClick={() => setShowDisputeModal(true)}
            className="px-3 py-1.5 rounded-lg border border-[#EF4444]/40 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
          >
            Raise Dispute
          </button>
        ) : undefined
      }
    >
      <div className="space-y-8">
        {/* Top Summary & Simulated Escrow Bar */}
        <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <p className="text-xs text-[#9295A9]">Agreed Collaboration Value</p>
            <p className="font-mono-tabular text-2xl font-bold text-[#F5F5FA] mt-1">
              ₹{deal.agreedAmountINR.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9295A9]">Deal Status</p>
            <p
              className={`text-sm font-bold mt-1 ${
                deal.status === 'Completed'
                  ? 'text-[#34D399]'
                  : deal.status === 'Disputed'
                  ? 'text-[#EF4444]'
                  : 'text-[#00D5FF]'
              }`}
            >
              {deal.status}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9295A9]">Simulated Escrow (Test Mode)</p>
            <p className="text-sm font-semibold text-[#F5F5FA] mt-1">
              {deal.paymentStatus}
            </p>
          </div>
          <div className="md:text-right">
            {isBrand && deal.paymentStatus === 'Unfunded' && (
              <button
                type="button"
                onClick={handleFundEscrow}
                className="px-4 py-2.5 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
              >
                Fund Simulated Escrow (₹{deal.agreedAmountINR.toLocaleString('en-IN')})
              </button>
            )}
            {deal.paymentStatus === 'Released' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399]">
                <ShieldCheck className="w-4 h-4" />
                Simulated Payout Released
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Cols: Deliverables, Submissions & Reviews */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
                Deliverables & Revision Workflow
              </h2>

              <div className="space-y-4">
                {deal.deliverables.map((deliv) => (
                  <div
                    key={deliv.id}
                    className="rounded-xl bg-[#0B0D18] border border-white/8 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#9295A9]">
                          {deliv.platform} · Due {deliv.dueDate} · Milestone ₹
                          {deliv.milestoneAmountINR.toLocaleString('en-IN')}
                        </p>
                        <h3 className="font-display text-base font-semibold text-[#F5F5FA] mt-0.5">
                          {deliv.title}
                        </h3>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          deliv.status === 'Approved'
                            ? 'text-[#34D399]'
                            : deliv.status === 'Revision Requested'
                            ? 'text-[#F59E0B]'
                            : 'text-[#00D5FF]'
                        }`}
                      >
                        {deliv.status}
                      </span>
                    </div>

                    {deliv.latestRevisionNote && deliv.status === 'Revision Requested' && (
                      <div className="rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 text-xs text-[#F59E0B]">
                        <strong>Brand Revision Note:</strong> {deliv.latestRevisionNote}
                      </div>
                    )}

                    {/* Submission History */}
                    {deliv.submissions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/8">
                        <p className="text-xs font-semibold text-[#9295A9]">
                          Submission History ({deliv.submissions.length})
                        </p>
                        {deliv.submissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="rounded-lg bg-[#101426] p-3 text-xs space-y-1"
                          >
                            <div className="flex justify-between text-[#9295A9]">
                              <span className="font-semibold text-[#F5F5FA]">
                                Version {sub.version} · {sub.fileName}
                              </span>
                              <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[#9295A9]">{sub.captionOrNotes}</p>
                            <a
                              href={sub.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-[#00D5FF] hover:underline"
                            >
                              {sub.contentUrl}
                            </a>
                            {sub.brandFeedback && (
                              <p className="text-[#34D399] pt-1">
                                Brand Feedback: {sub.brandFeedback}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Creator Submit Action */}
                    {isCreator && deliv.status !== 'Approved' && (
                      <div>
                        {activeDelivId === deliv.id ? (
                          <form
                            onSubmit={handleSubmitDeliverable}
                            className="space-y-3 pt-3 border-t border-white/8"
                          >
                            <input
                              type="url"
                              required
                              value={contentUrl}
                              onChange={(e) => setContentUrl(e.target.value)}
                              placeholder="https://drive.google.com/... or unlisted video URL"
                              className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                            />
                            <input
                              type="text"
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              placeholder="File name (e.g. cut_v2_final.mp4)"
                              className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                            />
                            <textarea
                              rows={2}
                              value={captionOrNotes}
                              onChange={(e) => setCaptionOrNotes(e.target.value)}
                              placeholder="Draft caption & timestamp notes for the brand..."
                              className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
                              >
                                Submit Version
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveDelivId(null)}
                                className="px-3 py-2 rounded-lg border border-white/15 text-xs text-[#9295A9] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveDelivId(deliv.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {deliv.submissions.length > 0
                              ? 'Submit Revised Cut'
                              : 'Submit Deliverable'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Brand Approve / Request Revision Actions */}
                    {isBrand &&
                      (deliv.status === 'Under Review' || deliv.status === 'Submitted') && (
                        <div className="pt-3 border-t border-white/8 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleBrandApprove(deliv.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#34D399] text-[#050509] text-xs font-bold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve Deliverable
                            </button>
                            <button
                              type="button"
                              onClick={() => setRevisionDelivId(deliv.id)}
                              className="px-4 py-2 rounded-lg border border-[#F59E0B] text-xs font-semibold text-[#F59E0B] cursor-pointer"
                            >
                              Request Revision
                            </button>
                          </div>

                          {revisionDelivId === deliv.id && (
                            <form
                              onSubmit={handleBrandRequestRevision}
                              className="space-y-2 pt-2"
                            >
                              <textarea
                                rows={2}
                                required
                                value={revisionNote}
                                onChange={(e) => setRevisionNote(e.target.value)}
                                placeholder="Write clear, actionable revision feedback for the creator..."
                                className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                              />
                              <button
                                type="submit"
                                className="px-4 py-1.5 rounded-lg bg-[#F59E0B] text-[#050509] text-xs font-bold cursor-pointer"
                              >
                                Send Revision Request
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Ledger & Shared Assets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-[#101426] border border-white/10 p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#F5F5FA]">
                  Simulated Payment Timeline
                </h3>
                <div className="space-y-3">
                  {deal.paymentTimeline.map((pt, i) => (
                    <div key={i} className="text-xs space-y-0.5 border-b border-white/6 pb-2">
                      <p className="font-semibold text-[#00D5FF]">{pt.status}</p>
                      <p className="text-[#9295A9]">{pt.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#101426] border border-white/10 p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#F5F5FA]">
                  Shared Briefs & Assets
                </h3>
                <div className="space-y-2">
                  {deal.sharedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-xs bg-[#0B0D18] p-2.5 rounded-lg"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#00D5FF] shrink-0" />
                        <span className="truncate">{f.fileName}</span>
                      </span>
                      <span className="text-[#9295A9] shrink-0">{f.fileSizeLabel}</span>
                    </div>
                  ))}
                </div>
                {(isCreator || isBrand) && (
                  <form onSubmit={handleAddSharedFile} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      placeholder="Add asset filename (e.g. Brand_Logo_Kit.zip)"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#050509] border border-white/12 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold cursor-pointer"
                    >
                      Share
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Post-Completion Mutual Reputation Review */}
            {deal.status === 'Completed' && (
              <div className="rounded-2xl bg-[#101426] border border-[#34D399]/40 p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#34D399]">
                  <Star className="w-4 h-4" />
                  <h3 className="font-display text-base font-bold">
                    Collaboration Reputation & Reviews
                  </h3>
                </div>

                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl bg-[#0B0D18] border border-white/8 p-4 space-y-1 text-xs"
                  >
                    <p className="font-semibold text-[#F5F5FA]">
                      {r.reviewerName} → {r.targetName} · ★ {r.overallRating.toFixed(1)}
                    </p>
                    <p className="text-[#9295A9]">{r.comment}</p>
                  </div>
                ))}

                {(isCreator || isBrand) && !alreadyReviewed && (
                  <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
                    <p className="text-xs text-[#9295A9]">
                      Leave a verified collaboration review for{' '}
                      {isBrand ? deal.creatorName : deal.brandName}:
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {(
                        [
                          ['communication', 'Communication'],
                          [
                            'qualityOrClarity',
                            isBrand ? 'Content Quality' : 'Brief Clarity',
                          ],
                          [
                            'timelinessOrPayment',
                            isBrand ? 'Timeliness' : 'Payment Reliability',
                          ],
                          ['professionalism', 'Professionalism'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between bg-[#0B0D18] p-2.5 rounded-lg">
                          <span>{label}</span>
                          <select
                            value={revMetrics[key]}
                            onChange={(e) =>
                              setRevMetrics({ ...revMetrics, [key]: Number(e.target.value) })
                            }
                            className="bg-[#101426] border border-white/10 rounded px-2 py-0.5 font-mono-tabular"
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {n} ★
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={revComment}
                      onChange={(e) => setRevComment(e.target.value)}
                      placeholder="Share concrete feedback on this collaboration..."
                      className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-[#34D399] text-[#050509] text-xs font-bold cursor-pointer"
                    >
                      Submit Verified Review
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right 5 Cols: Embedded Deal Room Chat */}
          <div className="lg:col-span-5 rounded-2xl bg-[#101426] border border-white/10 flex flex-col h-[560px]">
            <div className="p-4 border-b border-white/8">
              <h2 className="font-display text-sm font-bold text-[#F5F5FA]">
                Deal Room Direct Stream
              </h2>
              <p className="text-xs text-[#9295A9]">
                Authorized participants only · {deal.brandName} & {deal.creatorName}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const mine = m.senderUserId === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs space-y-1 ${
                        mine
                          ? 'bg-[#246BFD] text-[#F5F5FA]'
                          : 'bg-[#0B0D18] border border-white/8 text-[#F5F5FA]'
                      }`}
                    >
                      <p className="text-[10px] opacity-75 font-semibold">{m.senderName}</p>
                      <p className="leading-relaxed">{m.text}</p>
                      {m.attachmentName && (
                        <p className="text-[11px] underline">📎 {m.attachmentName}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {conversation && (
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-white/8 flex gap-2"
              >
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Write a message in the Deal Room..."
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="px-3.5 py-2 rounded-lg bg-[#246BFD] text-[#F5F5FA] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowDisputeModal(false)}
        >
          <form
            onSubmit={handleRaiseDispute}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-2xl bg-[#101426] border border-white/15 p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-[#EF4444]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display text-lg font-bold">Open Deal Room Dispute</h3>
            </div>
            <p className="text-xs text-[#9295A9]">
              Filing a dispute places simulated escrow in Disputed hold for Admin Trust &
              Safety review.
            </p>
            <input
              type="text"
              required
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Short reason (e.g. Unagreed usage rights request)"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs"
            />
            <textarea
              rows={3}
              required
              value={disputeDetails}
              onChange={(e) => setDisputeDetails(e.target.value)}
              placeholder="Provide timeline and deliverable details..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#EF4444] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
              >
                Submit Dispute
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

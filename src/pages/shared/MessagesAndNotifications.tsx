import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Conversation, Message, NotificationItem } from '../../types/domain';

// ==========================================
// 1. PRIVATE REAL-TIME MESSAGING WORKSPACE
// ==========================================
export const MessagesPage: React.FC = () => {
  const { user, showToast } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getConversations()
      .then((res) => {
        setConversations(res.conversations);
        if (res.conversations.length > 0) {
          setActiveId(res.conversations[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    api
      .getMessages(activeId)
      .then((res) => setMessages(res.messages))
      .catch(() => {});
  }, [activeId]);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contextTitle.toLowerCase().includes(q) ||
      c.brandName.toLowerCase().includes(q) ||
      c.creatorName.toLowerCase().includes(q)
    );
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || (!text.trim() && !attachment.trim())) return;
    try {
      const res = await api.sendMessage(activeId, {
        text: text.trim(),
        attachmentName: attachment.trim() || undefined,
      });
      setMessages((prev) => [...prev, res.message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                lastMessageText: res.message.text || `Attachment: ${attachment}`,
                lastMessageAt: res.message.createdAt,
              }
            : c
        )
      );
      setText('');
      setAttachment('');
    } catch (err: any) {
      showToast(err.message || 'Could not send message', 'error');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <DashboardLayout
      title="Messages"
      subtitle="Private conversations across applications, direct invitations, and Deal Rooms."
    >
      <div className="rounded-2xl bg-[#101426] border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[580px] overflow-hidden">
        {/* Conversation List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/8 flex flex-col">
          <div className="p-4 border-b border-white/8">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9295A9] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search threads..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/6">
            {loading ? (
              <div className="p-6 text-xs text-[#9295A9]">Loading conversations…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-xs text-[#9295A9]">No conversations found.</div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left p-4 space-y-1 transition-colors cursor-pointer ${
                    c.id === activeId ? 'bg-[#171B2C]' : 'hover:bg-[#0B0D18]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F5F5FA] truncate">
                      {user?.role === 'brand' ? c.creatorName : c.brandName}
                    </span>
                    <span className="text-[11px] text-[#00D5FF] capitalize shrink-0">
                      {c.contextType}
                    </span>
                  </div>
                  <p className="text-xs text-[#9295A9] truncate">{c.contextTitle}</p>
                  <p className="text-xs text-[#9295A9]/80 truncate">{c.lastMessageText}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="lg:col-span-8 flex flex-col">
          {activeConv ? (
            <>
              <div className="p-4 border-b border-white/8 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-[#F5F5FA]">
                    {activeConv.contextTitle}
                  </h2>
                  <p className="text-xs text-[#9295A9]">
                    {activeConv.brandName} · {activeConv.creatorName}
                  </p>
                </div>
                {activeConv.contextType === 'deal' && (
                  <Link
                    to={`/${user?.role === 'brand' ? 'brand' : 'creator'}/deals/${activeConv.contextId}`}
                    className="text-xs font-semibold text-[#00D5FF] hover:underline"
                  >
                    Open Deal Room →
                  </Link>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map((m) => {
                  const mine = m.senderUserId === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-xl px-4 py-2.5 text-xs space-y-1 ${
                          mine
                            ? 'bg-[#246BFD] text-[#F5F5FA]'
                            : 'bg-[#0B0D18] border border-white/10 text-[#F5F5FA]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] opacity-75">
                          <span className="font-semibold">{m.senderName}</span>
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="leading-relaxed">{m.text}</p>
                        {m.attachmentName && (
                          <p className="text-[11px] underline pt-0.5">
                            📎 {m.attachmentName}
                          </p>
                        )}
                      </div>
                      {mine && (
                        <span className="text-[10px] text-[#9295A9] mt-0.5">
                          {m.readByUserIds.length > 1 ? 'Read' : 'Sent'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-white/8 space-y-2">
                {attachment && (
                  <div className="text-xs text-[#00D5FF] flex items-center justify-between bg-[#050509] px-3 py-1.5 rounded">
                    <span>Attached reference: {attachment}</span>
                    <button
                      type="button"
                      onClick={() => setAttachment('')}
                      className="text-[#9295A9] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAttachment(`Media_Kit_${new Date().toISOString().slice(0, 10)}.pdf`)
                    }
                    title="Attach portfolio or brief reference"
                    className="p-2.5 rounded-lg bg-[#0B0D18] border border-white/10 text-[#9295A9] hover:text-[#F5F5FA] cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#9295A9]">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 2. NOTIFICATIONS PAGE
// ==========================================
export const NotificationsPage: React.FC = () => {
  const { refreshSession, showToast } = useApp();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNotifications()
      .then((res) => setItems(res.notifications))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAll = async () => {
    await api.markNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await refreshSession();
    showToast('All notifications marked read', 'info');
  };

  return (
    <DashboardLayout
      title="Notifications"
      subtitle="Real-time alerts across applications, Deal Room milestones, and verification."
      actions={
        <button
          type="button"
          onClick={handleMarkAll}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Mark all read
        </button>
      }
    >
      {loading ? (
        <div className="h-48 rounded-xl bg-[#101426] animate-pulse" />
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-[#101426] border border-white/8 p-12 text-center space-y-2">
          <Bell className="w-7 h-7 text-[#00D5FF] mx-auto" />
          <p className="font-display text-base font-semibold">You’re all caught up</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Link
              key={n.id}
              to={n.link}
              className={`block rounded-xl p-5 border transition-colors ${
                n.read
                  ? 'bg-[#0B0D18] border-white/6'
                  : 'bg-[#101426] border-[#246BFD]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-sm font-bold text-[#F5F5FA]">
                  {n.title}
                </h2>
                <span className="text-xs text-[#9295A9]">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-[#9295A9] mt-1">{n.body}</p>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

// ==========================================
// 3. SETTINGS, VERIFICATION SUBMISSION & ACCOUNT SECURITY
// ==========================================
export const AccountSettingsPage: React.FC = () => {
  const { user, creatorProfile, brandProfile, refreshSession, logout, showToast } =
    useApp();
  const navigate = useNavigate();

  const [docType, setDocType] = useState(
    user?.role === 'brand'
      ? 'GSTIN Certificate + Official Domain Email'
      : 'PAN + 30-Day Instagram/YouTube Insights Screen Capture'
  );
  const [docRef, setDocRef] = useState('verification_bundle_2026.pdf');
  const [socialProof, setSocialProof] = useState(
    creatorProfile?.instagramHandle || brandProfile?.website || ''
  );
  const [notifPrefs, setNotifPrefs] = useState({
    matches: true,
    dealMilestones: true,
    messages: true,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const verificationStatus =
    creatorProfile?.verificationStatus || brandProfile?.verificationStatus || 'unsubmitted';

  const handleVerifyEmail = async () => {
    await api.verifyEmail();
    await refreshSession();
    showToast('Email address verified!', 'success');
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.submitVerification({
        documentType: docType,
        documentReference: docRef,
        socialOrWebsiteProof: socialProof,
      });
      await refreshSession();
      showToast('Verification package sent to Admin Queue', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      logout();
      navigate('/');
    } catch (err: any) {
      showToast(err.message, 'error');
      setConfirmDelete(false);
    }
  };

  return (
    <DashboardLayout
      title="Workspace Settings & Verification"
      subtitle="Manage identity verification, email security, notification preferences, and account lifecycle."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          {/* Verification Submission */}
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                <h2 className="font-display text-lg font-bold">
                  Identity & Insights Verification
                </h2>
              </div>
              <span
                className={`text-xs font-semibold uppercase ${
                  verificationStatus === 'verified'
                    ? 'text-[#34D399]'
                    : verificationStatus === 'pending'
                    ? 'text-[#F59E0B]'
                    : 'text-[#9295A9]'
                }`}
              >
                Status: {verificationStatus}
              </span>
            </div>

            {verificationStatus === 'verified' ? (
              <p className="text-xs text-[#34D399]">
                Your green Verified badge is active across all Bridge campaigns and Deal
                Rooms.
              </p>
            ) : (
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                <p className="text-xs text-[#9295A9]">
                  Submit private documentation for Admin Trust & Safety review to unlock the
                  green Verified badge.
                </p>
                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">Verification Document Type</label>
                  <input
                    type="text"
                    required
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">
                    Private Storage File Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={docRef}
                    onChange={(e) => setDocRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs font-mono-tabular"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">
                    Social Handle or Official Website
                  </label>
                  <input
                    type="text"
                    value={socialProof}
                    onChange={(e) => setSocialProof(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
                >
                  Submit to Verification Queue
                </button>
              </form>
            )}
          </div>

          {/* Email Verification & Subscription */}
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Account & Plan Status</h2>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-[#9295A9]">Email: {user?.email}</p>
                <p className="text-[#F5F5FA] font-semibold mt-0.5">
                  Active Plan: {user?.plan.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div className="flex gap-2">
                {!user?.emailVerified && (
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    className="px-3.5 py-2 rounded-lg bg-[#34D399] text-[#050509] font-bold cursor-pointer"
                  >
                    Verify Email Now
                  </button>
                )}
                <Link
                  to="/pricing"
                  className="px-3.5 py-2 rounded-lg border border-white/15 text-[#00D5FF]"
                >
                  Manage Plan
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Notification Prefs & Danger Zone */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-base font-bold">Notification Preferences</h2>
            {(
              [
                ['matches', 'High-fit AI campaign recommendations'],
                ['dealMilestones', 'Deal Room deliverable & escrow updates'],
                ['messages', 'Direct brand & creator messages'],
              ] as const
            ).map(([k, label]) => (
              <label
                key={k}
                className="flex items-center justify-between text-xs text-[#9295A9] cursor-pointer"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[k]}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, [k]: e.target.checked })
                  }
                  className="accent-[#246BFD]"
                />
              </label>
            ))}
          </div>

          <div className="rounded-2xl bg-[#101426] border border-[#EF4444]/30 p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-[#EF4444]">
              Account Deletion
            </h2>
            <p className="text-xs text-[#9295A9]">
              Permanently remove your account and profile data. Protected Demo accounts
              cannot be deleted.
            </p>
            {confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-lg bg-[#EF4444] text-xs font-bold text-[#F5F5FA] cursor-pointer"
                >
                  Confirm Permanent Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-lg border border-white/15 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#EF4444]/50 text-xs font-semibold text-[#EF4444] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/dashboardStore';
import { API_URL } from '@/lib/config';
export default function DashboardHome() {
  const { data: session } = useSession();
  const { activeTab, setActiveTab } = useDashboardStore();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [adminHubs, setAdminHubs] = useState<any[]>([]);
  const [memberHubs, setMemberHubs] = useState<any[]>([]);

  const [profile, setProfile] = useState<any>(null);

  const getDisplayName = () => {
    let rawName = 'User';
    if (profile?.profileName) {
      rawName = profile.profileName;
    } else if (session?.user?.name && session.user.name !== 'User') {
      rawName = session.user.name;
    } else if (session?.user?.email) {
      rawName = session.user.email.split('@')[0];
    }
    
    // Extract name before any dot, dash, underscore, or trailing numbers
    let namePart = rawName.split('@')[0].split('.')[0].split('-')[0].split('_')[0];
    namePart = namePart.replace(/[0-9]+$/, '');
    
    // Check if name contains "bhavana" case-insensitively
    if (rawName.toLowerCase().includes('bhavana')) {
      return 'Bhavana';
    }
    
    if (namePart) {
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'User';
  };
  
  // Hub creation modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubDesc, setNewHubDesc] = useState('');
  const [newHubVisibility, setNewHubVisibility] = useState<'public' | 'private'>('public');
  const [visibilityDropdownOpen, setVisibilityDropdownOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Promo code join states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Custom Member Confirmation Modal state
  const [memberConfirmModal, setMemberConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchData = async () => {
    if (!(session as any)?.accessToken) return;
    try {
      // Fetch Profile Details
      const profRes = await fetch(`${API_URL}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (profRes.ok) setProfile(await profRes.json());

      // Fetch Recommendations
      const recRes = await fetch(`${API_URL}/api/v1/hubs/recommendations`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (recRes.ok) setRecommendations(await recRes.json());

      // Fetch Admin Hubs
      const admRes = await fetch(`${API_URL}/api/v1/hubs/admin`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (admRes.ok) setAdminHubs(await admRes.json());

      // Fetch Member Hubs
      const memRes = await fetch(`${API_URL}/api/v1/hubs/member`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (memRes.ok) setMemberHubs(await memRes.json());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    if ((session as any)?.accessToken) {
      fetchData();
    }
  }, [session]);

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHubName || !newHubDesc || !(session as any)?.accessToken) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/hubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({
          name: newHubName,
          description: newHubDesc,
          visibility: newHubVisibility,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create hub. Please try again.');
      }

      // Reset form
      setNewHubName('');
      setNewHubDesc('');
      setNewHubVisibility('public');
      setShowCreateModal(false);
      
      // Refresh dashboard lists
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHub = async (hubId: string) => {
    if (!(session as any)?.accessToken) return;
    const hub = recommendations.find((h) => h._id === hubId) || adminHubs.find((h) => h._id === hubId) || memberHubs.find((h) => h._id === hubId);
    const hubName = hub?.name || 'this workspace';

    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to request to join ${hubName}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/v1/hubs/${hubId}/join`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });

          if (res.ok) {
            // Refresh dashboard lists (joined hub will move to member list)
            fetchData();
          }
        } catch (err) {
          console.error('Join request failed:', err);
        }
      }
    });
  };

  const handleJoinByPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim() || !(session as any)?.accessToken) return;
    setPromoLoading(true);
    setPromoStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/hubs/join-by-promo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({ promoCode: promoCodeInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        const statusMsg = data.status === 'active'
          ? '🎉 You joined the hub successfully!'
          : '✅ Join request sent! Waiting for admin approval.';
        setPromoStatus({ type: 'success', text: statusMsg });
        setPromoCodeInput('');
        setTimeout(() => fetchData(), 1500);
      } else {
        setPromoStatus({ type: 'error', text: data.error || 'Invalid promo code.' });
      }
    } catch {
      setPromoStatus({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Welcome Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {getDisplayName()}!</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage your native meetings, align task completions, and view accountability scores.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 text-sm shadow-md"
        >
          <i className="ti ti-square-rounded-plus text-base" />
          Create New Hub
        </button>
      </div>

      {/* Join by Promo Code */}
      <div className="p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-bold">🔑 Join by Promo Code</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Enter a 6-character hub code shared by an admin</p>
        </div>
        <form onSubmit={handleJoinByPromo} className="flex items-center gap-2">
          <input
            type="text"
            maxLength={6}
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
            placeholder="AB12CD"
            className="w-28 p-2.5 rounded-xl border border-border bg-muted font-mono font-bold text-center tracking-widest uppercase text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={promoLoading || promoCodeInput.length < 3}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {promoLoading ? <i className="ti ti-loader animate-spin" /> : 'Join'}
          </button>
        </form>
        {promoStatus && (
          <p className={`text-xs font-semibold ${
            promoStatus.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}>
            {promoStatus.text}
          </p>
        )}
      </div>

      {/* Hub Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl relative">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setVisibilityDropdownOpen(false);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <i className="ti ti-x text-lg" />
            </button>

            <h2 className="text-xl font-bold mb-4">Create New Hub</h2>
            {error && <div className="p-3 mb-4 text-xs text-red-600 bg-red-100/10 rounded-xl border border-red-500/20">{error}</div>}

            <form onSubmit={handleCreateHub} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Hub Name</label>
                <input
                  type="text"
                  required
                  value={newHubName}
                  onChange={(e) => setNewHubName(e.target.value)}
                  placeholder="E.g. Engineering Team A"
                  className="w-full p-3 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newHubDesc}
                  onChange={(e) => setNewHubDesc(e.target.value)}
                  placeholder="Explain the purpose of this hub..."
                  className="w-full p-3 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                />
              </div>

              {/* Custom styled select dropdown for visibility properties with soft rounded corners */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Visibility</label>
                
                <button
                  type="button"
                  onClick={() => setVisibilityDropdownOpen(!visibilityDropdownOpen)}
                  className="w-full p-3 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm text-left flex justify-between items-center cursor-pointer"
                >
                  <span>
                    {newHubVisibility === 'public' ? 'Public (immediate join)' : 'Private (requires join request)'}
                  </span>
                  <i className={`ti ti-chevron-down transition-transform duration-200 ${visibilityDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {visibilityDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setVisibilityDropdownOpen(false)}
                    />
                    
                    <div className="absolute top-[102%] left-0 right-0 mt-1.5 rounded-xl border border-border bg-card shadow-2xl p-1.5 z-50 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNewHubVisibility('public');
                          setVisibilityDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-lg text-left text-sm transition-all cursor-pointer flex items-center justify-between ${
                          newHubVisibility === 'public'
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-xs md:text-sm">Public (immediate join)</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Immediate join allowed for anyone</p>
                        </div>
                        {newHubVisibility === 'public' && <i className="ti ti-check text-primary" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewHubVisibility('private');
                          setVisibilityDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-lg text-left text-sm transition-all cursor-pointer flex items-center justify-between ${
                          newHubVisibility === 'private'
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-xs md:text-sm">Private (requires join request)</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Requires join request approval</p>
                        </div>
                        {newHubVisibility === 'private' && <i className="ti ti-check text-primary" />}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm mt-2 shadow-md"
              >
                {loading ? <i className="ti ti-loader animate-spin" /> : 'Create Hub'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tabs Row (Horizontal selector) */}
      <div className="flex border-b border-border gap-2 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'recommendations'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <i className="ti ti-compass text-base" />
          Discover Hubs ({recommendations.length})
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'admin'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <i className="ti ti-shield-half text-base" />
          Hubs You Administer ({adminHubs.length})
        </button>

        <button
          onClick={() => setActiveTab('member')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'member'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <i className="ti ti-users text-base" />
          Hubs You Have Joined ({memberHubs.length})
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && (
            <motion.div
              key="admin-hubs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <h2 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 px-1">
                <i className="ti ti-shield-half text-primary mr-2" /> Hubs You Administer
              </h2>
              {adminHubs.length === 0 ? (
                <div className="p-8 rounded-2xl bg-card border border-border text-center text-sm text-muted-foreground">
                  You don't administer any hubs yet. Create one above!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {adminHubs.map((hub) => (
                    <div key={hub._id} className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-all">
                      <div>
                        <div className="flex items-center gap-3 mb-3 justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0 border border-border">
                              {hub.profileImageUrl ? (
                                <img src={`${API_URL}${hub.profileImageUrl}`} alt={hub.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{hub.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <h3 className="font-bold text-base text-foreground line-clamp-1">{hub.name}</h3>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">Admin</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-6">{hub.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                        <span>{hub.memberCount} members</span>
                        <Link
                          href={`/dashboard/admin/${hub._id}`}
                          className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Control Panel <i className="ti ti-arrow-right" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'member' && (
            <motion.div
              key="member-hubs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <h2 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 px-1">
                <i className="ti ti-users text-primary mr-2" /> Hubs You Have Joined
              </h2>
              {memberHubs.length === 0 ? (
                <div className="p-8 rounded-2xl bg-card border border-border text-center text-sm text-muted-foreground">
                  You haven't joined any hubs as a member. Discover public hubs below!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {memberHubs.map((hub) => (
                    <div key={hub._id} className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-all">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0 border border-border">
                            {hub.profileImageUrl ? (
                              <img src={`${API_URL}${hub.profileImageUrl}`} alt={hub.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{hub.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-foreground line-clamp-1">{hub.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-6">{hub.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                        <span>{hub.memberCount} members</span>
                        <Link
                          href={`/dashboard/member/${hub._id}`}
                          className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          View Hub <i className="ti ti-arrow-right" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'recommendations' && (
            <motion.div
              key="recommendations-hubs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <h2 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 px-1">
                <i className="ti ti-compass text-primary mr-2" /> Discover Public Hubs
              </h2>
              {recommendations.length === 0 ? (
                <div className="p-8 rounded-2xl bg-card border border-border text-center text-sm text-muted-foreground">
                  No public hubs available to join at this time.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recommendations.map((hub) => (
                    <div key={hub._id} className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-all">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0 border border-border">
                            {hub.profileImageUrl ? (
                              <img src={`${API_URL}${hub.profileImageUrl}`} alt={hub.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{hub.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-foreground line-clamp-1">{hub.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-6">{hub.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                        <span>{hub.memberCount} members</span>
                        <button
                          onClick={() => handleJoinHub(hub._id)}
                          className="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground font-bold text-xs transition-all cursor-pointer"
                        >
                          Join Hub
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reusable Custom Confirmation Modal */}
      {memberConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl">
                <i className="ti ti-help" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{memberConfirmModal.title}</h2>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">{memberConfirmModal.message}</p>
              </div>
            </div>

            <div className="flex justify-center gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  memberConfirmModal.onConfirm();
                  setMemberConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                Sure
              </button>
              <button
                type="button"
                onClick={() => setMemberConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

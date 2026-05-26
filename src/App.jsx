import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Briefcase, Layout, Calendar as CalendarIcon, BarChart3, Settings as SettingsIcon,
  Plus, Search, X, Trash2, Edit2, ChevronRight, ChevronDown,
  MoreVertical, Building2, MapPin, Mail, Phone, FileText,
  CalendarDays, Clock, TrendingUp, CheckCircle2, ArrowRight,
  GripVertical, User, Filter, UserPlus, Save, AlertCircle, Star,
  CheckSquare, Square, Download, AlertTriangle, PhoneCall, Link2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import * as XLSX from 'xlsx';

// ============ STORAGE HELPERS ============
// Standalone version: uses browser localStorage instead of Claude's storage.
// Data is per-browser, per-device. Clearing browser data will erase it.
const STORAGE_PREFIX = 'mastermined_';
const KEYS = ['candidates', 'clients', 'jobs', 'submissions', 'interviews', 'team', 'settings', 'tasks'];

const safeGet = async (key) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeSet = async (key, data) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Save failed for', key, e);
    return false;
  }
};

// ============ DEFAULTS ============
const DEFAULT_STAGES = ['Sourced', 'Internal Reject', 'Phone Screen', 'Submitted', 'Interview', 'Offer', 'Placed'];
const STAGE_PALETTE = ['#8B7355', '#8B2929', '#C28A6E', '#A67B5B', '#5F8A7E', '#7A8B6F', '#4A7C59'];
const TEAM_COLORS = ['#C45E3A', '#5F8A7E', '#8B7355', '#A67B5B', '#7A6B8F', '#4A7C59'];

const SOURCE_OPTIONS = ['Naukri', 'LinkedIn', 'Referral'];

const CALL_STATUSES = [
  { value: '', label: '— Not called yet —', color: '#9CA3AF' },
  { value: 'Not answering', label: 'Not answering', color: '#8B7355' },
  { value: 'Will call back', label: 'Will call back', color: '#C28A6E' },
  { value: 'Not interested', label: 'Not interested', color: '#8B2929' },
  { value: 'Interested', label: 'Interested', color: '#4A7C59' },
  { value: 'Location issue', label: 'Location issue', color: '#A67B5B' },
  { value: 'CTC issue', label: 'CTC issue', color: '#A67B5B' },
  { value: 'Duplicate', label: 'Duplicate', color: '#6B6358' },
  { value: 'Notice period issue', label: 'Notice period issue', color: '#A67B5B' },
  { value: 'Already placed', label: 'Already placed', color: '#6B6358' },
];

const callStatusColor = (val) => CALL_STATUSES.find(s => s.value === val)?.color || '#9CA3AF';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const fmtRelative = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return fmtDate(iso);
};

// ============ APP ROOT ============
export default function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [team, setTeam] = useState([]);
  const [settings, setSettings] = useState({ defaultStages: DEFAULT_STAGES });
  const [tasks, setTasks] = useState([]);

  // Inject font
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Geist:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      const [c, cl, j, s, i, t, st, ts] = await Promise.all(KEYS.map(safeGet));
      setCandidates(c || []);
      setClients(cl || []);
      setJobs(j || []);
      setSubmissions(s || []);
      setInterviews(i || []);
      const teamData = t || [{ id: uid(), name: 'Me', color: TEAM_COLORS[0] }];
      setTeam(teamData);
      setSettings(st || { defaultStages: DEFAULT_STAGES });
      setTasks(ts || []);
      setLoading(false);
    })();
  }, []);

  const flash = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2400);
  };

  // Persisted setters
  const persistedSetter = (key, setter) => async (updater) => {
    setter((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      safeSet(key, next);
      return next;
    });
  };
  const setCandidatesP = persistedSetter('candidates', setCandidates);
  const setClientsP = persistedSetter('clients', setClients);
  const setJobsP = persistedSetter('jobs', setJobs);
  const setSubmissionsP = persistedSetter('submissions', setSubmissions);
  const setInterviewsP = persistedSetter('interviews', setInterviews);
  const setTeamP = persistedSetter('team', setTeam);
  const setSettingsP = persistedSetter('settings', setSettings);
  const setTasksP = persistedSetter('tasks', setTasks);

  const ctx = {
    candidates, clients, jobs, submissions, interviews, team, settings, tasks,
    setCandidates: setCandidatesP,
    setClients: setClientsP,
    setJobs: setJobsP,
    setSubmissions: setSubmissionsP,
    setInterviews: setInterviewsP,
    setTeam: setTeamP,
    setSettings: setSettingsP,
    setTasks: setTasksP,
    flash,
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'Geist, system-ui, sans-serif' }} className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-500 text-sm tracking-wide">Loading workspace…</div>
      </div>
    );
  }

  const views = {
    dashboard: <DashboardView ctx={ctx} go={setView} />,
    candidates: <CandidatesView ctx={ctx} />,
    clients: <ClientsView ctx={ctx} />,
    pipeline: <PipelineView ctx={ctx} />,
    submissions: <SubmissionsView ctx={ctx} />,
    calendar: <CalendarView ctx={ctx} />,
    tasks: <TasksView ctx={ctx} />,
    settings: <SettingsView ctx={ctx} />,
  };

  return (
    <div
      style={{ fontFamily: 'Geist, system-ui, sans-serif', backgroundColor: '#FAF8F4' }}
      className="min-h-screen text-stone-900 flex"
    >
      <style>{`
        .font-display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: "ss01"; }
        .scrollbar-thin::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #d6cfc2; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #b8ad99; }
        input, textarea, select { font-family: inherit; }
        input:focus, textarea:focus, select:focus { outline: none; }
        .stage-col-scroll::-webkit-scrollbar { width: 6px; }
        .stage-col-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
      `}</style>

      <Sidebar view={view} setView={setView} />

      <main className="flex-1 min-w-0 overflow-auto scrollbar-thin">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          {views[view]}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2"
             style={{ backgroundColor: toast.kind === 'error' ? '#fdf2ec' : '#f1ede4', color: '#1a1612', border: '1px solid #e8e1d2' }}>
          {toast.kind === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ============ SIDEBAR ============
function Sidebar({ view, setView }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'clients', label: 'Clients & Jobs', icon: Briefcase },
    { id: 'pipeline', label: 'Pipeline', icon: Layout },
    { id: 'submissions', label: 'Submissions', icon: ArrowRight },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r border-stone-200 px-4 py-8 sticky top-0 h-screen flex flex-col"
           style={{ backgroundColor: '#F5F1E8' }}>
      <div className="px-3 mb-10">
        <div className="font-display text-2xl leading-none tracking-tight" style={{ color: '#1a1612' }}>Master</div>
        <div className="font-display text-2xl leading-none tracking-tight italic" style={{ color: '#C45E3A' }}>Mined.</div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.15em] text-stone-500">Recruitment CRM</div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(it => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:bg-white/50 hover:text-stone-900'
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
              {it.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pt-4 border-t border-stone-200 mt-4">
        <div className="text-[11px] text-stone-500 leading-relaxed">
          Data stored in this browser. Back up regularly from Settings.
        </div>
      </div>
    </aside>
  );
}

// ============ DASHBOARD ============
function DashboardView({ ctx, go }) {
  const { candidates, clients, jobs, submissions, interviews, tasks } = ctx;

  const openJobs = jobs.filter(j => j.status === 'open');
  const activeSubs = submissions.filter(s => !['Placed', 'Rejected', 'Withdrawn', 'Internal Reject'].includes(s.stage));
  const placedThisMonth = submissions.filter(s => {
    if (s.stage !== 'Placed' || !s.placedAt) return false;
    const d = new Date(s.placedAt); const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  });
  const upcoming = interviews
    .filter(i => new Date(i.datetime) > new Date())
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 5);

  // Pipeline by stage
  const stageData = useMemo(() => {
    const counts = {};
    activeSubs.forEach(s => { counts[s.stage] = (counts[s.stage] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [activeSubs]);

  // Conversion funnel: counts at progressively deeper stages (ordered by default stage list)
  const funnelData = useMemo(() => {
    const order = ['Sourced', 'Phone Screen', 'Submitted', 'Interview', 'Offer', 'Placed'];
    return order.map(stage => ({
      stage,
      count: submissions.filter(s => s.stage === stage).length,
    }));
  }, [submissions]);

  // Source effectiveness: count placements & total candidates per source
  const sourceData = useMemo(() => {
    const stats = {};
    SOURCE_OPTIONS.forEach(src => { stats[src] = { source: src, total: 0, placed: 0 }; });
    candidates.forEach(c => {
      if (c.source && stats[c.source]) stats[c.source].total++;
    });
    submissions.forEach(s => {
      if (s.stage === 'Placed') {
        const cand = candidates.find(c => c.id === s.candidateId);
        if (cand?.source && stats[cand.source]) stats[cand.source].placed++;
      }
    });
    return Object.values(stats).filter(s => s.total > 0 || s.placed > 0);
  }, [candidates, submissions]);

  // Call outcomes breakdown
  const callOutcomeData = useMemo(() => {
    const counts = {};
    candidates.forEach(c => {
      if (c.callStatus) counts[c.callStatus] = (counts[c.callStatus] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: callStatusColor(name) }));
  }, [candidates]);

  // Stale candidates: active submissions where stage hasn't changed in 14+ days
  const staleSubmissions = useMemo(() => {
    const now = Date.now();
    return activeSubs
      .map(s => {
        const lastUpdate = s.updatedAt || s.createdAt;
        const daysSince = Math.floor((now - new Date(lastUpdate).getTime()) / 86400000);
        return { sub: s, daysSince };
      })
      .filter(x => x.daysSince >= 14)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5);
  }, [activeSubs]);

  // Top clients
  const clientData = useMemo(() => {
    return clients.map(c => {
      const clientJobs = jobs.filter(j => j.clientId === c.id);
      const subs = submissions.filter(s => clientJobs.some(j => j.id === s.jobId));
      return { name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name, submissions: subs.length };
    }).filter(d => d.submissions > 0).sort((a, b) => b.submissions - a.submissions).slice(0, 6);
  }, [clients, jobs, submissions]);

  // Tasks widget: open tasks due today/overdue
  const today = new Date(); today.setHours(0,0,0,0);
  const urgentTasks = (tasks || [])
    .filter(t => !t.completed && t.dueDate && new Date(t.dueDate) <= new Date(today.getTime() + 86400000))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  const metrics = [
    { label: 'Active candidates', value: candidates.length, sub: `${activeSubs.length} in pipeline` },
    { label: 'Open jobs', value: openJobs.length, sub: `across ${new Set(openJobs.map(j => j.clientId)).size} clients` },
    { label: 'Interviews this week', value: interviews.filter(i => {
      const d = new Date(i.datetime); const now = new Date();
      const week = new Date(now.getTime() + 7 * 86400000);
      return d > now && d < week;
    }).length, sub: 'scheduled' },
    { label: 'Placements this month', value: placedThisMonth.length, sub: placedThisMonth.length === 1 ? 'placement' : 'placements' },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-lg p-5 border border-stone-200">
            <div className="text-[11px] uppercase tracking-wider text-stone-500">{m.label}</div>
            <div className="font-display text-4xl mt-2" style={{ color: '#1a1612' }}>{m.value}</div>
            <div className="text-xs text-stone-500 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Tasks + Stale alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-5 border border-stone-200">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-xl flex items-center gap-2"><CheckSquare size={18} /> Tasks for today</h3>
            <button onClick={() => go('tasks')} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
              All tasks <ArrowRight size={12} />
            </button>
          </div>
          {urgentTasks.length === 0 ? (
            <EmptyHint>Nothing urgent. Add a task to track follow-ups.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map(t => {
                const overdue = new Date(t.dueDate) < today;
                return (
                  <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <Square size={14} className="text-stone-400 flex-shrink-0" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className={`text-xs ${overdue ? 'text-red-700 font-medium' : 'text-stone-500'}`}>
                      {overdue ? `${Math.floor((today - new Date(t.dueDate)) / 86400000)}d overdue` : 'Today'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-5 border border-stone-200">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-xl flex items-center gap-2"><AlertTriangle size={18} /> Stale candidates</h3>
            <span className="text-xs text-stone-500">No activity 14+ days</span>
          </div>
          {staleSubmissions.length === 0 ? (
            <EmptyHint>All candidates have recent activity — good work.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {staleSubmissions.map(({ sub, daysSince }) => {
                const cand = candidates.find(c => c.id === sub.candidateId);
                const job = jobs.find(j => j.id === sub.jobId);
                return (
                  <div key={sub.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className="font-medium truncate">{cand?.name || 'Unknown'}</span>
                      <span className="text-stone-500"> · {job?.title || '—'} · {sub.stage}</span>
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#fdf2ec', color: '#8B2929' }}>
                      {daysSince}d
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Funnel + Source effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-5 border border-stone-200">
          <h3 className="font-display text-xl mb-1">Conversion funnel</h3>
          <p className="text-xs text-stone-500 mb-4">All-time candidates per stage. Wide drop-offs flag where you're losing them.</p>
          {funnelData.every(d => d.count === 0) ? (
            <EmptyHint>Add candidates to a pipeline to see the funnel.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {funnelData.map((d, i) => {
                const max = funnelData[0].count || 1;
                const width = (d.count / max) * 100;
                const prevCount = i > 0 ? funnelData[i - 1].count : null;
                const dropPct = prevCount && prevCount > 0 ? Math.round((1 - d.count / prevCount) * 100) : null;
                return (
                  <div key={d.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-700 font-medium">{d.stage}</span>
                      <span className="text-stone-500">
                        {d.count}
                        {dropPct !== null && dropPct > 0 && i > 0 && <span className="ml-2 text-red-700">−{dropPct}%</span>}
                      </span>
                    </div>
                    <div className="h-6 bg-stone-100 rounded overflow-hidden">
                      <div className="h-full rounded flex items-center px-2 text-[11px] text-white font-medium transition-all"
                           style={{ width: `${Math.max(width, 4)}%`, backgroundColor: STAGE_PALETTE[i % STAGE_PALETTE.length] }}>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-5 border border-stone-200">
          <h3 className="font-display text-xl mb-1">Source effectiveness</h3>
          <p className="text-xs text-stone-500 mb-4">Total candidates vs placements by source.</p>
          {sourceData.length === 0 ? (
            <EmptyHint>Add candidates with a source to compare.</EmptyHint>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d2" />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#6b6358' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b6358' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e1d2', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" name="Total" fill="#8B7355" radius={[4, 4, 0, 0]} />
                <Bar dataKey="placed" name="Placed" fill="#4A7C59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Call outcomes + Pipeline by stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg p-5 border border-stone-200">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-xl">Pipeline by stage (active)</h3>
            <span className="text-xs text-stone-500">{activeSubs.length} active</span>
          </div>
          {stageData.length === 0 ? (
            <EmptyHint>Add candidates to a job's pipeline to see them here.</EmptyHint>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d2" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b6358' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b6358' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e1d2', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#C45E3A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg p-5 border border-stone-200">
          <h3 className="font-display text-xl mb-1">Call outcomes</h3>
          <p className="text-xs text-stone-500 mb-3">Status of all candidates called.</p>
          {callOutcomeData.length === 0 ? (
            <EmptyHint>No call statuses logged yet.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {callOutcomeData.sort((a, b) => b.value - a.value).map(d => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate text-stone-700">{d.name}</span>
                  <span className="text-stone-500 text-xs">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top clients + Upcoming interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 border border-stone-200">
          <h3 className="font-display text-xl mb-4">Top clients</h3>
          {clientData.length === 0 ? (
            <EmptyHint>No submissions yet.</EmptyHint>
          ) : (
            <div className="space-y-3">
              {clientData.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-700">{c.name}</span>
                    <span className="text-stone-500 text-xs">{c.submissions}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      backgroundColor: '#8B7355',
                      width: `${(c.submissions / clientData[0].submissions) * 100}%`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg p-5 border border-stone-200">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-xl">Upcoming interviews</h3>
            <button onClick={() => go('calendar')} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
              View calendar <ArrowRight size={12} />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <EmptyHint>Nothing scheduled. Add interviews from the pipeline view.</EmptyHint>
          ) : (
            <div className="divide-y divide-stone-100">
              {upcoming.map(intv => {
                const sub = submissions.find(s => s.id === intv.submissionId);
                const cand = sub ? candidates.find(c => c.id === sub.candidateId) : null;
                const job = sub ? jobs.find(j => j.id === sub.jobId) : null;
                const client = job ? clients.find(c => c.id === job.clientId) : null;
                return (
                  <div key={intv.id} className="py-3 flex items-center gap-4">
                    <div className="w-14 text-center flex-shrink-0">
                      <div className="text-[11px] uppercase text-stone-500">
                        {new Date(intv.datetime).toLocaleDateString(undefined, { month: 'short' })}
                      </div>
                      <div className="font-display text-2xl leading-none">
                        {new Date(intv.datetime).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {cand?.name || 'Unknown candidate'} <span className="text-stone-400 mx-1">·</span>
                        <span className="text-stone-600">{job?.title || 'Job removed'}</span>
                      </div>
                      <div className="text-xs text-stone-500 truncate">
                        {client?.name || ''} {intv.type ? ` · ${intv.type}` : ''} · {new Date(intv.datetime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wider px-2 py-1 rounded"
                          style={{ backgroundColor: '#f1ede4', color: '#6b6358' }}>
                      {intv.type || 'interview'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ CANDIDATES ============
function CandidatesView({ ctx }) {
  const { candidates, setCandidates, team, submissions, setSubmissions, jobs, clients, flash } = ctx;
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = candidates.filter(c => {
    if (statusFilter && c.callStatus !== statusFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name?.toLowerCase().includes(q) ||
           c.email?.toLowerCase().includes(q) ||
           c.phone?.toLowerCase().includes(q) ||
           c.role?.toLowerCase().includes(q);
  });

  // Helper: get the most recent active submission for a candidate
  const candidateLatestSub = (candId) => {
    const subs = submissions
      .filter(s => s.candidateId === candId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const active = subs.find(s => !['Placed', 'Rejected', 'Withdrawn'].includes(s.stage));
    return { latest: active || subs[0], total: subs.length };
  };

  const saveCandidate = (data) => {
    const isNew = !data.id;
    const { assignedJobId, ...candData } = data;

    if (isNew) {
      const newId = uid();
      const next = { ...candData, id: newId, createdAt: new Date().toISOString() };
      setCandidates(prev => [next, ...prev]);

      // If a job was assigned, auto-create a submission at first stage
      if (assignedJobId) {
        const job = jobs.find(j => j.id === assignedJobId);
        if (job && job.stages?.length > 0) {
          setSubmissions(prev => [...prev, {
            id: uid(),
            candidateId: newId,
            jobId: assignedJobId,
            stage: job.stages[0],
            notes: '',
            createdAt: new Date().toISOString()
          }]);
          flash('Candidate added and assigned to job');
        } else {
          flash('Candidate added (job had no stages — skipped assignment)', 'error');
        }
      } else {
        flash('Candidate added');
      }
    } else {
      setCandidates(prev => prev.map(c => c.id === data.id ? { ...c, ...candData, updatedAt: new Date().toISOString() } : c));
      // If editing and assigning to a new job, create submission if not already there
      if (assignedJobId && !submissions.some(s => s.candidateId === data.id && s.jobId === assignedJobId)) {
        const job = jobs.find(j => j.id === assignedJobId);
        if (job && job.stages?.length > 0) {
          setSubmissions(prev => [...prev, {
            id: uid(),
            candidateId: data.id,
            jobId: assignedJobId,
            stage: job.stages[0],
            notes: '',
            createdAt: new Date().toISOString()
          }]);
        }
      }
      flash('Candidate updated');
    }
    setEditing(null);
  };

  const deleteCandidate = (id) => {
    if (!confirm('Delete this candidate? Their pipeline submissions will also be removed.')) return;
    setCandidates(prev => prev.filter(c => c.id !== id));
    ctx.setSubmissions(prev => prev.filter(s => s.candidateId !== id));
    flash('Candidate removed');
    setViewing(null);
  };

  const exportToExcel = () => {
    if (candidates.length === 0) {
      flash('No candidates to export', 'error');
      return;
    }
    const rows = candidates.map(c => {
      const { latest } = candidateLatestSub(c.id);
      const job = latest ? jobs.find(j => j.id === latest.jobId) : null;
      const client = job ? clients.find(cl => cl.id === job.clientId) : null;
      const owner = team.find(t => t.id === c.ownerId);
      return {
        Name: c.name || '',
        Email: c.email || '',
        Phone: c.phone || '',
        Location: c.location || '',
        Role: c.role || '',
        Source: c.source || '',
        'Call Status': c.callStatus || '',
        'Current Job': job?.title || '',
        'Client': client?.name || '',
        'Pipeline Stage': latest?.stage || '',
        Owner: owner?.name || '',
        Notes: c.notes || '',
        'Added Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `candidates-${dateStr}.xlsx`);
    flash(`Exported ${candidates.length} candidates`);
  };

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle={`${candidates.length} total${filtered.length !== candidates.length ? ` · ${filtered.length} shown` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={candidates.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-stone-300 hover:bg-stone-50 disabled:opacity-50"
              title="Download Excel file"
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white"
              style={{ backgroundColor: '#C45E3A' }}
            >
              <Plus size={16} /> Add candidate
            </button>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, or role…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-md text-sm placeholder:text-stone-400 focus:border-stone-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-md text-sm"
        >
          <option value="">All call statuses</option>
          {CALL_STATUSES.filter(s => s.value).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <Users size={32} className="mx-auto text-stone-300 mb-3" />
          <div className="font-display text-xl mb-1">
            {candidates.length === 0 ? 'No candidates yet' : 'No matches'}
          </div>
          <div className="text-sm text-stone-500 mb-4">
            {candidates.length === 0 ? 'Build your database by adding your first candidate.' : 'Try changing your search or filter.'}
          </div>
          {candidates.length === 0 && (
            <button onClick={() => setEditing({})} className="text-sm text-white px-4 py-2 rounded-md" style={{ backgroundColor: '#C45E3A' }}>
              Add candidate
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-stone-500 border-b border-stone-200">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Job</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-3">Call Status</div>
            <div className="col-span-1 text-right">Added</div>
          </div>
          {filtered.map(c => {
            const { latest, total } = candidateLatestSub(c.id);
            const job = latest ? jobs.find(j => j.id === latest.jobId) : null;
            const client = job ? clients.find(cl => cl.id === job.clientId) : null;
            const otherSubs = total - (latest ? 1 : 0);
            return (
              <button
                key={c.id}
                onClick={() => setViewing(c)}
                className="w-full grid grid-cols-12 px-5 py-3.5 text-sm border-b border-stone-100 hover:bg-stone-50 text-left items-center"
              >
                <div className="col-span-3 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-stone-500 truncate">{c.email || c.phone || c.role}</div>
                </div>
                <div className="col-span-3 min-w-0">
                  {job ? (
                    <div>
                      <div className="text-stone-800 truncate">{job.title}</div>
                      {latest && (
                        <div className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: '#C45E3A' }}>
                          {latest.stage}{otherSubs > 0 ? ` · +${otherSubs} more` : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-stone-400">— Not assigned —</span>
                  )}
                </div>
                <div className="col-span-2 text-stone-600 truncate">
                  {client?.name || <span className="text-stone-400">—</span>}
                </div>
                <div className="col-span-3">
                  {c.callStatus ? (
                    <span className="text-xs px-2 py-1 rounded inline-flex items-center gap-1.5"
                          style={{ backgroundColor: callStatusColor(c.callStatus) + '22', color: callStatusColor(c.callStatus) }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: callStatusColor(c.callStatus) }} />
                      {c.callStatus}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">— Not called —</span>
                  )}
                </div>
                <div className="col-span-1 text-xs text-stone-500 text-right">{fmtRelative(c.createdAt)}</div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <CandidateModal
          candidate={editing}
          team={team}
          jobs={jobs}
          clients={clients}
          onSave={saveCandidate}
          onClose={() => setEditing(null)}
        />
      )}
      {viewing && (
        <CandidateDetail
          candidate={viewing}
          team={team}
          submissions={submissions.filter(s => s.candidateId === viewing.id)}
          jobs={jobs}
          clients={clients}
          onUpdateCallStatus={(status) => {
            setCandidates(prev => prev.map(x => x.id === viewing.id ? { ...x, callStatus: status, lastCalledAt: new Date().toISOString() } : x));
            setViewing({ ...viewing, callStatus: status, lastCalledAt: new Date().toISOString() });
          }}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onDelete={() => deleteCandidate(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function CandidateModal({ candidate, team, jobs, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', location: '', role: '', source: '',
    callStatus: '', notes: '', ownerId: team[0]?.id || '',
    assignedJobId: '',
    ...candidate
  });

  const openJobs = jobs.filter(j => j.status !== 'closed');
  const isNew = !candidate?.id;

  return (
    <Modal title={isNew ? 'New candidate' : 'Edit candidate'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" required>
          <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Current / target role">
          <input className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Senior Backend Engineer" />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
        </Field>
        <Field label="Source">
          <select className={inputCls} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
            <option value="">Select…</option>
            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Owner">
          <select className={inputCls} value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}>
            {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Call status">
          <select className={inputCls} value={form.callStatus} onChange={e => setForm({ ...form, callStatus: e.target.value })}>
            {CALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Assign to job (optional)" full>
          <select className={inputCls} value={form.assignedJobId} onChange={e => setForm({ ...form, assignedJobId: e.target.value })}>
            <option value="">— None / sourced for general database —</option>
            {openJobs.map(j => {
              const c = clients.find(cl => cl.id === j.clientId);
              return <option key={j.id} value={j.id}>{c?.name || '—'} · {j.title}</option>;
            })}
          </select>
          {isNew && form.assignedJobId && (
            <div className="text-[11px] text-stone-500 mt-1">
              Candidate will be added to this job's pipeline at the first stage.
            </div>
          )}
        </Field>
        <Field label="Notes" full>
          <textarea className={inputCls + ' h-24 resize-y'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>

      <ModalFooter>
        <button onClick={onClose} className={btnGhostCls}>Cancel</button>
        <button
          onClick={() => { if (!form.name.trim()) return; onSave(form); }}
          disabled={!form.name.trim()}
          className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}
        >
          Save candidate
        </button>
      </ModalFooter>
    </Modal>
  );
}

function CandidateDetail({ candidate, team, submissions, jobs, clients, onUpdateCallStatus, onEdit, onDelete, onClose }) {
  const owner = team.find(t => t.id === candidate.ownerId);
  return (
    <Modal title={candidate.name} subtitle={candidate.role} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
            {candidate.email && <Info icon={Mail} label="Email" value={candidate.email} />}
            {candidate.phone && <Info icon={Phone} label="Phone" value={candidate.phone} />}
            {candidate.location && <Info icon={MapPin} label="Location" value={candidate.location} />}
            {candidate.source && <Info icon={Star} label="Source" value={candidate.source} />}
          </div>

          <div className="mb-5 p-4 rounded-lg border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E8E1D2' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <PhoneCall size={11} /> Call status
              </div>
              {candidate.lastCalledAt && (
                <div className="text-[11px] text-stone-500">Updated {fmtRelative(candidate.lastCalledAt)}</div>
              )}
            </div>
            <select
              value={candidate.callStatus || ''}
              onChange={e => onUpdateCallStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-sm focus:border-stone-500"
            >
              {CALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="text-[11px] text-stone-500 mt-1.5">Changes save instantly.</div>
          </div>

          {candidate.notes && (
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Notes</div>
              <div className="text-sm text-stone-700 whitespace-pre-wrap">{candidate.notes}</div>
            </div>
          )}
        </div>

        <div>
          {owner && (
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Owner</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                      style={{ backgroundColor: owner.color }}>
                  {owner.name.charAt(0).toUpperCase()}
                </span>
                {owner.name}
              </div>
            </div>
          )}

          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Pipeline ({submissions.length})</div>
            {submissions.length === 0 ? (
              <div className="text-sm text-stone-400">Not assigned to any job yet.</div>
            ) : (
              <div className="space-y-2">
                {submissions.map(s => {
                  const job = jobs.find(j => j.id === s.jobId);
                  const client = job ? clients.find(c => c.id === job.clientId) : null;
                  return (
                    <div key={s.id} className="text-sm bg-stone-50 rounded p-2 border border-stone-200">
                      <div className="font-medium text-stone-800 truncate">{job?.title || 'Removed'}</div>
                      <div className="text-xs text-stone-500 truncate">{client?.name}</div>
                      <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: '#C45E3A' }}>{s.stage}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Added</div>
          <div className="text-sm text-stone-600">{fmtDate(candidate.createdAt)}</div>
        </div>
      </div>

      <ModalFooter>
        <button onClick={onDelete} className="text-sm text-red-700 hover:text-red-900 mr-auto flex items-center gap-1">
          <Trash2 size={14} /> Delete
        </button>
        <button onClick={onClose} className={btnGhostCls}>Close</button>
        <button onClick={onEdit} className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}>Edit</button>
      </ModalFooter>
    </Modal>
  );
}

// ============ CLIENTS & JOBS ============
function ClientsView({ ctx }) {
  const { clients, setClients, jobs, setJobs, submissions, setSubmissions, settings, flash } = ctx;
  const [editingClient, setEditingClient] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);

  const saveClient = (data) => {
    if (!data.id) {
      setClients(prev => [{ ...data, id: uid(), createdAt: new Date().toISOString() }, ...prev]);
      flash('Client added');
    } else {
      setClients(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
      flash('Client updated');
    }
    setEditingClient(null);
  };

  const deleteClient = (id) => {
    if (!confirm('Delete this client and all its jobs? Pipeline submissions for these jobs will also be removed.')) return;
    const clientJobIds = jobs.filter(j => j.clientId === id).map(j => j.id);
    setClients(prev => prev.filter(c => c.id !== id));
    setJobs(prev => prev.filter(j => j.clientId !== id));
    setSubmissions(prev => prev.filter(s => !clientJobIds.includes(s.jobId)));
    flash('Client removed');
  };

  const saveJob = (data) => {
    if (!data.id) {
      setJobs(prev => [{ ...data, id: uid(), createdAt: new Date().toISOString(), status: 'open' }, ...prev]);
      flash('Job added');
    } else {
      setJobs(prev => prev.map(j => j.id === data.id ? { ...j, ...data } : j));
      flash('Job updated');
    }
    setEditingJob(null);
  };

  const deleteJob = (id) => {
    if (!confirm('Delete this job and remove all its pipeline submissions?')) return;
    setJobs(prev => prev.filter(j => j.id !== id));
    setSubmissions(prev => prev.filter(s => s.jobId !== id));
    flash('Job removed');
  };

  return (
    <div>
      <PageHeader
        title="Clients & Jobs"
        subtitle={`${clients.length} clients · ${jobs.filter(j => j.status === 'open').length} open roles`}
        action={
          <button
            onClick={() => setEditingClient({})}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white"
            style={{ backgroundColor: '#C45E3A' }}
          >
            <Plus size={16} /> Add client
          </button>
        }
      />

      {clients.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <Building2 size={32} className="mx-auto text-stone-300 mb-3" />
          <div className="font-display text-xl mb-1">No clients yet</div>
          <div className="text-sm text-stone-500 mb-4">Add a client to start tracking their open roles.</div>
          <button onClick={() => setEditingClient({})} className="text-sm text-white px-4 py-2 rounded-md" style={{ backgroundColor: '#C45E3A' }}>
            Add client
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const clientJobs = jobs.filter(j => j.clientId === client.id);
            const open = clientJobs.filter(j => j.status === 'open').length;
            const isExpanded = expandedClient === client.id;
            return (
              <div key={client.id} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                <div className="flex items-center px-5 py-4 hover:bg-stone-50">
                  <button onClick={() => setExpandedClient(isExpanded ? null : client.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                    {isExpanded ? <ChevronDown size={16} className="text-stone-400" /> : <ChevronRight size={16} className="text-stone-400" />}
                    <Building2 size={18} className="text-stone-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{client.name}</div>
                      {client.contactPerson && (
                        <div className="text-xs text-stone-500 truncate">{client.contactPerson} · {client.contactEmail}</div>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mr-2">{open} open · {clientJobs.length} total</div>
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <IconBtn onClick={() => setEditingClient(client)} title="Edit client"><Edit2 size={14} /></IconBtn>
                    <IconBtn onClick={() => deleteClient(client.id)} title="Delete client"><Trash2 size={14} /></IconBtn>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-stone-200 px-5 py-4 bg-stone-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] uppercase tracking-wider text-stone-500">Open roles</div>
                      <button
                        onClick={() => setEditingJob({ clientId: client.id, stages: [...(settings.defaultStages || DEFAULT_STAGES)] })}
                        className="text-xs flex items-center gap-1 text-stone-600 hover:text-stone-900"
                      >
                        <Plus size={12} /> Add job
                      </button>
                    </div>
                    {clientJobs.length === 0 ? (
                      <div className="text-sm text-stone-400">No jobs yet for this client.</div>
                    ) : (
                      <div className="space-y-2">
                        {clientJobs.map(job => {
                          const jobSubs = submissions.filter(s => s.jobId === job.id);
                          const active = jobSubs.filter(s => !['Placed', 'Rejected', 'Withdrawn'].includes(s.stage)).length;
                          return (
                            <div key={job.id} className="bg-white rounded border border-stone-200 px-3 py-2.5 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{job.title}</div>
                                <div className="text-xs text-stone-500 truncate">
                                  {job.location} {job.salaryRange ? ` · ${job.salaryRange}` : ''} · {job.stages?.length || 0} stages
                                </div>
                              </div>
                              <span className="text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: job.status === 'open' ? '#e8f0e6' : '#f1ede4',
                                             color: job.status === 'open' ? '#4a7c59' : '#6b6358' }}>
                                {job.status}
                              </span>
                              <span className="text-xs text-stone-500">{active} active</span>
                              <IconBtn onClick={() => setEditingJob(job)} title="Edit"><Edit2 size={12} /></IconBtn>
                              <IconBtn onClick={() => deleteJob(job.id)} title="Delete"><Trash2 size={12} /></IconBtn>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingClient && (
        <ClientModal client={editingClient} onSave={saveClient} onClose={() => setEditingClient(null)} />
      )}
      {editingJob && (
        <JobModal job={editingJob} clients={clients} team={ctx.team} onSave={saveJob} onClose={() => setEditingJob(null)} />
      )}
    </div>
  );
}

function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', contactPerson: '', contactEmail: '', contactPhone: '', notes: '', ...client });
  return (
    <Modal title={client?.id ? 'Edit client' : 'New client'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Company name" required>
          <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact person">
            <input className={inputCls} value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
          </Field>
          <Field label="Contact email">
            <input className={inputCls} type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
        </div>
        <Field label="Contact phone">
          <input className={inputCls} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
        </Field>
        <Field label="Notes">
          <textarea className={inputCls + ' h-24 resize-y'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
      <ModalFooter>
        <button onClick={onClose} className={btnGhostCls}>Cancel</button>
        <button onClick={() => { if (form.name.trim()) onSave(form); }} disabled={!form.name.trim()} className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}>Save client</button>
      </ModalFooter>
    </Modal>
  );
}

function JobModal({ job, clients, team, onSave, onClose }) {
  const [form, setForm] = useState({
    clientId: '', title: '', location: '', salaryRange: '', description: '',
    stages: [...DEFAULT_STAGES], ownerId: team[0]?.id || '', status: 'open',
    ...job
  });
  const [stageInput, setStageInput] = useState('');

  const addStage = () => {
    const s = stageInput.trim();
    if (s && !form.stages.includes(s)) setForm({ ...form, stages: [...form.stages, s] });
    setStageInput('');
  };
  const moveStage = (i, dir) => {
    const next = [...form.stages];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setForm({ ...form, stages: next });
  };

  return (
    <Modal title={job?.id ? 'Edit job' : 'New job'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Client" required>
          <select className={inputCls} value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Job title" required>
          <input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Backend Engineer" />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, Country / Remote" />
        </Field>
        <Field label="Salary range">
          <input className={inputCls} value={form.salaryRange} onChange={e => setForm({ ...form, salaryRange: e.target.value })} placeholder="e.g. £80-100k" />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="open">Open</option><option value="on-hold">On hold</option><option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Owner">
          <select className={inputCls} value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}>
            {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Job description" full>
          <textarea className={inputCls + ' h-24 resize-y'} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </Field>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-xs font-medium text-stone-700">Pipeline stages for this job</label>
          <span className="text-[11px] text-stone-500">Drag-free reorder using arrows</span>
        </div>
        <div className="space-y-1.5 mb-2 bg-stone-50 rounded p-2 border border-stone-200">
          {form.stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-stone-200">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_PALETTE[i % STAGE_PALETTE.length] }} />
              <span className="flex-1 text-sm">{s}</span>
              <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="text-stone-400 hover:text-stone-900 disabled:opacity-30 text-xs px-1">↑</button>
              <button onClick={() => moveStage(i, 1)} disabled={i === form.stages.length - 1} className="text-stone-400 hover:text-stone-900 disabled:opacity-30 text-xs px-1">↓</button>
              <button onClick={() => setForm({ ...form, stages: form.stages.filter((_, idx) => idx !== i) })}
                      className="text-stone-400 hover:text-red-700">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={inputCls + ' flex-1'}
            value={stageInput}
            onChange={e => setStageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStage(); } }}
            placeholder="Add a stage and press Enter (e.g. Technical Interview)"
          />
          <button onClick={addStage} className="px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-50">Add</button>
        </div>
      </div>

      <ModalFooter>
        <button onClick={onClose} className={btnGhostCls}>Cancel</button>
        <button
          onClick={() => { if (form.clientId && form.title.trim() && form.stages.length > 0) onSave(form); }}
          disabled={!form.clientId || !form.title.trim() || form.stages.length === 0}
          className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}
        >
          Save job
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ============ PIPELINE ============
function PipelineView({ ctx }) {
  const { candidates, jobs, clients, submissions, setSubmissions, interviews, setInterviews, flash } = ctx;
  const openJobs = jobs.filter(j => j.status !== 'closed');
  const [selectedJobId, setSelectedJobId] = useState(openJobs[0]?.id || '');
  const [adding, setAdding] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!selectedJobId && openJobs.length > 0) setSelectedJobId(openJobs[0].id);
  }, [openJobs.length]);

  const job = jobs.find(j => j.id === selectedJobId);
  const client = job ? clients.find(c => c.id === job.clientId) : null;
  const jobSubs = submissions.filter(s => s.jobId === selectedJobId);

  const onDragStart = (subId) => { dragRef.current = subId; };
  const onDrop = (stage) => {
    const id = dragRef.current;
    if (!id) return;
    setSubmissions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updates = { stage, updatedAt: new Date().toISOString() };
      if (stage === 'Placed') updates.placedAt = new Date().toISOString();
      return { ...s, ...updates };
    }));
    dragRef.current = null;
    flash(`Moved to ${stage}`);
  };

  const addToPipeline = (candidateId) => {
    if (submissions.some(s => s.candidateId === candidateId && s.jobId === selectedJobId)) {
      flash('Already in this pipeline', 'error'); return;
    }
    const newSub = {
      id: uid(), candidateId, jobId: selectedJobId,
      stage: job.stages[0], notes: '', createdAt: new Date().toISOString()
    };
    setSubmissions(prev => [...prev, newSub]);
    setAdding(false);
    flash('Added to pipeline');
  };

  const removeFromPipeline = (subId) => {
    if (!confirm('Remove from pipeline?')) return;
    setSubmissions(prev => prev.filter(s => s.id !== subId));
    setInterviews(prev => prev.filter(i => i.submissionId !== subId));
    setActiveSub(null);
    flash('Removed');
  };

  if (openJobs.length === 0) {
    return (
      <div>
        <PageHeader title="Pipeline" subtitle="Drag candidates between stages" />
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <Layout size={32} className="mx-auto text-stone-300 mb-3" />
          <div className="font-display text-xl mb-1">No open jobs</div>
          <div className="text-sm text-stone-500">Add a client and a job first, then come back here to build the pipeline.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={client ? `${client.name} · ${job.title}` : 'Drag candidates between stages'}
        action={
          <div className="flex items-center gap-2">
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="px-3 py-2 rounded-md text-sm bg-white border border-stone-200 max-w-xs"
            >
              {openJobs.map(j => {
                const c = clients.find(cl => cl.id === j.clientId);
                return <option key={j.id} value={j.id}>{c?.name || '—'} · {j.title}</option>;
              })}
            </select>
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white"
              style={{ backgroundColor: '#C45E3A' }}
            >
              <UserPlus size={16} /> Add candidate
            </button>
          </div>
        }
      />

      {!job ? null : (
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4">
          {job.stages.map((stage, idx) => {
            const stageSubs = jobSubs.filter(s => s.stage === stage);
            return (
              <div
                key={stage}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(stage)}
                className="flex-shrink-0 w-72 bg-stone-100/60 rounded-lg border border-stone-200"
              >
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-stone-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_PALETTE[idx % STAGE_PALETTE.length] }} />
                    <span className="text-xs font-medium uppercase tracking-wider truncate">{stage}</span>
                  </div>
                  <span className="text-xs text-stone-500 ml-2">{stageSubs.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto stage-col-scroll">
                  {stageSubs.map(sub => {
                    const cand = candidates.find(c => c.id === sub.candidateId);
                    const subInts = interviews.filter(i => i.submissionId === sub.id);
                    if (!cand) return null;
                    return (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={() => onDragStart(sub.id)}
                        onClick={() => setActiveSub(sub)}
                        className="bg-white rounded-md border border-stone-200 p-3 cursor-grab active:cursor-grabbing hover:border-stone-300 hover:shadow-sm transition"
                      >
                        <div className="text-sm font-medium truncate">{cand.name}</div>
                        <div className="text-xs text-stone-500 truncate">{cand.role}</div>
                        {cand.callStatus && (
                          <div className="mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                                  style={{ backgroundColor: callStatusColor(cand.callStatus) + '22', color: callStatusColor(cand.callStatus) }}>
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: callStatusColor(cand.callStatus) }} />
                              {cand.callStatus}
                            </span>
                          </div>
                        )}
                        {subInts.length > 0 && (
                          <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1">
                            <CalendarDays size={11} />
                            {subInts.length} interview{subInts.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stageSubs.length === 0 && (
                    <div className="text-xs text-stone-400 text-center py-4">Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <Modal title="Add candidate to pipeline" onClose={() => setAdding(false)}>
          <AddToPipelinePicker
            candidates={candidates}
            existingIds={jobSubs.map(s => s.candidateId)}
            onPick={addToPipeline}
          />
        </Modal>
      )}

      {activeSub && (
        <SubmissionDetail
          sub={activeSub}
          job={job}
          candidate={candidates.find(c => c.id === activeSub.candidateId)}
          interviews={interviews.filter(i => i.submissionId === activeSub.id)}
          onClose={() => setActiveSub(null)}
          onAddInterview={() => setEditingInterview({ submissionId: activeSub.id })}
          onEditInterview={(intv) => setEditingInterview(intv)}
          onDeleteInterview={(id) => {
            if (!confirm('Delete this interview?')) return;
            setInterviews(prev => prev.filter(i => i.id !== id));
            flash('Interview removed');
          }}
          onUpdateNotes={(notes) => {
            setSubmissions(prev => prev.map(s => s.id === activeSub.id ? { ...s, notes } : s));
            setActiveSub({ ...activeSub, notes });
          }}
          onRemove={() => removeFromPipeline(activeSub.id)}
        />
      )}

      {editingInterview && (
        <InterviewModal
          interview={editingInterview}
          onSave={(data) => {
            if (data.id) {
              setInterviews(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i));
              flash('Interview updated');
            } else {
              setInterviews(prev => [...prev, { ...data, id: uid(), createdAt: new Date().toISOString() }]);
              flash('Interview scheduled');
            }
            setEditingInterview(null);
          }}
          onClose={() => setEditingInterview(null)}
        />
      )}
    </div>
  );
}

function AddToPipelinePicker({ candidates, existingIds, onPick }) {
  const [q, setQ] = useState('');
  const filt = candidates.filter(c =>
    !existingIds.includes(c.id) &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.role || '').toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search candidates…"
        className={inputCls + ' mb-3'}
      />
      <div className="max-h-72 overflow-y-auto scrollbar-thin border border-stone-200 rounded">
        {filt.length === 0 ? (
          <div className="p-4 text-sm text-stone-500 text-center">No matching candidates available.</div>
        ) : filt.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="w-full text-left px-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-xs text-stone-500 truncate">{c.role}</div>
            </div>
            <ArrowRight size={14} className="text-stone-400 flex-shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmissionDetail({ sub, job, candidate, interviews, onClose, onAddInterview, onEditInterview, onDeleteInterview, onUpdateNotes, onRemove }) {
  const [notes, setNotes] = useState(sub.notes || '');
  if (!candidate) return null;

  return (
    <Modal title={candidate.name} subtitle={`${job.title} · ${sub.stage}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Stage notes</div>
            <textarea
              className={inputCls + ' h-28 resize-y'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => onUpdateNotes(notes)}
              placeholder="Notes specific to this candidate's progress on this role…"
            />
            <div className="text-[11px] text-stone-400 mt-1">Saves when you click away</div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-stone-500">Interviews ({interviews.length})</div>
              <button onClick={onAddInterview} className="text-xs flex items-center gap-1 text-stone-600 hover:text-stone-900">
                <Plus size={12} /> Schedule
              </button>
            </div>
            {interviews.length === 0 ? (
              <div className="text-sm text-stone-400">None scheduled.</div>
            ) : (
              <div className="space-y-2">
                {interviews.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)).map(intv => (
                  <div key={intv.id} className="bg-stone-50 rounded p-3 border border-stone-200 flex items-start gap-3">
                    <div className="text-stone-500 flex-shrink-0"><CalendarDays size={14} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{fmtDateTime(intv.datetime)}</div>
                      <div className="text-xs text-stone-500">{intv.type} {intv.interviewer ? ` · ${intv.interviewer}` : ''} {intv.location ? ` · ${intv.location}` : ''}</div>
                      {intv.notes && <div className="text-xs text-stone-600 mt-1 whitespace-pre-wrap">{intv.notes}</div>}
                    </div>
                    <IconBtn onClick={() => onEditInterview(intv)}><Edit2 size={12} /></IconBtn>
                    <IconBtn onClick={() => onDeleteInterview(intv.id)}><Trash2 size={12} /></IconBtn>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm space-y-3">
          {candidate.email && <Info icon={Mail} label="Email" value={candidate.email} />}
          {candidate.phone && <Info icon={Phone} label="Phone" value={candidate.phone} />}
          {candidate.location && <Info icon={MapPin} label="Location" value={candidate.location} />}
          {candidate.callStatus && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
                <PhoneCall size={11} /> Call status
              </div>
              <span className="text-xs px-2 py-1 rounded inline-flex items-center gap-1.5"
                    style={{ backgroundColor: callStatusColor(candidate.callStatus) + '22', color: callStatusColor(candidate.callStatus) }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: callStatusColor(candidate.callStatus) }} />
                {candidate.callStatus}
              </span>
            </div>
          )}
          <div className="text-[11px] text-stone-500">
            In pipeline since {fmtDate(sub.createdAt)}
          </div>
        </div>
      </div>

      <ModalFooter>
        <button onClick={onRemove} className="text-sm text-red-700 hover:text-red-900 mr-auto flex items-center gap-1">
          <Trash2 size={14} /> Remove from pipeline
        </button>
        <button onClick={onClose} className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}>Done</button>
      </ModalFooter>
    </Modal>
  );
}

function InterviewModal({ interview, onSave, onClose }) {
  const initDt = interview.datetime ? new Date(interview.datetime) : new Date(Date.now() + 86400000);
  const pad = n => String(n).padStart(2, '0');
  const initDateStr = `${initDt.getFullYear()}-${pad(initDt.getMonth() + 1)}-${pad(initDt.getDate())}`;
  const initTimeStr = `${pad(initDt.getHours())}:${pad(initDt.getMinutes())}`;

  const [form, setForm] = useState({
    type: 'Phone', interviewer: '', location: '', notes: '',
    date: initDateStr, time: initTimeStr,
    ...interview,
    date: interview.datetime ? initDateStr : initDateStr,
    time: interview.datetime ? initTimeStr : initTimeStr,
  });

  const submit = () => {
    const iso = new Date(`${form.date}T${form.time}`).toISOString();
    onSave({ ...form, datetime: iso });
  };

  return (
    <Modal title={interview.id ? 'Edit interview' : 'Schedule interview'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" required>
          <input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Time" required>
          <input type="time" className={inputCls} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        </Field>
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option>Phone</option><option>Video</option><option>Onsite</option><option>Technical</option><option>Final</option>
          </select>
        </Field>
        <Field label="Interviewer">
          <input className={inputCls} value={form.interviewer} onChange={e => setForm({ ...form, interviewer: e.target.value })} />
        </Field>
        <Field label="Location / link" full>
          <input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Office address or video link" />
        </Field>
        <Field label="Notes" full>
          <textarea className={inputCls + ' h-20 resize-y'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
      <ModalFooter>
        <button onClick={onClose} className={btnGhostCls}>Cancel</button>
        <button onClick={submit} className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}>Save interview</button>
      </ModalFooter>
    </Modal>
  );
}

// ============ CALENDAR ============
function CalendarView({ ctx }) {
  const { interviews, submissions, candidates, jobs, clients, tasks } = ctx;
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [showInterviews, setShowInterviews] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = {};
    if (showInterviews) {
      interviews.forEach(intv => {
        const d = new Date(intv.datetime);
        const key = d.toDateString();
        if (!map[key]) map[key] = [];
        map[key].push({ kind: 'interview', data: intv, time: d, hasTime: true });
      });
    }
    if (showTasks) {
      (tasks || []).forEach(task => {
        if (!task.dueDate || task.completed) return;
        const d = new Date(`${task.dueDate}T${task.dueTime || '00:00'}`);
        const key = d.toDateString();
        if (!map[key]) map[key] = [];
        map[key].push({ kind: 'task', data: task, time: d, hasTime: !!task.dueTime });
      });
    }
    // Sort within each day: untimed tasks first, then chronological
    Object.values(map).forEach(arr => arr.sort((a, b) => {
      if (a.hasTime !== b.hasTime) return a.hasTime ? 1 : -1;
      return a.time - b.time;
    }));
    return map;
  }, [interviews, tasks, showInterviews, showTasks]);

  const move = (dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  const isToday = (d) => d.toDateString() === new Date().toDateString();

  // Color tokens
  const INTERVIEW_COLOR = '#C45E3A';
  const INTERVIEW_BG = '#fdf2ec';
  const TASK_COLOR = '#5F8A7E';
  const TASK_BG = '#eaf2ef';

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={`Week of ${weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => move(-1)} className={btnGhostCls}>← Prev</button>
            <button onClick={() => {
              const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); setWeekStart(d);
            }} className={btnGhostCls}>Today</button>
            <button onClick={() => move(1)} className={btnGhostCls}>Next →</button>
          </div>
        }
      />

      {/* Legend / filter toggles */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <button
          onClick={() => setShowInterviews(!showInterviews)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${showInterviews ? '' : 'opacity-40'}`}
          title="Toggle interviews"
        >
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: INTERVIEW_COLOR }} />
          <span className="text-stone-700">Interviews</span>
        </button>
        <button
          onClick={() => setShowTasks(!showTasks)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${showTasks ? '' : 'opacity-40'}`}
          title="Toggle tasks"
        >
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TASK_COLOR }} />
          <span className="text-stone-700">Tasks</span>
        </button>
        <span className="text-stone-400 ml-auto">Click a legend chip to hide/show</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(d => {
          const evs = eventsByDay[d.toDateString()] || [];
          return (
            <div key={d.toISOString()} className={`bg-white rounded-lg border min-h-[280px] ${isToday(d) ? 'border-orange-300' : 'border-stone-200'}`}>
              <div className={`px-3 py-2 border-b ${isToday(d) ? 'border-orange-300' : 'border-stone-200'} flex items-baseline justify-between`}>
                <div className="text-[11px] uppercase tracking-wider text-stone-500">
                  {d.toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div className={`font-display text-lg ${isToday(d) ? 'text-orange-700' : ''}`}>{d.getDate()}</div>
              </div>
              <div className="p-2 space-y-1.5">
                {evs.length === 0 ? (
                  <div className="text-[11px] text-stone-300 text-center py-4">—</div>
                ) : evs.map((e, idx) => {
                  if (e.kind === 'interview') {
                    const intv = e.data;
                    const sub = submissions.find(s => s.id === intv.submissionId);
                    const cand = sub ? candidates.find(c => c.id === sub.candidateId) : null;
                    const job = sub ? jobs.find(j => j.id === sub.jobId) : null;
                    const client = job ? clients.find(c => c.id === job.clientId) : null;
                    return (
                      <div key={`i-${intv.id}`} className="text-xs rounded p-1.5 border-l-2"
                           style={{ borderLeftColor: INTERVIEW_COLOR, backgroundColor: INTERVIEW_BG }}>
                        <div className="font-medium text-[11px] flex items-center gap-1">
                          <CalendarDays size={10} />
                          {new Date(intv.datetime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <div className="font-medium truncate">{cand?.name || 'Unknown'}</div>
                        <div className="text-stone-600 truncate text-[10px]">{client?.name} · {intv.type}</div>
                      </div>
                    );
                  } else {
                    const task = e.data;
                    return (
                      <div key={`t-${task.id}`} className="text-xs rounded p-1.5 border-l-2"
                           style={{ borderLeftColor: TASK_COLOR, backgroundColor: TASK_BG }}>
                        <div className="font-medium text-[11px] flex items-center gap-1" style={{ color: TASK_COLOR }}>
                          <CheckSquare size={10} />
                          {task.dueTime || 'All day'}
                        </div>
                        <div className="font-medium truncate">{task.title}</div>
                        {task.linkedType && task.linkedId && (
                          <div className="text-stone-600 truncate text-[10px]">
                            {(() => {
                              if (task.linkedType === 'candidate') {
                                const c = candidates.find(x => x.id === task.linkedId);
                                return c?.name || '';
                              }
                              if (task.linkedType === 'job') {
                                const j = jobs.find(x => x.id === task.linkedId);
                                return j?.title || '';
                              }
                              if (task.linkedType === 'client') {
                                const c = clients.find(x => x.id === task.linkedId);
                                return c?.name || '';
                              }
                              return '';
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ SUBMISSIONS ============
function SubmissionsView({ ctx }) {
  const { submissions, candidates, jobs, clients } = ctx;
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // "Submitted with clients" = stage is "Submitted" OR comes after Submitted
  // in the job's stage list, excluding terminal states.
  const isWithClient = (sub) => {
    const job = jobs.find(j => j.id === sub.jobId);
    if (!job?.stages) return false;
    const submittedIdx = job.stages.indexOf('Submitted');
    if (submittedIdx === -1) {
      // Job doesn't have a "Submitted" stage — fall back to allowlist
      return ['Submitted', 'Interview', 'Offer'].includes(sub.stage);
    }
    const currentIdx = job.stages.indexOf(sub.stage);
    if (currentIdx === -1) return false;
    // Must be at or past Submitted, and not at the very last (Placed/terminal) stage
    if (currentIdx < submittedIdx) return false;
    if (['Placed', 'Rejected', 'Withdrawn', 'Internal Reject'].includes(sub.stage)) return false;
    return true;
  };

  const enriched = useMemo(() => {
    return submissions
      .filter(isWithClient)
      .map(sub => {
        const cand = candidates.find(c => c.id === sub.candidateId);
        const job = jobs.find(j => j.id === sub.jobId);
        const client = job ? clients.find(c => c.id === job.clientId) : null;
        return { sub, cand, job, client };
      })
      .filter(({ cand, job }) => cand && job)
      .sort((a, b) => new Date(b.sub.createdAt || 0) - new Date(a.sub.createdAt || 0));
  }, [submissions, candidates, jobs, clients]);

  const filtered = enriched.filter(({ cand, job, client }) => {
    if (clientFilter && client?.id !== clientFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return cand.name?.toLowerCase().includes(q) ||
           job.title?.toLowerCase().includes(q) ||
           client?.name?.toLowerCase().includes(q);
  });

  // Get list of clients that have at least one submission in this view
  const clientsInView = useMemo(() => {
    const ids = new Set(enriched.map(e => e.client?.id).filter(Boolean));
    return clients.filter(c => ids.has(c.id));
  }, [enriched, clients]);

  return (
    <div>
      <PageHeader
        title="Submissions"
        subtitle={`${filtered.length} candidate${filtered.length === 1 ? '' : 's'} currently with client${filtered.length === 1 ? '' : 's'}`}
      />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by candidate, role, or client…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-md text-sm placeholder:text-stone-400 focus:border-stone-400"
          />
        </div>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-md text-sm min-w-[180px]"
        >
          <option value="">All clients</option>
          {clientsInView.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <ArrowRight size={32} className="mx-auto text-stone-300 mb-3" />
          <div className="font-display text-xl mb-1">
            {enriched.length === 0 ? 'No active submissions' : 'No matches'}
          </div>
          <div className="text-sm text-stone-500">
            {enriched.length === 0
              ? 'Candidates show up here once they reach the "Submitted" stage of any job.'
              : 'Try changing your search or filter.'}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-stone-500 border-b border-stone-200">
            <div className="col-span-4">Candidate Name</div>
            <div className="col-span-3">Role submitted for</div>
            <div className="col-span-3">Client</div>
            <div className="col-span-2 text-right">Added</div>
          </div>
          {filtered.map(({ sub, cand, job, client }) => (
            <div
              key={sub.id}
              className="grid grid-cols-12 px-5 py-3.5 text-sm border-b border-stone-100 hover:bg-stone-50 items-center"
            >
              <div className="col-span-4 min-w-0">
                <div className="font-medium truncate">{cand.name}</div>
                <div className="text-xs text-stone-500 truncate">
                  {cand.role || cand.email || cand.phone || '—'}
                </div>
              </div>
              <div className="col-span-3 min-w-0">
                <div className="text-stone-800 truncate">{job.title}</div>
                <div className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: '#C45E3A' }}>
                  {sub.stage}
                </div>
              </div>
              <div className="col-span-3 text-stone-700 truncate">{client?.name || '—'}</div>
              <div className="col-span-2 text-xs text-stone-500 text-right">
                <div>{fmtDate(sub.createdAt)}</div>
                <div className="text-stone-400">{fmtRelative(sub.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TASKS ============
function TasksView({ ctx }) {
  const { tasks, setTasks, candidates, jobs, clients, flash } = ctx;
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('open'); // 'open', 'all', 'completed', 'overdue', 'today'

  const enriched = useMemo(() => tasks.map(t => {
    let linkLabel = '', linkSubLabel = '';
    if (t.linkedType === 'candidate') {
      const c = candidates.find(x => x.id === t.linkedId);
      linkLabel = c?.name || '(deleted candidate)';
    } else if (t.linkedType === 'job') {
      const j = jobs.find(x => x.id === t.linkedId);
      if (j) {
        const cl = clients.find(c => c.id === j.clientId);
        linkLabel = j.title;
        linkSubLabel = cl?.name || '';
      } else linkLabel = '(deleted job)';
    } else if (t.linkedType === 'client') {
      const cl = clients.find(x => x.id === t.linkedId);
      linkLabel = cl?.name || '(deleted client)';
    }
    return { ...t, linkLabel, linkSubLabel };
  }), [tasks, candidates, jobs, clients]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const filtered = enriched.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'completed') return t.completed;
    if (t.completed) return false;
    if (filter === 'overdue') return t.dueDate && new Date(t.dueDate) < today;
    if (filter === 'today') {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }
    return true; // open
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const saveTask = (data) => {
    if (data.id) {
      setTasks(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
      flash('Task updated');
    } else {
      setTasks(prev => [{ ...data, id: uid(), createdAt: new Date().toISOString(), completed: false }, ...prev]);
      flash('Task added');
    }
    setEditing(null);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t));
  };

  const deleteTask = (id) => {
    if (!confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    flash('Task removed');
  };

  const filterChips = [
    { id: 'open', label: 'Open', count: enriched.filter(t => !t.completed).length },
    { id: 'today', label: 'Today', count: enriched.filter(t => !t.completed && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) === today.getTime()).length },
    { id: 'overdue', label: 'Overdue', count: enriched.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length },
    { id: 'completed', label: 'Completed', count: enriched.filter(t => t.completed).length },
    { id: 'all', label: 'All', count: enriched.length },
  ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Follow-ups, reminders, and to-dos"
        action={
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white"
            style={{ backgroundColor: '#C45E3A' }}
          >
            <Plus size={16} /> Add task
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {filterChips.map(c => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition ${
              filter === c.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400'
            }`}
          >
            {c.label}
            <span className={filter === c.id ? 'text-stone-300' : 'text-stone-400'}>{c.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <CheckSquare size={32} className="mx-auto text-stone-300 mb-3" />
          <div className="font-display text-xl mb-1">No tasks {filter !== 'all' ? `in "${filter}"` : 'yet'}</div>
          <div className="text-sm text-stone-500 mb-4">
            {tasks.length === 0 ? 'Add your first task to start tracking follow-ups.' : 'Switch filter or add a new task.'}
          </div>
          {tasks.length === 0 && (
            <button onClick={() => setEditing({})} className="text-sm text-white px-4 py-2 rounded-md" style={{ backgroundColor: '#C45E3A' }}>
              Add task
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          {filtered.map(t => {
            const isOverdue = t.dueDate && !t.completed && new Date(t.dueDate) < today;
            const isDueToday = t.dueDate && !t.completed && new Date(t.dueDate).setHours(0,0,0,0) === today.getTime();
            return (
              <div key={t.id} className="px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 flex items-center gap-3">
                <button onClick={() => toggleTask(t.id)} className="flex-shrink-0 text-stone-500 hover:text-stone-900">
                  {t.completed ? <CheckSquare size={18} style={{color: '#4A7C59'}} /> : <Square size={18} />}
                </button>
                <button onClick={() => setEditing(t)} className="flex-1 text-left min-w-0">
                  <div className={`text-sm ${t.completed ? 'line-through text-stone-400' : 'text-stone-900'} truncate`}>
                    {t.title}
                  </div>
                  <div className="text-xs text-stone-500 truncate flex items-center gap-2 mt-0.5">
                    {t.dueDate && (
                      <span className={isOverdue ? 'text-red-700 font-medium' : isDueToday ? 'font-medium' : ''}
                            style={isDueToday ? { color: '#C45E3A' } : {}}>
                        {isOverdue && '⚠ '}
                        {isDueToday ? 'Due today' : fmtDate(t.dueDate)}
                        {t.dueTime && ` · ${t.dueTime}`}
                      </span>
                    )}
                    {t.linkLabel && (
                      <span className="flex items-center gap-1">
                        <Link2 size={10} />
                        {t.linkLabel}{t.linkSubLabel && ` · ${t.linkSubLabel}`}
                      </span>
                    )}
                  </div>
                </button>
                <IconBtn onClick={() => setEditing(t)}><Edit2 size={12} /></IconBtn>
                <IconBtn onClick={() => deleteTask(t.id)}><Trash2 size={12} /></IconBtn>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <TaskModal task={editing} candidates={candidates} jobs={jobs} clients={clients} onSave={saveTask} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TaskModal({ task, candidates, jobs, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '', dueDate: '', dueTime: '', linkedType: '', linkedId: '',
    ...task
  });

  const linkOptions = useMemo(() => {
    if (form.linkedType === 'candidate') {
      return candidates.map(c => ({ id: c.id, label: c.name, sub: c.role }));
    }
    if (form.linkedType === 'job') {
      return jobs.map(j => {
        const c = clients.find(cl => cl.id === j.clientId);
        return { id: j.id, label: j.title, sub: c?.name || '' };
      });
    }
    if (form.linkedType === 'client') {
      return clients.map(c => ({ id: c.id, label: c.name, sub: '' }));
    }
    return [];
  }, [form.linkedType, candidates, jobs, clients]);

  return (
    <Modal title={task?.id ? 'Edit task' : 'New task'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Task" required>
          <input
            autoFocus
            className={inputCls}
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Chase CV from Marcus"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <input type="date" className={inputCls} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Due time (optional)">
            <input type="time" className={inputCls} value={form.dueTime} onChange={e => setForm({ ...form, dueTime: e.target.value })} disabled={!form.dueDate} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Link to (optional)">
            <select className={inputCls} value={form.linkedType} onChange={e => setForm({ ...form, linkedType: e.target.value, linkedId: '' })}>
              <option value="">— None —</option>
              <option value="candidate">Candidate</option>
              <option value="job">Job</option>
              <option value="client">Client</option>
            </select>
          </Field>
          {form.linkedType && (
            <Field label="Select">
              <select className={inputCls} value={form.linkedId} onChange={e => setForm({ ...form, linkedId: e.target.value })}>
                <option value="">Choose…</option>
                {linkOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.label}{o.sub ? ` — ${o.sub}` : ''}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <div className="text-[11px] text-stone-500">
          Tasks with a due date appear on the Calendar in sage/teal. Time is optional — without it, the task shows at the top of its day.
        </div>
      </div>
      <ModalFooter>
        <button onClick={onClose} className={btnGhostCls}>Cancel</button>
        <button
          onClick={() => { if (form.title.trim()) onSave(form); }}
          disabled={!form.title.trim()}
          className={btnPrimaryCls} style={{backgroundColor: "#C45E3A"}}
        >
          Save task
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ============ SETTINGS ============
function SettingsView({ ctx }) {
  const { team, setTeam, settings, setSettings, flash, candidates, clients, jobs, submissions, interviews, tasks } = ctx;
  const [newMember, setNewMember] = useState('');
  const [stageInput, setStageInput] = useState('');
  const defaults = settings.defaultStages || DEFAULT_STAGES;

  const exportData = () => {
    const data = { candidates, clients, jobs, submissions, interviews, team, settings, tasks, exportedAt: new Date().toISOString(), version: 2 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mastermined-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Backup downloaded');
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importing will REPLACE all current data. Continue?')) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        ctx.setCandidates(data.candidates || []);
        ctx.setClients(data.clients || []);
        ctx.setJobs(data.jobs || []);
        ctx.setSubmissions(data.submissions || []);
        ctx.setInterviews(data.interviews || []);
        if (data.team) ctx.setTeam(data.team);
        if (data.settings) ctx.setSettings(data.settings);
        if (data.tasks) ctx.setTasks(data.tasks);
        flash('Data imported');
      } catch (err) {
        flash('Import failed — invalid file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalRecords = candidates.length + clients.length + jobs.length + submissions.length + interviews.length + (tasks?.length || 0);

  const addMember = () => {
    const name = newMember.trim();
    if (!name) return;
    setTeam(prev => [...prev, { id: uid(), name, color: TEAM_COLORS[prev.length % TEAM_COLORS.length] }]);
    setNewMember('');
    flash('Team member added');
  };

  const removeMember = (id) => {
    if (team.length === 1) { flash('Keep at least one member', 'error'); return; }
    setTeam(prev => prev.filter(t => t.id !== id));
  };

  const addDefaultStage = () => {
    const s = stageInput.trim();
    if (!s || defaults.includes(s)) return;
    setSettings({ ...settings, defaultStages: [...defaults, s] });
    setStageInput('');
  };

  const removeDefaultStage = (s) => {
    setSettings({ ...settings, defaultStages: defaults.filter(x => x !== s) });
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Team and pipeline defaults" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h3 className="font-display text-xl mb-1">Team members</h3>
          <p className="text-xs text-stone-500 mb-4">Used as owner attribution on candidates and jobs.</p>
          <div className="space-y-2 mb-4">
            {team.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded bg-stone-50 border border-stone-200">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: t.color }}>
                  {t.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 text-sm">{t.name}</span>
                <IconBtn onClick={() => removeMember(t.id)}><Trash2 size={12} /></IconBtn>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputCls + ' flex-1'}
              value={newMember}
              onChange={e => setNewMember(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addMember(); }}
              placeholder="New member's name"
            />
            <button onClick={addMember} className="px-3 py-1.5 text-sm rounded-md text-white" style={{ backgroundColor: '#C45E3A' }}>Add</button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h3 className="font-display text-xl mb-1">Default pipeline stages</h3>
          <p className="text-xs text-stone-500 mb-4">Applied when creating a new job. Each job can override these.</p>
          <div className="space-y-1.5 mb-3">
            {defaults.map((s, i) => (
              <div key={s} className="flex items-center gap-2 p-2 rounded bg-stone-50 border border-stone-200">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_PALETTE[i % STAGE_PALETTE.length] }} />
                <span className="flex-1 text-sm">{s}</span>
                <IconBtn onClick={() => removeDefaultStage(s)}><X size={12} /></IconBtn>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputCls + ' flex-1'}
              value={stageInput}
              onChange={e => setStageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addDefaultStage(); }}
              placeholder="Add a default stage"
            />
            <button onClick={addDefaultStage} className="px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-50">Add</button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-stone-200 p-5">
        <h3 className="font-display text-xl mb-1">Backup & restore</h3>
        <p className="text-xs text-stone-500 mb-4">
          Your data lives in this browser. Export a backup file regularly — especially before clearing browser data, switching devices, or any major change. {totalRecords} records currently stored.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 text-sm rounded-md text-white" style={{ backgroundColor: '#C45E3A' }}>
            <Save size={14} /> Download backup
          </button>
          <label className="flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-stone-300 hover:bg-stone-50 cursor-pointer">
            <FileText size={14} /> Restore from backup
            <input type="file" accept=".json,application/json" onChange={importData} className="hidden" />
          </label>
        </div>
      </div>

      <div className="mt-6 text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded-lg p-4">
        <div className="font-medium text-stone-700 mb-1">About your data</div>
        Your data is stored in this browser's local storage on this device. It is not synced across devices or browsers. To avoid data loss, download a backup regularly using the buttons above. For multi-device or team access, you'll need to upgrade to a hosted version with a shared database.
      </div>
    </div>
  );
}

// ============ SHARED PIECES ============
function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight" style={{ color: '#1a1612' }}>{title}</h1>
        {subtitle && <div className="text-sm text-stone-500 mt-1">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function EmptyHint({ children }) {
  return <div className="text-sm text-stone-400 py-6 text-center">{children}</div>;
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <div className="text-sm text-stone-800 break-words">{value}</div>
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick?.(); }} title={title}
            className="p-1.5 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100">
      {children}
    </button>
  );
}

function Field({ label, required, full, children }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="text-xs font-medium text-stone-700 mb-1 block">
        {label}{required && <span className="text-stone-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`bg-white rounded-lg shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto scrollbar-thin`}
        style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
      >
        <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between sticky top-0 bg-white">
          <div>
            <div className="font-display text-2xl">{title}</div>
            {subtitle && <div className="text-sm text-stone-500 mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }) {
  return <div className="flex items-center gap-2 pt-5 mt-5 border-t border-stone-200">{children}</div>;
}

const inputCls = "w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-sm focus:border-stone-500";
const btnGhostCls = "px-4 py-2 text-sm rounded-md border border-stone-300 hover:bg-stone-50 text-stone-700";
const btnPrimaryCls = "px-4 py-2 text-sm rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed";



import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Database, FlaskConical, Network, CheckCircle, XCircle,
  Clock, BarChart2, Loader2, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const API = 'http://localhost:4005';
const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'dataset' | 'eval'>('pipeline');
  const [stats, setStats] = useState<any>(null);
  const [dataset, setDataset] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [evalRuns, setEvalRuns] = useState<any[]>([]);

  const fetchStats = async () => {
    const res = await axios.get(`${API}/api/stats`);
    setStats(res.data);
  };

  const fetchDataset = async () => {
    const res = await axios.get(`${API}/api/eval-dataset`);
    setDataset(res.data.dataset);
  };

  const fetchEvalRuns = async () => {
    const res = await axios.get(`${API}/api/eval/runs`);
    setEvalRuns(res.data.runs);
  };

  useEffect(() => {
    fetchStats();
    fetchDataset();
    fetchEvalRuns();
  }, []);

  const runAutoLabel = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/auto-label`, { strategy: 'signal-boosted', count: 5 });
      await fetchStats();
      await fetchDataset();
      alert('Auto-labeled 5 interactions!');
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  };

  const runClustering = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/cluster`, { k: 4 });
      setClusters(res.data.clusters);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
    setLoading(false);
  };

  const approveCase = async (id: string) => {
    await axios.post(`${API}/api/eval-dataset/${id}/approve`);
    await fetchDataset();
    await fetchStats();
  };

  const rejectCase = async (id: string) => {
    await axios.post(`${API}/api/eval-dataset/${id}/reject`);
    await fetchDataset();
    await fetchStats();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-500 to-violet-500 p-2 rounded-xl">
            <Database className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">EvalForge</h1>
            <p className="text-slate-400 text-sm">Production Log → Eval Dataset Generator</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['pipeline', 'dataset', 'eval'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Production Logs</p>
              <p className="text-3xl font-bold text-cyan-400">{stats.totalLogs}</p>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Test Cases</p>
              <p className="text-3xl font-bold text-violet-400">{stats.totalTestCases}</p>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Pending Review</p>
              <p className="text-3xl font-bold text-amber-400">{stats.byStatus?.['pending-review'] || 0}</p>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Eval Runs</p>
              <p className="text-3xl font-bold text-emerald-400">{stats.totalEvalRuns}</p>
            </div>
          </div>
        )}

        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" /> Pipeline Actions
              </h2>
              <div className="flex gap-4">
                <button onClick={runAutoLabel} disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FlaskConical className="w-5 h-5" />}
                  Auto-Label 5 Logs
                </button>
                <button onClick={runClustering} disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                  <Network className="w-5 h-5" /> Cluster Prompts
                </button>
              </div>
            </div>

            {/* Distribution Charts */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">By Category</h3>
                  <div className="h-56">
                    {Object.keys(stats.byCategory || {}).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(stats.byCategory).map(([name, count]) => ({ name, count }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-slate-500 text-center py-12">Run auto-labeling first</p>}
                  </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">By Status</h3>
                  <div className="h-56">
                    {stats.totalTestCases > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(stats.byStatus).filter(([, v]) => (v as number) > 0).map(([name, value]) => ({ name, value }))}
                            cx="50%" cy="50%" outerRadius={80} label
                            dataKey="value"
                          >
                            {Object.entries(stats.byStatus).filter(([, v]) => (v as number) > 0).map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-slate-500 text-center py-12">No test cases yet</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Clusters */}
            {clusters.length > 0 && (
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" /> Prompt Clusters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clusters.map((c: any, i: number) => (
                    <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                      <h4 className="font-semibold text-sm mb-2" style={{ color: COLORS[i % COLORS.length] }}>
                        Cluster {i + 1} ({c.members.length} members)
                      </h4>
                      <ul className="space-y-1">
                        {c.members.slice(0, 5).map((m: any, j: number) => (
                          <li key={j} className="text-xs text-slate-400 truncate">
                            <span className="text-slate-500 font-mono">[{m.feature}]</span> {m.prompt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DATASET TAB */}
        {activeTab === 'dataset' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold">Eval Dataset ({dataset.length} test cases)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Prompt</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Quality</th>
                    <th className="px-4 py-3">Difficulty</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {dataset.map(tc => (
                    <tr key={tc.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3 max-w-xs truncate">{tc.prompt}</td>
                      <td className="px-4 py-3 font-mono text-xs">{tc.category}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${tc.qualityScore >= 4 ? 'text-emerald-400' : tc.qualityScore >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                          {tc.qualityScore}/5
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{tc.difficulty}</td>
                      <td className="px-4 py-3">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${tc.confidence * 100}%` }}></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tc.status === 'auto-approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          tc.status === 'human-approved' ? 'bg-blue-500/20 text-blue-400' :
                          tc.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tc.status === 'pending-review' && (
                          <div className="flex gap-2">
                            <button onClick={() => approveCase(tc.id)} className="text-emerald-400 hover:text-emerald-300">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => rejectCase(tc.id)} className="text-red-400 hover:text-red-300">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {dataset.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">No test cases yet. Run auto-labeling first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EVAL TAB */}
        {activeTab === 'eval' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-400" /> Eval Runs
                </h2>
              </div>
              {evalRuns.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Run</th>
                      <th className="px-4 py-3">Model</th>
                      <th className="px-4 py-3">Pass Rate</th>
                      <th className="px-4 py-3">Avg Quality</th>
                      <th className="px-4 py-3">Test Cases</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {evalRuns.map((run, i) => (
                      <tr key={run.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-mono text-xs">Run #{i + 1}</td>
                        <td className="px-4 py-3">{run.model}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${run.passRate >= 0.8 ? 'text-emerald-400' : run.passRate >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                            {(run.passRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">{run.avgQuality.toFixed(2)}/5</td>
                        <td className="px-4 py-3">{run.results.length}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(run.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-500">No eval runs yet. Generate test cases first, then run an eval.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

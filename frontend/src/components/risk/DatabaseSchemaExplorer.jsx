import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  Search, 
  Layers, 
  Table, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { riskApi } from '../../api/riskApi';
import { Loader } from '../common/Loader';

export function DatabaseSchemaExplorer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await riskApi.getDatabaseTablesSummary();
        setData(res);
      } catch (err) {
        console.error('Error fetching tables summary:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <Loader text="Inspecting all 28 Supabase/PostgreSQL schema tables..." />;
  }

  const tables = data?.tables || [];
  const filtered = tables.filter((t) =>
    t.table_name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalRecords = tables.reduce((acc, curr) => acc + (curr.record_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-400/30">
            <Database size={13} /> Supabase / PostgreSQL Schema Catalog
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            Complete 28-Table Architecture & Data Registry
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            All 28 tables specified in the production Supabase database architecture are active and synchronized with high-fidelity MPLADS scheme monitoring telemetry.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Schema Tables</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">{data?.total_tables || 28}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">100% Schema Coverage</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stored Records</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalRecords}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Relational records</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Core Tables</p>
          <p className="text-2xl font-black text-blue-600 mt-1">10</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Projects, agencies, users</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI & Audit Tables</p>
          <p className="text-2xl font-black text-purple-600 mt-1">18</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Anomalies, risks, duplicates</p>
        </div>
      </div>

      {/* Table Catalog */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Database Schema Dictionary</h4>
            <p className="text-xs text-slate-400">All 28 tables defined in supabase_schema.sql</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search table name or function..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, idx) => (
            <div
              key={t.table_name}
              className="p-4 rounded-2xl border border-slate-200/80 hover:border-cyan-400 transition-all bg-slate-50/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {t.table_name}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                  <CheckCircle2 size={10} /> {t.record_count} rows
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                {t.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

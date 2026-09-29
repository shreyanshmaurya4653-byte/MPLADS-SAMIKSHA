import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Trash2, 
  Download,
  Building,
  Layers,
  FileText,
  Filter
} from 'lucide-react';
import { worksApi } from '../../api/worksApi';
import { Button } from './Button';
import { parseUploadFile, parseTextContent } from '../../utils/fileParser';

export function DataUploadModal({ isOpen, onClose, user, onUploadSuccess, hierarchy }) {
  if (!isOpen) return null;

  // Complete restriction: MP cannot upload
  if (user?.role === 'MP') {
    return null;
  }

  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'manual'
  const [inputText, setInputText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedResult, setParsedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Manual Quick Form Row
  const [formRows, setFormRows] = useState([
    {
      title: '',
      category: 'Community Infrastructure',
      implementing_agency: 'Public Works Department (PWD)',
      sanctioned_amount: '',
      estimated_cost: '',
      constituency_id: hierarchy?.constituencies?.[0]?.constituency_id || 1,
      district_id: hierarchy?.districts?.[0]?.district_id || 1,
      state_id: hierarchy?.states?.[0]?.state_id || 1
    }
  ]);

  const defaultJurisdiction = {
    state_id: user?.state_id || hierarchy?.states?.[0]?.state_id || 1,
    district_id: user?.district_id || hierarchy?.districts?.[0]?.district_id || 1,
    constituency_id: user?.constituency_id || hierarchy?.constituencies?.[0]?.constituency_id || 1
  };

  const sampleTemplate = `Title\tCategory\tImplementing Agency\tSanctioned Amount\tEstimated Cost\tStart Date\tCompletion Date
Community Hall Solar Rooftop\tCommunity Infrastructure\tPublic Works Department (PWD)\t1500000\t1500000\t2024-06-01\t2024-12-01
Rural Drinking Water Tank\tWater & Sanitation\tJal Jeevan Mission Unit\t1200000\t1200000\t2024-05-15\t2024-11-15
High School Science Lab\tEducation\tRural Engineering Dept\t1800000\t1800000\t2024-04-10\t2024-10-10`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleTemplate], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mplads_project_template.tsv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSelectedFileName(file.name);
      setSelectedFile(file);

      // Lightweight client-side preview for small files, backend handles full scale
      const res = await parseUploadFile(file, defaultJurisdiction);
      setParsedResult(res);

      if (res.validCount === 0) {
        setError('No valid project entries detected. Backend engine will attempt deep NumPy/Pandas parsing upon submission.');
      }
    } catch (err) {
      console.warn('Client-side preview warning:', err);
      // Even if client preview fails (e.g. huge file), backend Python handles it directly
      setParsedResult({
        validCount: 1,
        wasteCount: 0,
        validWorks: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setInputText(text);
    setSelectedFile(null);
    if (!text.trim()) {
      setParsedResult(null);
      return;
    }
    const res = parseTextContent(text, defaultJurisdiction);
    setParsedResult(res);
  };

  const handleConfirmBatchUpload = async () => {
    try {
      setLoading(true);
      setError(null);

      let res;
      if (selectedFile) {
        // High-Speed NumPy & Pandas Streaming File Ingest
        res = await worksApi.uploadFileStream(selectedFile, defaultJurisdiction);
      } else {
        const works = parsedResult?.validWorks || [];
        if (works.length === 0) {
          setError('No valid work items found to upload.');
          setLoading(false);
          return;
        }
        res = await worksApi.uploadWorksBatch(works);
      }

      const count = res.valid_works_ingested || res.created_count || parsedResult?.validCount || 0;
      const speed = res.rows_per_second ? ` (${res.rows_per_second.toLocaleString()} rows/sec via NumPy & Pandas Engine)` : '';
      const duration = res.duration_seconds ? ` in ${res.duration_seconds}s` : '';
      setSuccessMsg(res.message || `Successfully ingested and analyzed ${count.toLocaleString()} works${duration}${speed}!`);
      
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload project data.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualFormUpload = async () => {
    try {
      setLoading(true);
      setError(null);
      const validRows = formRows.filter((r) => r.title.trim() && r.sanctioned_amount);
      if (validRows.length === 0) {
        setError('Please enter at least one project with a valid title and sanctioned amount.');
        return;
      }

      const items = validRows.map((r) => ({
        ...r,
        sanctioned_amount: parseFloat(r.sanctioned_amount) || 1000000.0,
        estimated_cost: parseFloat(r.estimated_cost) || parseFloat(r.sanctioned_amount) || 1000000.0
      }));

      const res = await worksApi.uploadWorksBatch(items);
      setSuccessMsg(res.message || `Successfully ingested and analyzed ${items.length} works!`);
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Form upload failed:', err);
      setError(err.message || 'Failed to submit projects.');
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setFormRows([
      ...formRows,
      {
        title: '',
        category: 'Community Infrastructure',
        implementing_agency: 'Public Works Department (PWD)',
        sanctioned_amount: '',
        estimated_cost: '',
        constituency_id: hierarchy?.constituencies?.[0]?.constituency_id || 1,
        district_id: hierarchy?.districts?.[0]?.district_id || 1,
        state_id: hierarchy?.states?.[0]?.state_id || 1
      }
    ]);
  };

  const removeRow = (idx) => {
    if (formRows.length > 1) {
      setFormRows(formRows.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Ingest Scheme Project Data</h3>
              <p className="text-xs text-slate-400">
                Multi-Format Ingestion (Excel, CSV, TSV, JSON) • Authorized for {user?.role} Tier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => { setActiveTab('file'); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet size={14} /> Multi-Format Upload / Paste (Excel, CSV, TSV, JSON)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('manual'); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus size={14} /> Quick Multi-Row Manual Entry
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-500" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* TAB 1: FILE UPLOAD & PASTE */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">Select File or Paste Tabular Data</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
              >
                <Download size={13} /> Download Sample Template
              </button>
            </div>

            {/* Dropzone for Excel, CSV, TSV, JSON */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt,.json"
                id="multi-format-file-input"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="multi-format-file-input" className="cursor-pointer space-y-1 block">
                <UploadCloud size={28} className="mx-auto text-blue-500" />
                <p className="text-xs font-bold text-slate-800">
                  {selectedFileName ? `Selected: ${selectedFileName}` : 'Click to browse Excel (.xlsx, .xls), CSV, TSV, or JSON'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Supports all standard spreadsheets, tab-separated tables, and government scheme data files
                </p>
              </label>
            </div>

            {/* Paste Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Or Paste Text Directly (from Excel, Sheets, or CSV):
              </label>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={sampleTemplate}
                className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Parse Inspection Badge */}
            {parsedResult && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      ✓ {parsedResult.validCount} Valid Projects Ready
                    </span>
                    {parsedResult.discardedCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                        ⚠️ {parsedResult.discardedCount} blank/waste rows discarded
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Total lines scanned: {parsedResult.totalRead}
                  </span>
                </div>

                {/* Preview table of first 3 items */}
                {parsedResult.validCount > 0 && (
                  <div className="mt-2 text-[11px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 grid grid-cols-12 gap-2">
                      <span className="col-span-6 truncate">Project Title</span>
                      <span className="col-span-3 truncate">Category</span>
                      <span className="col-span-3 text-right truncate">Sanctioned (₹)</span>
                    </div>
                    {parsedResult.validWorks.slice(0, 3).map((w, idx) => (
                      <div key={idx} className="px-3 py-1.5 border-t border-slate-100 grid grid-cols-12 gap-2 text-slate-700">
                        <span className="col-span-6 font-medium truncate">{w.title}</span>
                        <span className="col-span-3 text-slate-500 truncate">{w.category}</span>
                        <span className="col-span-3 text-right font-mono text-emerald-700">₹{w.sanctioned_amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {parsedResult.validCount > 3 && (
                      <div className="px-3 py-1 bg-slate-50 text-[10px] text-slate-400 italic text-center">
                        + {parsedResult.validCount - 3} more works will be ingested and analyzed
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmBatchUpload}
              loading={loading}
              disabled={!parsedResult || parsedResult.validCount === 0}
              className="w-full justify-center"
            >
              Confirm & Ingest {parsedResult?.validCount ? `${parsedResult.validCount} Projects` : 'Data Batch'}
            </Button>
          </div>
        )}

        {/* TAB 2: MANUAL FORM ENTRY */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {formRows.map((row, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project #{idx + 1}</span>
                    {formRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Work Title / Asset Description *"
                    value={row.title}
                    onChange={(e) => {
                      const updated = [...formRows];
                      updated[idx].title = e.target.value;
                      setFormRows(updated);
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const updated = [...formRows];
                        updated[idx].category = e.target.value;
                        setFormRows(updated);
                      }}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                    >
                      <option value="Community Infrastructure">Community Infrastructure</option>
                      <option value="Roads & Connectivity">Roads & Connectivity</option>
                      <option value="Water & Sanitation">Water & Sanitation</option>
                      <option value="Education">Education</option>
                      <option value="Health">Health</option>
                      <option value="Irrigation">Irrigation</option>
                      <option value="Urban Infrastructure">Urban Infrastructure</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Sanctioned (₹) *"
                      value={row.sanctioned_amount}
                      onChange={(e) => {
                        const updated = [...formRows];
                        updated[idx].sanctioned_amount = e.target.value;
                        setFormRows(updated);
                      }}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Another Project Row
            </button>

            <Button
              variant="primary"
              size="md"
              onClick={handleManualFormUpload}
              loading={loading}
              className="w-full justify-center"
            >
              Submit & Analyze Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

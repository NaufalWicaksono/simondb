import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, FileSpreadsheet, Database, Table as TableIcon,
  RefreshCw, CheckCircle2, AlertTriangle, Info, CheckSquare, Square, Columns3,
  Eye, Maximize2, X as XIcon, Loader2, LayoutList, Filter, Plus, Tag, Search,
} from 'lucide-react';
import { fetchExport, fetchMetadataTables, fetchMetadataColumns, fetchExportPreview, fetchColumnValues } from '../services/api.js';
import { TABLE_FRIENDLY_LABELS } from './Dashboard.jsx';

const HIDDEN_SYSTEM_TABLES = new Set([
  'users', 'roles', 'refresh_tokens', 'otp_codes',
  'invitation_tokens', 'user_table_access', 'export_history', 'revit_import_history'
]);

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const DEBOUNCE_MS = 300;

function FilterChip({ filter, onRemove }) {
  const operatorLabel = {
    equals: '=', not_equals: '≠', contains: '~',
    greater_than: '>', less_than: '<',
  };
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold max-w-[240px]">
      <Tag size={10} className="shrink-0 text-emerald-500" />
      <span className="truncate">
        {filter.column} {operatorLabel[filter.operator] || filter.operator} "{filter.value}"
      </span>
      <button
        onClick={() => onRemove(filter.id)}
        className="shrink-0 p-0.5 rounded-full text-emerald-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <XIcon size={11} />
      </button>
    </span>
  );
}

const ALL_OPERATORS = [
  { v: 'equals',       l: '= Sama dengan',  categories: ['string', 'numeric', 'date'] },
  { v: 'not_equals',   l: '≠ Tidak sama',   categories: ['string', 'numeric', 'date'] },
  { v: 'contains',     l: '~ Mengandung',   categories: ['string'] },
  { v: 'greater_than', l: '> Lebih dari',   categories: ['numeric', 'date'] },
  { v: 'less_than',    l: '< Kurang dari',  categories: ['numeric', 'date'] },
];

function getOperatorsForCategory(category) {
  if (!category) return ALL_OPERATORS;
  return ALL_OPERATORS.filter(op => op.categories.includes(category));
}

function CascadingFilterRow({ columnList, dataSource, activeFilters = [], onAdd, onCancel }) {
  const [selectedCol,    setSelectedCol]    = useState('');
  const [searchText,     setSearchText]     = useState('');
  const [valueOptions,   setValueOptions]   = useState([]);
  const [selectedValue,  setSelectedValue]  = useState('');
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [operator,       setOperator]       = useState('equals');

  const colMeta = columnList.find(c => c.name === selectedCol);
  const colCategory = colMeta?.category || null;
  const availableOperators = getOperatorsForCategory(colCategory);

  useEffect(() => {
    if (!colCategory) return;
    const stillValid = availableOperators.some(op => op.v === operator);
    if (!stillValid) setOperator('equals');
  }, [selectedCol]);

  const debouncedSearch = useDebounce(searchText, DEBOUNCE_MS);

  useEffect(() => {
    if (!selectedCol || !dataSource) return;
    let cancelled = false;
    setIsLoadingValues(true);
    setSelectedValue('');
    fetchColumnValues(dataSource, selectedCol, debouncedSearch, 50, activeFilters)
      .then((res) => { if (!cancelled) setValueOptions(res.values || []); })
      .catch(() => { if (!cancelled) setValueOptions([]); })
      .finally(() => { if (!cancelled) setIsLoadingValues(false); });
    return () => { cancelled = true; };
  }, [selectedCol, debouncedSearch, dataSource, activeFilters]);

  const canAdd = selectedCol && selectedValue;

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tambah Filter Ekspor</p>
        <button onClick={onCancel} className="text-gray-300 hover:text-gray-500 transition-colors">
          <XIcon size={15} />
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">① Pilih Kolom</label>
        <select
          className="w-full text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          value={selectedCol}
          onChange={(e) => { setSelectedCol(e.target.value); setSearchText(''); setSelectedValue(''); }}
        >
          <option value="">-- Pilih kolom --</option>
          {columnList.map(c => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.category})
            </option>
          ))}
        </select>
      </div>

      {selectedCol && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-[11px] font-semibold text-gray-500">② Operator</label>
            {colCategory && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                colCategory === 'numeric' ? 'bg-blue-50 text-blue-600'
                : colCategory === 'date'  ? 'bg-purple-50 text-purple-600'
                : 'bg-gray-100 text-gray-500'
              }`}>
                {colCategory}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableOperators.map(op => (
              <button
                key={op.v}
                type="button"
                onClick={() => setOperator(op.v)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all
                  ${operator === op.v
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-bold'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {op.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCol && (
        <div className="animate-fade-in">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">③ Nilai Filter</label>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Cari nilai di ${selectedCol}...`}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 outline-none transition-all"
            />
          </div>

          {isLoadingValues ? (
            <div className="flex items-center gap-2 py-3 text-gray-400">
              <Loader2 size={13} className="animate-spin" />
              <span className="text-xs">Memuat nilai...</span>
            </div>
          ) : valueOptions.length === 0 ? (
            <p className="text-[11px] text-gray-400 py-2 italic">
              Tidak ada nilai ditemukan{searchText ? ` untuk "${searchText}"` : ''}
            </p>
          ) : (
            <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {valueOptions.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedValue(v)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all
                    ${selectedValue === v
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold'
                      : 'bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => canAdd && onAdd({ column: selectedCol, operator, value: selectedValue })}
        disabled={!canAdd}
        className="w-full py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 shadow-sm"
      >
        Terapkan Filter
      </button>
    </div>
  );
}

export default function ExportData() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [showAddFilter, setShowAddFilter] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [formatType, setFormatType] = useState('xlsx');
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    fetchMetadataTables()
      .then((res) => {
        const rawTables = res.tables || [];
        const tList = rawTables.filter(t => !HIDDEN_SYSTEM_TABLES.has(t.toLowerCase()));
        setTables(tList);
        if (tList.length > 0 && (!selectedTable || !tList.includes(selectedTable))) {
          setSelectedTable(tList[0]);
        }
      })
      .catch((err) => setStatusMsg({ type: 'error', text: err.message }))
      .finally(() => setIsLoadingTables(false));
  }, []);

  useEffect(() => {
    if (!selectedTable) return;
    setIsLoadingColumns(true);
    fetchMetadataColumns(selectedTable)
      .then((res) => {
        const cols = res.columns_with_meta || res.columns?.map(c => ({ name: c, category: 'string' })) || [];
        setColumns(cols);
        setSelectedColumns(cols.map(c => c.name));
      })
      .catch((err) => setStatusMsg({ type: 'error', text: err.message }))
      .finally(() => setIsLoadingColumns(false));
  }, [selectedTable]);

  useEffect(() => {
    if (!selectedTable) return;
    setIsLoadingPreview(true);
    fetchExportPreview(selectedTable, 10, activeFilters)
      .then((res) => setPreviewData(res))
      .catch((err) => setStatusMsg({ type: 'error', text: err.message }))
      .finally(() => setIsLoadingPreview(false));
  }, [selectedTable, activeFilters]);

  const handleToggleColumn = (colName) => {
    if (selectedColumns.includes(colName)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== colName));
    } else {
      setSelectedColumns([...selectedColumns, colName]);
    }
  };

  const handleSelectAllCols = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(columns.map((c) => c.name));
    }
  };

  const handleExportDownload = async () => {
    if (!selectedTable) return;
    setIsExporting(true);
    try {
      const blob = await fetchExport(
        selectedTable,
        { format: formatType },
        selectedColumns,
        activeFilters
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${selectedTable}_${Date.now()}.${formatType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg({ type: 'success', text: `Tabel ${selectedTable} berhasil diekspor!` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Ekspor gagal.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
          statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Export Data Warehouse</h1>
        <p className="text-sm text-slate-500 mt-1">
          Unduh dataset tabel dalam format Excel (.xlsx) atau CSV dengan filter dan pemilihan kolom
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings */}
        <div className="space-y-5">
          {/* Step 1: Select Table */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Database size={16} className="text-emerald-600" />
              <span>1. Pilih Tabel Sumber</span>
            </div>
            <select
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setActiveFilters([]);
              }}
              disabled={isLoadingTables}
              className="select-field"
            >
              {tables.map((t) => (
                <option key={t} value={t}>
                  {TABLE_FRIENDLY_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Column Selection */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Columns3 size={16} className="text-emerald-600" />
                <span>2. Pilih Kolom ({selectedColumns.length}/{columns.length})</span>
              </div>
              <button
                onClick={handleSelectAllCols}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                {selectedColumns.length === columns.length ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {columns.map((col) => {
                const isChecked = selectedColumns.includes(col.name);
                return (
                  <div
                    key={col.name}
                    onClick={() => handleToggleColumn(col.name)}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs transition-colors"
                  >
                    <span className="font-medium text-slate-700">{col.name}</span>
                    <span className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && '✓'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Export Format & Button */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Download size={16} className="text-emerald-600" />
              <span>3. Format & Unduh</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormatType('xlsx')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  formatType === 'xlsx' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormatType('csv')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  formatType === 'csv' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                CSV (.csv)
              </button>
            </div>

            <button
              onClick={handleExportDownload}
              disabled={isExporting || selectedColumns.length === 0}
              className="w-full btn-primary justify-center py-2.5 shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Mengekspor...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download Dataset</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Filter & Live Preview */}
        <div className="lg:col-span-2 space-y-5">
          {/* Filter Bar */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Filter size={16} className="text-emerald-600" />
                <span>Filter Baris ({activeFilters.length})</span>
              </div>
              <button
                onClick={() => setShowAddFilter(!showAddFilter)}
                className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100"
              >
                <Plus size={13} />
                <span>Tambah Filter</span>
              </button>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((f) => (
                  <FilterChip
                    key={f.id}
                    filter={f}
                    onRemove={(id) => setActiveFilters(activeFilters.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            )}

            {showAddFilter && (
              <CascadingFilterRow
                columnList={columns}
                dataSource={selectedTable}
                activeFilters={activeFilters}
                onAdd={(newF) => {
                  setActiveFilters([...activeFilters, { ...newF, id: Date.now() }]);
                  setShowAddFilter(false);
                }}
                onCancel={() => setShowAddFilter(false)}
              />
            )}
          </div>

          {/* Table Preview */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Eye size={15} className="text-emerald-600" />
                <span>Preview Data (10 Baris Pertama)</span>
              </div>
              {previewData && (
                <span className="text-xs text-slate-500 font-medium">
                  Total {previewData.row_count?.toLocaleString('id-ID')} baris
                </span>
              )}
            </div>

            <div className="overflow-x-auto max-h-96">
              {isLoadingPreview ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={22} className="animate-spin text-emerald-600" />
                  <span className="text-xs">Memuat preview tabel...</span>
                </div>
              ) : !previewData || previewData.rows?.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Tidak ada data yang cocok
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      {selectedColumns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx}>
                        {selectedColumns.map((col) => (
                          <td key={col} className="truncate max-w-xs">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

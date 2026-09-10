import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Filter, Image as ImageIcon, BarChart2,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  Table as TableIcon, Loader2, Play, Palette,
  Plus, X as XIcon, Info, Sparkles, ChevronRight,
  ChevronDown, Database, Search, Tag, Eye, TriangleAlert, Download
} from 'lucide-react';
import {
  fetchMetadataTables,
  fetchMetadataColumns,
  fetchColumnValues,
  postPreview,
  postDynamicChart
} from '../services/api.js';

export const TABLE_FRIENDLY_LABELS = {
  school: 'school — Data Fasilitas Hub & Sekolah',
  revitalisasi: 'revitalisasi — Program Revitalisasi & Distribusi',
  progress_monitoring: 'progress_monitoring — Monitoring Progres Lapangan',
  shipment_deliveries: 'shipment_deliveries — Pengiriman Armada Ekspedisi',
  warehouse_inventory: 'warehouse_inventory — Inventaris Gudang & Logistik',
  fleet_vehicles: 'fleet_vehicles — Armada Kendaraan & Telematika',
  regional_financial_metrics: 'regional_financial_metrics — Metrik Keuangan Wilayah',
};

const HIDDEN_SYSTEM_TABLES = new Set([
  'users', 'roles', 'refresh_tokens', 'otp_codes',
  'invitation_tokens', 'user_table_access', 'export_history', 'revit_import_history'
]);

const CHART_TYPES = [
  { id: 'Bar Chart',  icon: BarChart2,      label: 'Bar Chart' },
  { id: 'Line Chart', icon: LineChartIcon,  label: 'Line Chart' },
  { id: 'Pie Chart',  icon: PieChartIcon,   label: 'Pie Chart' },
  { id: 'Tabel Data', icon: TableIcon,      label: 'Tabel Data' },
];

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16',
];

const DEBOUNCE_MS = 300;

const isNumericCol = (col) => col?.category === 'numeric';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

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
  { v: 'not_equals',   l: '≠ Tidak sama',    categories: ['string', 'numeric', 'date'] },
  { v: 'contains',     l: '~ Mengandung',   categories: ['string'] },
  { v: 'greater_than', l: '> Lebih dari',   categories: ['numeric', 'date'] },
  { v: 'less_than',    l: '< Kurang dari',  categories: ['numeric', 'date'] },
];

function getOperatorsForCategory(category) {
  if (!category) return ALL_OPERATORS;
  return ALL_OPERATORS.filter(op => op.categories.includes(category));
}

function CascadingFilterRow({ columnList, dataSource, activeFilters = [], onAdd, onCancel }) {
  const [selectedCol, setSelectedCol] = useState('');
  const [searchText,  setSearchText]  = useState('');
  const [valueOptions, setValueOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState('');
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [operator, setOperator] = useState('equals');

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
      .then((res) => {
        if (!cancelled) setValueOptions(res.values || []);
      })
      .catch(() => {
        if (!cancelled) setValueOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingValues(false);
      });
    return () => { cancelled = true; };
  }, [selectedCol, debouncedSearch, dataSource, activeFilters]);

  const canAdd = selectedCol && selectedValue;

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tambah Filter Baru</p>
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
        className="w-full py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        Terapkan Filter
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [tableList,  setTableList]  = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [columnList, setColumnList] = useState([]);
  const [toastMsg,   setToastMsg]   = useState(null);

  const [dataSource, setDataSource] = useState('');

  const [activeFilters, setActiveFilters] = useState([]);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showSampleRows, setShowSampleRows] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const debouncedPreviewSearch = useDebounce(previewSearch, 400);

  const [xAxis,        setXAxis]        = useState('');
  const [yAxis,        setYAxis]        = useState('');
  const [agregasi,     setAgregasi]     = useState('COUNT');
  const [sortOrder,    setSortOrder]    = useState('Tertinggi ke Terendah');
  const [chartVariant, setChartVariant] = useState('Vertikal');

  const [isVisLoading,  setIsVisLoading]  = useState(false);
  const [hasData,       setHasData]       = useState(false);
  const [chartData,     setChartData]     = useState([]);
  const [summaryData,   setSummaryData]   = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [appliedConfig, setAppliedConfig] = useState(null);
  const [itemColors,    setItemColors]    = useState({});

  const chartRef = useRef(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    setIsLoadingTables(true);
    fetchMetadataTables()
      .then(d => {
        const rawTables = d.tables || [];
        const tables = rawTables.filter(t => !HIDDEN_SYSTEM_TABLES.has(t.toLowerCase()));
        setTableList(tables);
        if (tables.length > 0 && (!dataSource || !tables.includes(dataSource))) {
          setDataSource(tables[0]);
        }
      })
      .catch(() => setToastMsg({ type: 'error', text: 'Gagal memuat daftar tabel database.' }))
      .finally(() => setIsLoadingTables(false));
  }, []);

  useEffect(() => {
    if (!dataSource) { setColumnList([]); return; }
    fetchMetadataColumns(dataSource)
      .then(d => {
        setColumnList(d.columns_with_meta || d.columns?.map(c => ({ name: c, category: 'string' })) || []);
        const cols = d.columns_with_meta || [];
        if (cols.length > 0) {
          setXAxis(cols[0].name);
          const firstNum = cols.find(c => c.category === 'numeric');
          setYAxis(firstNum ? firstNum.name : cols[0].name);
          setAgregasi(firstNum ? 'SUM' : 'COUNT');
        }
        setActiveFilters([]);
        setPreviewResult(null);
        setHasData(false);
        setSummaryData(null);
        setSelectedChart(null);
      })
      .catch(() => setToastMsg({ type: 'error', text: 'Gagal memuat kolom tabel.' }));
  }, [dataSource]);

  useEffect(() => {
    if ((agregasi === 'SUM' || agregasi === 'AVG') && yAxis) {
      const col = columnList.find(c => c.name === yAxis);
      if (col && !isNumericCol(col)) {
        const firstNum = columnList.find(c => c.category === 'numeric');
        setYAxis(firstNum ? firstNum.name : '');
      }
    }
  }, [agregasi]);

  const fetchPreview = useCallback(async (filters, searchTerm) => {
    if (!dataSource) return;
    setIsPreviewLoading(true);
    try {
      const result = await postPreview(
        dataSource,
        filters.map(({ column, operator, value }) => ({ column, operator, value })),
        searchTerm
      );
      setPreviewResult(result);
    } catch (err) {
      setToastMsg({ type: 'error', text: `Preview gagal: ${err.message}` });
      setPreviewResult(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [dataSource]);

  useEffect(() => {
    if (!dataSource) return;
    fetchPreview(activeFilters, debouncedPreviewSearch);
  }, [activeFilters, debouncedPreviewSearch, fetchPreview]);

  const handleAddFilter = ({ column, operator, value }) => {
    const newFilter = { id: Date.now(), column, operator, value };
    setActiveFilters([...activeFilters, newFilter]);
    setShowAddFilter(false);
  };

  const handleRemoveFilter = (id) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  const handleVisualize = async () => {
    if (!dataSource || !xAxis || !yAxis) {
      setToastMsg({ type: 'error', text: 'Harap lengkapi dataset, Sumbu X, dan Sumbu Y.' });
      return;
    }
    setIsVisLoading(true);
    setSelectedChart('Bar Chart');
    setSummaryData(null);
    try {
      const urutanAPI = sortOrder === 'Tertinggi ke Terendah' ? 'DESC' : 'ASC';
      const payload = {
        sumber_data: dataSource,
        x_axis: xAxis,
        y_axis: yAxis,
        agregasi,
        urutan: urutanAPI,
        filters: activeFilters.map(({ column, operator, value }) => ({ column, operator, value })),
      };
      const res = await postDynamicChart(payload);
      const data = res.datasets?.[0]?.data || [];
      const labels = res.labels || [];
      const formatted = labels.map((label, i) => ({ name: label, value: data[i] || 0 }));
      const total = formatted.reduce((s, d) => s + (Number(d.value) || 0), 0);

      setChartData(formatted);
      setAppliedConfig({ dataSource, xAxis, yAxis, agregasi, sortOrder, chartVariant });
      setSummaryData({
        tableName: dataSource, totalNilai: agregasi === 'COUNT' ? formatted.length : total,
        labelX: xAxis, labelY: yAxis, agregasi, rowCount: formatted.length,
      });
      setHasData(true);
      setItemColors({});
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message || 'Gagal memproses data visualisasi.' });
    } finally {
      setIsVisLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!chartData.length) return;
    const keys = Object.keys(chartData[0]);
    const rows = chartData.map(row =>
      keys.map(k => {
        const v = row[k];
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')
    );
    const blob = new Blob([[keys.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chart_${appliedConfig?.dataSource || 'data'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `chart_${appliedConfig?.dataSource || 'data'}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const renderChart = () => {
    if (!appliedConfig || !selectedChart) return null;
    const fmt = (v) => v?.toLocaleString('id-ID');
    const isH = chartVariant === 'Horizontal';
    const isDoughnut = chartVariant === 'Donut';
    const tooltipStyle = { borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' };

    if (selectedChart === 'Tabel Data') {
      return (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs uppercase bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-6 py-3 font-semibold">{appliedConfig.xAxis}</th>
                <th className="px-6 py-3 font-semibold text-right">{appliedConfig.yAxis} ({appliedConfig.agregasi})</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{row.value?.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="w-full h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          {selectedChart === 'Bar Chart' ? (
            <BarChart data={chartData} layout={isH ? 'vertical' : 'horizontal'} margin={{ top: 20, right: 30, left: isH ? 80 : 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={!isH} horizontal={isH} stroke="#f3f4f6" />
              {isH ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                </>
              )}
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" radius={isH ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((e, i) => <Cell key={i} fill={itemColors[e.name] || COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : selectedChart === 'Line Chart' ? (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={isDoughnut ? "45%" : 0} outerRadius="60%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} dataKey="value">
                {chartData.map((e, i) => <Cell key={i} fill={itemColors[e.name] || COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 w-full max-w-full overflow-hidden">
      {toastMsg && (
        <div className="fixed top-20 right-8 z-[100] flex items-center gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-2xl max-w-sm border border-slate-800 animate-fade-in">
          <div className={`p-1.5 rounded-lg ${toastMsg.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <span className="font-bold text-lg">{toastMsg.type === 'error' ? '!' : '✓'}</span>
          </div>
          <p className="text-sm flex-1 leading-relaxed">{toastMsg.text}</p>
          <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-white text-lg">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dynamic Analytics & Query Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Eksplorasi dan visualisasi data dinamis</p>
        </div>
      </div>

      {/* STEP 1: Pilih Dataset */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
          <div>
            <h2 className="font-bold text-gray-900">Pilih Dataset</h2>
            <p className="text-[11px] text-gray-500">Pilih tabel database operasional untuk dianalisis</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tabel Database</label>
            <select
              className="w-full text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={dataSource}
              onChange={e => setDataSource(e.target.value)}
              disabled={isLoadingTables || tableList.length === 0}
            >
              <option value="">{isLoadingTables ? 'Memuat tabel...' : (tableList.length === 0 ? 'Tidak ada tabel' : '-- Pilih tabel --')}</option>
              {tableList.map(t => (
                <option key={t} value={t}>
                  {TABLE_FRIENDLY_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>

          {dataSource && columnList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 sm:mt-0 sm:pt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-700">
                <Database size={12} />
                {columnList.length} kolom
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-xs font-semibold text-emerald-700">
                <Info size={12} />
                {columnList.filter(c => c.category === 'numeric').length} numerik
              </span>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Filter Bertingkat */}
      {dataSource && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900">Filter Data <span className="text-gray-400 font-normal text-sm">(opsional)</span></h2>
              <p className="text-[11px] text-gray-500">Saring data dengan menambahkan kondisi filter WHERE multi-level</p>
            </div>
            <button
              onClick={() => setShowAddFilter(v => !v)}
              disabled={columnList.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all disabled:opacity-40"
            >
              <Plus size={13} />
              {activeFilters.length === 0 ? 'Tambah Filter' : 'Filter Lain'}
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeFilters.map(f => (
                <FilterChip key={f.id} filter={f} onRemove={handleRemoveFilter} />
              ))}
            </div>
          )}

          {showAddFilter && (
            <CascadingFilterRow
              columnList={columnList}
              dataSource={dataSource}
              activeFilters={activeFilters}
              onAdd={handleAddFilter}
              onCancel={() => setShowAddFilter(false)}
            />
          )}

          <div className={`mt-4 rounded-xl border transition-all overflow-hidden flex flex-col w-full ${
            isPreviewLoading ? 'bg-gray-50 border-gray-100'
            : previewResult ? 'bg-emerald-50 border-emerald-100'
            : 'bg-gray-50 border-gray-100'
          }`}>
            {isPreviewLoading ? (
              <div className="flex items-center gap-2 p-4 text-gray-500">
                <Loader2 size={15} className="animate-spin" />
                <span className="text-sm font-medium">Menghitung baris yang cocok...</span>
              </div>
            ) : previewResult ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <Eye size={15} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-800">
                      Ditemukan <span className="text-emerald-700 tabular-nums">{previewResult.row_count?.toLocaleString('id-ID')}</span> baris
                      {previewSearch && <span className="text-emerald-600 font-normal"> untuk "{previewSearch}"</span>}
                    </span>
                  </div>

                  <div className="relative flex-1 min-w-0">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari di semua kolom teks..."
                      value={previewSearch}
                      onChange={e => setPreviewSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-emerald-200 bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 outline-none transition-all"
                    />
                    {previewSearch && (
                      <button onClick={() => setPreviewSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <XIcon size={12} />
                      </button>
                    )}
                  </div>

                  {previewResult.sample_rows?.length > 0 && (
                    <button
                      onClick={() => setShowSampleRows(v => !v)}
                      className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold hover:text-emerald-800 transition-colors shrink-0"
                    >
                      <ChevronDown size={12} className={`transition-transform ${showSampleRows ? 'rotate-180' : ''}`} />
                      {showSampleRows ? 'Sembunyikan' : 'Lihat preview data'}
                    </button>
                  )}
                </div>

                {showSampleRows && previewResult.sample_rows?.length > 0 && (
                  <div className="border-t border-emerald-200 animate-fade-in w-full overflow-x-auto max-h-[360px]">
                    <table className="text-[11px] text-left text-gray-600 border-collapse table-auto w-full">
                      <thead className="bg-emerald-100/70 text-emerald-900 sticky top-0">
                        <tr>
                          {previewResult.columns.map((col) => (
                            <th key={col} className="font-semibold whitespace-nowrap px-3 py-2 border-b border-emerald-200">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.sample_rows.map((row, ri) => (
                          <tr key={ri} className="border-t border-emerald-50 hover:bg-emerald-50/60 transition-colors">
                            {previewResult.columns.map((col) => (
                              <td key={col} className="px-3 py-2 truncate max-w-[200px]">
                                {row[col] ?? <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-4 text-sm text-gray-400 italic">Pilih tabel untuk melihat data</p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Konfigurasi Chart */}
      {dataSource && columnList.length > 0 && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
            <div>
              <h2 className="font-bold text-gray-900">Konfigurasi Visualisasi</h2>
              <p className="text-[11px] text-gray-500">Pilih dimensi kategori dan metrik numerik</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sumbu X (Kategori)</label>
              <select
                className="w-full text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={xAxis}
                onChange={e => setXAxis(e.target.value)}
              >
                {columnList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fungsi Agregasi</label>
              <select
                className="w-full text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={agregasi}
                onChange={e => setAgregasi(e.target.value)}
              >
                <option value="COUNT">Jumlah Baris (COUNT)</option>
                <option value="SUM">Total Nilai (SUM)</option>
                <option value="AVG">Rata-rata (AVG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sumbu Y (Metrik)</label>
              <select
                className="w-full text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={yAxis}
                onChange={e => setYAxis(e.target.value)}
              >
                {columnList
                  .filter(c => (agregasi === 'SUM' || agregasi === 'AVG') ? isNumericCol(c) : true)
                  .map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Urutan</label>
              <select
                className="w-full text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              >
                <option value="Tertinggi ke Terendah">Tertinggi ke Terendah</option>
                <option value="Terendah ke Tertinggi">Terendah ke Tertinggi</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleVisualize}
            disabled={isVisLoading || !dataSource || !xAxis || !yAxis}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
          >
            {isVisLoading ? (
              <><Loader2 size={17} className="animate-spin" /><span>Memproses Query...</span></>
            ) : (
              <><Play size={17} className="fill-current" /><span>Tampilkan Visualisasi Chart</span></>
            )}
          </button>
        </div>
      )}

      {/* STEP 4: Hasil Visualisasi */}
      {(hasData || isVisLoading) && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
              <div>
                <h2 className="font-bold text-gray-900">Hasil Visualisasi</h2>
                {hasData && appliedConfig && (
                  <p className="text-[11px] text-gray-500">
                    {appliedConfig.agregasi}({appliedConfig.yAxis}) per {appliedConfig.xAxis}
                  </p>
                )}
              </div>
            </div>

            {hasData && selectedChart && (
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <Download size={13} />CSV
                </button>
                {selectedChart !== 'Tabel Data' && (
                  <button onClick={handleDownloadImage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                    <ImageIcon size={13} />PNG
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-6 space-y-5">
            {isVisLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={28} className="text-emerald-500 animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Mengambil data...</p>
              </div>
            ) : hasData && (
              <>
                {summaryData && (
                  <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-2.5 bg-white border border-emerald-100 rounded-xl shrink-0 shadow-sm">
                      <Sparkles size={20} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Ringkasan Analitik</p>
                      <p className="text-base font-bold text-gray-900 leading-snug">
                        Berdasarkan tabel{' '}
                        <span className="text-emerald-700">{summaryData.tableName}</span>, terakumulasi total{' '}
                        <span className="text-2xl font-black text-emerald-700 tabular-nums">{summaryData.totalNilai.toLocaleString('id-ID')}</span>{' '}
                        pada metrik{' '}
                        <span className="text-emerald-700">{summaryData.labelY}</span>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CHART_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedChart(type.id)}
                      className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border text-xs font-semibold transition-all
                        ${selectedChart === type.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-white'}`}
                    >
                      <type.icon size={22} className={selectedChart === type.id ? 'text-emerald-600' : 'text-gray-400'} strokeWidth={1.8} />
                      {type.label}
                    </button>
                  ))}
                </div>

                {selectedChart && (
                  <div className="border border-gray-100 rounded-2xl p-5 bg-white" ref={chartRef}>
                    {renderChart()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

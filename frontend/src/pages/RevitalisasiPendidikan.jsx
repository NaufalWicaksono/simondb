import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchRevitFilters,
  fetchRevitKPI,
  fetchRevitChart,
  fetchRevitTable,
} from '../services/revitalisasi';

import {
  Search, Building2, Wallet, MapPin, 
  ChevronLeft, ChevronRight, X, Sparkles, Download
} from 'lucide-react';
import MultiSelectFilter from '../components/MultiSelectFilter';
import SchoolMap from '../components/SchoolMap';

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend
);

export default function RevitalisasiPendidikan() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const [loadingKPI, setLoadingKPI] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  
  const [kpi, setKpi] = useState(null);
  const [chartJenjang, setChartJenjang] = useState({ labels: [], datasets: [] });
  const [chartProvinsi, setChartProvinsi] = useState({ labels: [], datasets: [] });
  const [chartKategori, setChartKategori] = useState({ labels: [], datasets: [] });

  const [tableData, setTableData] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableSearch, setTableSearch] = useState('');

  const [filterOptions, setFilterOptions] = useState({ tahun: [], provinsi: [], kabupaten: [], jenjang: [] });
  const [activeFilters, setActiveFilters] = useState({});
  
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchRevitFilters().then(res => {
      setFilterOptions(res);
      if (res.tahun?.length > 0) {
        setActiveFilters({ tahun: [Math.max(...res.tahun)] });
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setLoadingKPI(true);
    setLoadingCharts(true);
    
    fetchRevitKPI(activeFilters)
      .then(res => {
        setKpi(res);
        setLoadingKPI(false);
      })
      .catch(() => setLoadingKPI(false));

    fetchRevitChart('jenjang', activeFilters)
      .then(res => setChartJenjang(res))
      .catch(console.error);

    fetchRevitChart('provinsi', activeFilters)
      .then(res => setChartProvinsi(res))
      .catch(console.error);

    fetchRevitChart('kategori', activeFilters)
      .then(res => setChartKategori(res))
      .catch(console.error)
      .finally(() => setLoadingCharts(false));

  }, [activeFilters]);

  useEffect(() => {
    setLoadingTable(true);
    fetchRevitTable(tableSearch, page * limit, limit, activeFilters)
      .then(res => {
        setTableData(res.data || []);
        setTableTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoadingTable(false));
  }, [page, tableSearch, activeFilters]);

  const handleFilterChange = (key, values) => {
    setPage(0);
    setActiveFilters(prev => {
      const next = { ...prev };
      if (values.length > 0) {
        next[key] = values;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Monitoring Jaringan Hub & Fasilitas Distribusi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sebaran logistik nasional, alokasi capex modernisasi, dan pos perbatasan 3T di 38 provinsi
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Filter Operasional Wilayah
          </p>
          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={() => setActiveFilters({})}
              className="text-xs text-rose-600 font-semibold hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <MultiSelectFilter
            label="Tahun Periode"
            options={filterOptions.tahun || []}
            selectedValues={activeFilters.tahun || []}
            onChange={(vals) => handleFilterChange('tahun', vals)}
            allLabel="Semua Tahun"
          />
          <MultiSelectFilter
            label="Provinsi"
            options={filterOptions.provinsi || []}
            selectedValues={activeFilters.provinsi || []}
            onChange={(vals) => handleFilterChange('provinsi', vals)}
            allLabel="Semua 38 Provinsi"
          />
          <MultiSelectFilter
            label="Kabupaten / Kota"
            options={filterOptions.kabupaten || []}
            selectedValues={activeFilters.kabupaten || []}
            onChange={(vals) => handleFilterChange('kabupaten', vals)}
            allLabel="Semua Kota/Kabupaten"
          />
          <MultiSelectFilter
            label="Jenis Fasilitas Hub"
            options={filterOptions.jenjang || []}
            selectedValues={activeFilters.jenjang || []}
            onChange={(vals) => handleFilterChange('jenjang', vals)}
            allLabel="Semua Jenis Hub"
          />
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Building2 size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Fasilitas Hub</p>
              <h3 className="text-base sm:text-lg xl:text-xl font-bold text-slate-900 mt-0.5 tracking-tight whitespace-nowrap">
                {loadingKPI ? '...' : (kpi?.total_sekolah || 0).toLocaleString('id-ID')}
              </h3>
            </div>
          </div>
        </div>

        <div className="stat-card p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Wallet size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Capex / Anggaran</p>
              <h3 
                className="text-xs sm:text-sm md:text-base lg:text-[14px] xl:text-[15.5px] 2xl:text-lg font-bold text-slate-900 mt-0.5 tracking-tight whitespace-nowrap" 
                title={formatRupiah(kpi?.total_bantuan)}
              >
                {loadingKPI ? '...' : formatRupiah(kpi?.total_bantuan)}
              </h3>
            </div>
          </div>
        </div>

        <div className="stat-card p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <MapPin size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Hub Wilayah 3T & Perbatasan</p>
              <h3 className="text-base sm:text-lg xl:text-xl font-bold text-slate-900 mt-0.5 tracking-tight whitespace-nowrap">
                {loadingKPI ? '...' : (kpi?.total_sekolah_3t || 0).toLocaleString('id-ID')}
              </h3>
            </div>
          </div>
        </div>

        <div className="stat-card p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Sparkles size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Alokasi Capex 3T</p>
              <h3 
                className="text-xs sm:text-sm md:text-base lg:text-[14px] xl:text-[15.5px] 2xl:text-lg font-bold text-slate-900 mt-0.5 tracking-tight whitespace-nowrap" 
                title={formatRupiah(kpi?.total_bantuan_3t)}
              >
                {loadingKPI ? '...' : formatRupiah(kpi?.total_bantuan_3t)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* LEAFLET GEOSPATIAL MAP */}
      <SchoolMap activeFilters={activeFilters} />

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Distribusi per Jenis Fasilitas Hub
          </h3>
          <div className="h-64 flex items-center justify-center">
            {loadingCharts ? (
              <p className="text-xs text-slate-400">Memuat chart...</p>
            ) : chartJenjang.labels?.length > 0 ? (
              <Bar
                data={chartJenjang}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            ) : (
              <p className="text-xs text-slate-400">Tidak ada data</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Top 10 Provinsi Berdasarkan Nilai Alokasi
          </h3>
          <div className="h-64 flex items-center justify-center">
            {loadingCharts ? (
              <p className="text-xs text-slate-400">Memuat chart...</p>
            ) : chartProvinsi.labels?.length > 0 ? (
              <Bar
                data={chartProvinsi}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            ) : (
              <p className="text-xs text-slate-400">Tidak ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE EXPLORER */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Daftar Fasilitas & Proyek Modernisasi</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total {tableTotal.toLocaleString('id-ID')} fasilitas terdaftar
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kode hub, kota..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode Hub</th>
                <th>Nama Fasilitas</th>
                <th>Jenis Hub</th>
                <th>Provinsi</th>
                <th>Kota / Kabupaten</th>
                <th>Program Modernisasi</th>
                <th>Nilai Capex</th>
                <th>Wilayah 3T</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-xs text-slate-400">
                    Memuat data tabel...
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-xs text-slate-400">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                tableData.map((row, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs font-semibold text-emerald-700">{row.npsn}</td>
                    <td className="font-medium text-slate-900">{row.nama_sekolah}</td>
                    <td><span className="badge badge-blue">{row.jenjang}</span></td>
                    <td>{row.provinsi}</td>
                    <td>{row.kabupaten}</td>
                    <td className="text-xs max-w-xs truncate" title={row.kategori}>{row.kategori}</td>
                    <td className="font-semibold text-slate-900 tabular-nums">{formatRupiah(row.nilai_bantuan)}</td>
                    <td>
                      {row.is_3t || (row.keterangan_wilayah && row.keterangan_wilayah !== 'Reguler') ? (
                        <span className="badge badge-purple">3T Frontier</span>
                      ) : (
                        <span className="badge badge-green">Reguler</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan {tableTotal > 0 ? page * limit + 1 : 0} - {Math.min((page + 1) * limit, tableTotal)} dari {tableTotal} baris
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-semibold text-slate-700">Halaman {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= tableTotal}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

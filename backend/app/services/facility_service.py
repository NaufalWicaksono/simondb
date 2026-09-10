import io
import math
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from app.models.facility import School, Revitalisasi, ProgressMonitoring, RevitImportHistory
from app.models.user import User
from app.schemas.facility import KPIResponse, ChartData, FilterOptions, ImportHistoryResponse


class FacilityService:
    def __init__(self, db: Session):
        self.db = db

    def get_filter_options(self) -> FilterOptions:
        tahuns = [r[0] for r in self.db.query(Revitalisasi.tahun).distinct().all() if r[0] is not None]
        provinsis = [r[0] for r in self.db.query(School.provinsi).distinct().all() if r[0] is not None]
        kabupatens = [r[0] for r in self.db.query(School.kabupaten).distinct().all() if r[0] is not None]
        jenjangs = [r[0] for r in self.db.query(School.jenjang).distinct().all() if r[0] is not None]
        npsns = [r[0] for r in self.db.query(School.npsn).distinct().all() if r[0] is not None]
        nama_sekolahs = [r[0] for r in self.db.query(School.nama_sekolah).distinct().all() if r[0] is not None]
        keterangan_wilayahs = [r[0] for r in self.db.query(School.keterangan_wilayah).distinct().all() if r[0] is not None]

        return FilterOptions(
            tahun=sorted(tahuns),
            provinsi=sorted(provinsis),
            kabupaten=sorted(kabupatens),
            jenjang=sorted(jenjangs),
            npsn=sorted(npsns),
            nama_sekolah=sorted(nama_sekolahs),
            keterangan_wilayah=sorted(keterangan_wilayahs),
        )

    def _apply_filters(self, query, filters: Dict[str, Any]):
        if filters.get("tahun"):
            query = query.filter(Revitalisasi.tahun.in_(filters["tahun"]))
        if filters.get("provinsi"):
            query = query.filter(School.provinsi.in_(filters["provinsi"]))
        if filters.get("kabupaten"):
            query = query.filter(School.kabupaten.in_(filters["kabupaten"]))
        if filters.get("jenjang"):
            query = query.filter(School.jenjang.in_(filters["jenjang"]))
        if filters.get("npsn"):
            query = query.filter(School.npsn.in_(filters["npsn"]))
        if filters.get("nama_sekolah"):
            query = query.filter(School.nama_sekolah.in_(filters["nama_sekolah"]))
        if filters.get("keterangan_wilayah"):
            query = query.filter(School.keterangan_wilayah.in_(filters["keterangan_wilayah"]))
        return query

    def get_kpi(self, filters: Dict[str, Any]) -> KPIResponse:
        base_query = self.db.query(School, Revitalisasi).join(Revitalisasi, School.id == Revitalisasi.school_id)
        base_query = self._apply_filters(base_query, filters)

        results = base_query.all()

        total_sekolah = len({s.id for s, r in results})
        total_bantuan = sum([float(r.nilai_bantuan or 0) for s, r in results if r.nilai_bantuan])

        total_sekolah_3t = len({s.id for s, r in results if s.is_3t or (s.keterangan_wilayah and s.keterangan_wilayah != 'Reguler')})
        total_bantuan_3t = sum([float(r.nilai_bantuan or 0) for s, r in results if r.nilai_bantuan and (s.is_3t or (s.keterangan_wilayah and s.keterangan_wilayah != 'Reguler'))])

        return KPIResponse(
            total_sekolah=total_sekolah,
            total_bantuan=total_bantuan,
            total_sekolah_3t=total_sekolah_3t,
            total_bantuan_3t=total_bantuan_3t,
        )

    def get_chart_jenjang(self, filters: Dict[str, Any]) -> ChartData:
        query = self.db.query(
            School.jenjang,
            func.count(func.distinct(School.id)).label("jumlah_sekolah"),
        ).join(Revitalisasi, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        query = query.group_by(School.jenjang)

        results = query.all()

        labels = []
        data = []
        for row in results:
            labels.append(row.jenjang or "Fasilitas Standar")
            data.append(row.jumlah_sekolah)

        return ChartData(
            labels=labels,
            datasets=[{"label": "Jumlah Fasilitas / Hub", "data": data, "backgroundColor": "#3B82F6"}],
        )

    def get_rekap_jenjang(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        query = self.db.query(
            School.jenjang,
            func.count(func.distinct(School.id)).label("jumlah_sekolah"),
            func.sum(Revitalisasi.nilai_bantuan).label("total_bantuan"),
        ).join(Revitalisasi, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        query = query.group_by(School.jenjang).order_by(desc("jumlah_sekolah"))

        results = query.all()

        return [
            {
                "jenjang": r.jenjang or "Fasilitas Standar",
                "jumlah_sekolah": r.jumlah_sekolah,
                "total_bantuan": float(r.total_bantuan) if r.total_bantuan else 0,
            }
            for r in results
        ]

    def get_rekap_menu(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        query = self.db.query(
            School.jenjang,
            Revitalisasi.kategori,
            func.count(func.distinct(School.id)).label("jumlah_sekolah"),
        ).join(Revitalisasi, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        query = query.group_by(School.jenjang, Revitalisasi.kategori)

        results = query.all()

        data_map = {}
        for r in results:
            if not r.kategori or str(r.kategori).strip().lower() == "lainnya":
                continue
            jenjang = r.jenjang or "Fasilitas Umum"
            kategori = r.kategori
            if jenjang not in data_map:
                data_map[jenjang] = {}
            data_map[jenjang][kategori] = r.jumlah_sekolah

        final_list = []
        for jenjang, cats in data_map.items():
            row = {"jenjang": jenjang, "total": 0}
            for k, v in cats.items():
                row[k] = v
                row["total"] += v
            final_list.append(row)

        final_list.sort(key=lambda x: x["total"], reverse=True)
        return final_list

    def get_rincian_menu(self, filters: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        query = self.db.query(
            School.id,
            School.jenjang,
            Revitalisasi.kategori,
            Revitalisasi.menu_dan_volume,
        ).join(Revitalisasi, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        results = query.all()

        data_map = {"Rehabilitasi": {}, "Pembangunan": {}}
        for r in results:
            if not r.menu_dan_volume:
                continue
            jenjang = r.jenjang or "Fasilitas Umum"
            menu_text = str(r.menu_dan_volume).lower()
            
            for cat_key in ["Rehabilitasi", "Pembangunan"]:
                if jenjang not in data_map[cat_key]:
                    data_map[cat_key][jenjang] = {
                        "ruang_kelas": 0,
                        "ruang_praktik": 0,
                        "ruang_uks": 0,
                        "toilet": 0,
                        "ruang_guru": 0,
                        "ruang_perpustakaan": 0,
                    }
                
                d = data_map[cat_key][jenjang]
                if "sortir" in menu_text or "kelas" in menu_text or "conveyor" in menu_text:
                    d["ruang_kelas"] += 1
                if "cold" in menu_text or "praktik" in menu_text or "freezer" in menu_text:
                    d["ruang_praktik"] += 1
                if "ev" in menu_text or "fleet" in menu_text or "uks" in menu_text:
                    d["ruang_uks"] += 1
                if "racking" in menu_text or "gudang" in menu_text or "toilet" in menu_text:
                    d["toilet"] += 1
                if "iot" in menu_text or "solar" in menu_text or "guru" in menu_text:
                    d["ruang_guru"] += 1
                if "telematics" in menu_text or "perpustakaan" in menu_text:
                    d["ruang_perpustakaan"] += 1

        output = {"Rehabilitasi": [], "Pembangunan": []}
        for cat_key in ["Rehabilitasi", "Pembangunan"]:
            for jenjang, counts in data_map[cat_key].items():
                output[cat_key].append({"jenjang": jenjang, **counts})
            output[cat_key].sort(key=lambda x: x["jenjang"])

        return output

    def get_sebaran_penerima(self, filters: Dict[str, Any], is_usb: bool = False) -> Dict[str, Any]:
        query = self.db.query(
            School.provinsi,
            School.kabupaten,
            School.jenjang,
            School.id,
            func.sum(Revitalisasi.nilai_bantuan).label("total_bantuan"),
        ).join(Revitalisasi, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        query = query.group_by(School.provinsi, School.kabupaten, School.jenjang, School.id)

        results = query.all()

        data = {}
        jenjang_set = set()
        for r in results:
            prov = r.provinsi or "Nasional"
            kab = r.kabupaten or "Pusat"
            jenjang = r.jenjang or "Fasilitas Umum"

            jenjang_set.add(jenjang)

            if prov not in data:
                data[prov] = {}
            if kab not in data[prov]:
                data[prov][kab] = {}
            if jenjang not in data[prov][kab]:
                data[prov][kab][jenjang] = {"jumlah": 0, "total": 0}

            data[prov][kab][jenjang]["jumlah"] += 1
            data[prov][kab][jenjang]["total"] += float(r.total_bantuan or 0)

        jenjang_list = sorted(list(jenjang_set))

        output = []
        for prov in sorted(data.keys()):
            kab_list = []
            for kab in sorted(data[prov].keys()):
                kab_list.append({"kabupaten": kab, "jenjang_data": data[prov][kab]})
            output.append({"provinsi": prov, "kabupaten_list": kab_list})

        return {"columns": jenjang_list, "data": output}

    def get_chart_provinsi(self, filters: Dict[str, Any]) -> ChartData:
        query = self.db.query(
            School.provinsi,
            func.sum(Revitalisasi.nilai_bantuan).label("total_bantuan"),
        ).join(Revitalisasi, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        query = query.group_by(School.provinsi).order_by(desc("total_bantuan")).limit(10)

        results = query.all()

        labels = []
        data = []
        for row in results:
            labels.append(row.provinsi)
            data.append(float(row.total_bantuan) if row.total_bantuan else 0)

        return ChartData(
            labels=labels,
            datasets=[{"label": "Total Alokasi Investasi (Rp)", "data": data, "backgroundColor": "#10B981"}],
        )

    def get_chart_kategori(self, filters: Dict[str, Any]) -> ChartData:
        query = self.db.query(
            Revitalisasi.kategori,
            func.count(func.distinct(School.id)).label("jumlah"),
        ).join(School, School.id == Revitalisasi.school_id)

        query = self._apply_filters(query, filters)
        query = query.group_by(Revitalisasi.kategori)

        results = query.all()

        labels = []
        data = []
        for row in results:
            if not row.kategori or str(row.kategori).strip().lower() == "lainnya":
                continue
            labels.append(row.kategori)
            data.append(row.jumlah)

        return ChartData(
            labels=labels,
            datasets=[{"label": "Jumlah Fasilitas", "data": data}],
        )

    def get_table_data(self, filters: Dict[str, Any], search: str = "", skip: int = 0, limit: int = 50):
        query = self.db.query(School, Revitalisasi).join(Revitalisasi, School.id == Revitalisasi.school_id)
        query = self._apply_filters(query, filters)

        if search:
            query = query.filter(
                or_(
                    School.nama_sekolah.ilike(f"%{search}%"),
                    School.npsn.ilike(f"%{search}%"),
                    School.kabupaten.ilike(f"%{search}%"),
                    School.provinsi.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        results = query.order_by(School.nama_sekolah).offset(skip).limit(limit).all()

        data = []
        for s, r in results:
            data.append({
                "npsn": s.npsn,
                "nama_sekolah": s.nama_sekolah,
                "jenjang": s.jenjang,
                "provinsi": s.provinsi,
                "kabupaten": s.kabupaten,
                "kategori": r.kategori,
                "menu": r.menu_dan_volume,
                "nilai_bantuan": float(r.nilai_bantuan) if r.nilai_bantuan else 0,
                "is_3t": s.is_3t,
                "keterangan_wilayah": s.keterangan_wilayah,
                "tahun": r.tahun,
            })

        return {"total": total, "data": data}

    def get_map_data(self, filters: Dict[str, Any]):
        query = self.db.query(School, Revitalisasi).join(Revitalisasi, School.id == Revitalisasi.school_id)
        query = query.filter(School.latitude.isnot(None), School.longitude.isnot(None))
        query = self._apply_filters(query, filters)

        results = query.all()

        data = []
        for s, r in results:
            data.append({
                "id": s.id,
                "npsn": s.npsn,
                "nama_sekolah": s.nama_sekolah,
                "jenjang": s.jenjang,
                "provinsi": s.provinsi,
                "kabupaten": s.kabupaten,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "is_3t": s.is_3t,
                "keterangan_wilayah": s.keterangan_wilayah,
                "nilai_bantuan": float(r.nilai_bantuan) if r.nilai_bantuan else 0,
                "kategori": r.kategori,
            })

        return data

    def get_import_history(self) -> List[ImportHistoryResponse]:
        rows = self.db.query(RevitImportHistory).order_by(RevitImportHistory.uploaded_at.desc()).all()
        result = []
        for r in rows:
            uploader_name = r.uploader.name if r.uploader else "System"
            result.append(
                ImportHistoryResponse(
                    id=r.id,
                    tahun_data=r.tahun_data,
                    nama_file=r.nama_file,
                    uploaded_by=r.uploaded_by,
                    uploader_name=uploader_name,
                    uploaded_at=r.uploaded_at,
                    jumlah_data=r.jumlah_data,
                    status=r.status,
                    keterangan_error=r.keterangan_error,
                )
            )
        return result

    def delete_import_history(self, history_id: int):
        record = self.db.query(RevitImportHistory).filter(RevitImportHistory.id == history_id).first()
        if record:
            self.db.delete(record)
            self.db.commit()


RevitalisasiService = FacilityService

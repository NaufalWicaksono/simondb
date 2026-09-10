from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.services.facility_service import FacilityService
from app.schemas.facility import KPIResponse, ChartData, FilterOptions, ImportHistoryResponse

router = APIRouter(prefix="/api/revitalisasi", tags=["Operations & Facilities"])


def _parse_filters(
    tahun: List[int] = Query(default=[]),
    provinsi: List[str] = Query(default=[]),
    kabupaten: List[str] = Query(default=[]),
    jenjang: List[str] = Query(default=[]),
    npsn: List[str] = Query(default=[]),
    nama_sekolah: List[str] = Query(default=[]),
    keterangan_wilayah: List[str] = Query(default=[]),
) -> Dict[str, Any]:
    filters = {}
    if tahun:
        filters["tahun"] = tahun
    if provinsi:
        filters["provinsi"] = provinsi
    if kabupaten:
        filters["kabupaten"] = kabupaten
    if jenjang:
        filters["jenjang"] = jenjang
    if npsn:
        filters["npsn"] = npsn
    if nama_sekolah:
        filters["nama_sekolah"] = nama_sekolah
    if keterangan_wilayah:
        filters["keterangan_wilayah"] = keterangan_wilayah
    return filters


@router.get("/filters", response_model=FilterOptions)
def get_filters(db: Session = Depends(get_db)):
    service = FacilityService(db)
    return service.get_filter_options()


@router.get("/kpi", response_model=KPIResponse)
def get_kpi(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_kpi(filters)


@router.get("/rekap/jenjang")
def get_rekap_jenjang(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_rekap_jenjang(filters)


@router.get("/rekap/menu")
def get_rekap_menu(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_rekap_menu(filters)


@router.get("/rincian-menu")
def get_rincian_menu(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_rincian_menu(filters)


@router.get("/sebaran-penerima")
def get_sebaran_penerima(
    is_usb: bool = Query(False),
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_sebaran_penerima(filters, is_usb=is_usb)


@router.get("/charts/jenjang", response_model=ChartData)
def get_chart_jenjang(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_chart_jenjang(filters)


@router.get("/charts/provinsi", response_model=ChartData)
def get_chart_provinsi(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_chart_provinsi(filters)


@router.get("/charts/kategori", response_model=ChartData)
def get_chart_kategori(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_chart_kategori(filters)


@router.get("/table")
def get_table_data(
    search: str = Query(""),
    skip: int = Query(0),
    limit: int = Query(50),
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_table_data(filters, search, skip, limit)


@router.get("/map-data")
def get_map_data(
    filters: dict = Depends(_parse_filters),
    db: Session = Depends(get_db),
):
    service = FacilityService(db)
    return service.get_map_data(filters)


@router.get("/history", response_model=List[ImportHistoryResponse])
def get_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    service = FacilityService(db)
    return service.get_import_history()


@router.delete("/history/{history_id}")
def delete_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya Super Admin yang dapat menghapus history.")
    service = FacilityService(db)
    service.delete_import_history(history_id)
    return {"message": "Success"}

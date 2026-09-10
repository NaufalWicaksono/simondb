from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class FilterOptions(BaseModel):
    tahun: List[int] = []
    provinsi: List[str] = []
    kabupaten: List[str] = []
    jenjang: List[str] = [] # Facility Type
    npsn: List[str] = [] # Hub Code
    nama_sekolah: List[str] = [] # Facility Name
    keterangan_wilayah: List[str] = []


class KPIResponse(BaseModel):
    total_sekolah: int = 0 # Total Facilities / Hubs
    total_bantuan: float = 0.0 # Total Budget / Capex
    total_sekolah_3t: int = 0 # Frontier / Strategic 3T Hubs
    total_bantuan_3t: float = 0.0 # Frontier Capex Allocation


class ChartData(BaseModel):
    labels: List[str] = []
    datasets: List[Dict[str, Any]] = []


class ImportHistoryResponse(BaseModel):
    id: int
    tahun_data: int
    nama_file: str
    uploaded_by: Optional[int] = None
    uploader_name: Optional[str] = None
    uploaded_at: datetime
    jumlah_data: int
    status: str
    keterangan_error: Optional[str] = None

    class Config:
        from_attributes = True

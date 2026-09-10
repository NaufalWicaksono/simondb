from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, Numeric, Date, DateTime, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base


class School(Base):
    """
    Model representing Distribution Hub / Facility (retains table name 'school' for zero-friction schema compatibility)
    """
    __tablename__ = "school"

    id = Column(Integer, primary_key=True, index=True)
    npsn = Column(String(50), unique=True, index=True, nullable=False) # Hub / Facility Code (e.g. HUB-JKT-001)
    nama_sekolah = Column(String(200), nullable=False) # Hub Name (e.g. Central Warehouse Jakarta Timur)
    jenjang = Column(String(50), nullable=False) # Facility Type: "Central Fulfillment Hub", "Regional Cross-Dock", "Cold Chain Center", "Micro-Distribution Hub", "Air Cargo Hub"
    status_sekolah = Column(String(50), nullable=True, default="Active") # Status
    provinsi = Column(String(100), nullable=False) # Province (38 provinces across Indonesia)
    kabupaten = Column(String(100), nullable=False) # Regency / City
    kecamatan = Column(String(100), nullable=True)
    kelurahan = Column(String(100), nullable=True)
    alamat = Column(Text, nullable=True)
    nama_kepala_sekolah = Column(String(100), nullable=True) # Hub Manager
    nomor_hp = Column(String(50), nullable=True)
    is_3t = Column(Boolean, default=False) # True if remote / strategic frontier logistics outpost
    keterangan_wilayah = Column(String(100), nullable=True) # "Reguler", "Area Strategis 3T", "Wilayah Khusus Logistik", "Kawasan Ekonomi Khusus"
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    revitalisasi_list = relationship("Revitalisasi", back_populates="school", cascade="all, delete-orphan")


class Revitalisasi(Base):
    """
    Model representing Modernization & Expansion Projects (retains table name 'revitalisasi')
    """
    __tablename__ = "revitalisasi"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("school.id", ondelete="CASCADE"), nullable=False)
    tahun = Column(Integer, nullable=False) # 2024, 2025, 2026
    kategori = Column(String(100), nullable=True) # Modernization Category (e.g. "Automated Sortation System", "Cold Storage Expansion", "Fleet Electrification", "Capacity Upgrade")
    menu_dan_volume = Column(Text, nullable=True) # Rincian program (e.g. "Pembangunan Ruang Kelas; Pembangunan Ruang Praktik" or "Automated Conveyor; Blast Freezer")
    nilai_bantuan = Column(Numeric(15, 2), nullable=True) # Capex / Investment Value (IDR)
    status_pks = Column(String(100), nullable=True, default="Disetujui")
    nomor_pks = Column(String(100), nullable=True)
    tanggal_pks = Column(Date, nullable=True)
    pendamping = Column(String(100), nullable=True)
    status_sekolah_batal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    school = relationship("School", back_populates="revitalisasi_list")
    progress_monitoring = relationship("ProgressMonitoring", back_populates="revitalisasi", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_revitalisasi_school_tahun", "school_id", "tahun"),
    )


class ProgressMonitoring(Base):
    __tablename__ = "progress_monitoring"

    id = Column(Integer, primary_key=True, index=True)
    revitalisasi_id = Column(Integer, ForeignKey("revitalisasi.id", ondelete="CASCADE"), nullable=False)
    tanggal_submit = Column(DateTime, default=datetime.utcnow)
    progres_admin = Column(String(50), nullable=True)
    progres_fisik = Column(String(50), nullable=True)
    nilai_pencairan = Column(Numeric(15, 2), nullable=True)
    catatan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    revitalisasi = relationship("Revitalisasi", back_populates="progress_monitoring")


class RevitImportHistory(Base):
    __tablename__ = "revit_import_history"

    id = Column(Integer, primary_key=True, index=True)
    tahun_data = Column(Integer, nullable=False)
    nama_file = Column(String(255), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    jumlah_data = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False) # "SUCCESS", "FAILED"
    keterangan_error = Column(Text, nullable=True)

    uploader = relationship("User")


# Aliases for clean semantic domain naming
Facility = School
FacilityModernization = Revitalisasi

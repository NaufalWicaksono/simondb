"""
seed_demo_data.py — Generates complete realistic dummy data for SiMonDB Demo (SQLite)
Domain: Enterprise National Logistics, Distribution Hubs & Supply Chain Network
"""

import random
from datetime import datetime, date, timedelta
from sqlalchemy import text
from app.database.connection import engine, SessionLocal
from app.models.base import Base
from app.models.role import Role
from app.models.user import User
from app.models.facility import School, Revitalisasi, ProgressMonitoring, RevitImportHistory
from app.core.security import hash_password

PROVINCES_COORDINATES = [
    ("DKI Jakarta", "Kota Jakarta Pusat", -6.1818, 106.8223, False, "Hub Perkotaan Utama"),
    ("DKI Jakarta", "Kota Jakarta Timur", -6.2250, 106.9004, False, "Hub Perkotaan Utama"),
    ("DKI Jakarta", "Kota Jakarta Utara", -6.1384, 106.8640, False, "Kawasan Industri & Pelabuhan"),
    ("Jawa Barat", "Kota Bandung", -6.9175, 107.6191, False, "Hub Perkotaan Utama"),
    ("Jawa Barat", "Kab. Bekasi", -6.3644, 107.1725, False, "Kawasan Industri & Pergudangan"),
    ("Jawa Barat", "Kota Bogor", -6.5971, 106.8060, False, "Reguler"),
    ("Jawa Barat", "Kab. Karawang", -6.3227, 107.3376, False, "Kawasan Industri & Pergudangan"),
    ("Jawa Tengah", "Kota Semarang", -6.9667, 110.4167, False, "Hub Perkotaan Utama"),
    ("Jawa Tengah", "Kota Surakarta", -7.5755, 110.8243, False, "Reguler"),
    ("Jawa Tengah", "Kab. Cilacap", -7.7167, 109.0000, False, "Reguler"),
    ("DI Yogyakarta", "Kota Yogyakarta", -7.7956, 110.3695, False, "Reguler"),
    ("DI Yogyakarta", "Kab. Sleman", -7.7156, 110.3556, False, "Reguler"),
    ("Jawa Timur", "Kota Surabaya", -7.2575, 112.7521, False, "Hub Perkotaan Utama"),
    ("Jawa Timur", "Kota Malang", -7.9666, 112.6326, False, "Reguler"),
    ("Jawa Timur", "Kab. Sidoarjo", -7.4478, 112.7183, False, "Kawasan Pergudangan"),
    ("Jawa Timur", "Kab. Gresik", -7.1566, 112.6555, False, "Kawasan Industri"),
    ("Banten", "Kota Tangerang", -6.1783, 106.6319, False, "Hub Perkotaan Utama"),
    ("Banten", "Kota Cilegon", -6.0024, 106.0125, False, "Kawasan Pelabuhan & Industri"),
    ("Banten", "Kab. Lebak", -6.6500, 106.2167, True, "Wilayah Strategis 3T"),
    ("Sumatera Utara", "Kota Medan", 3.5952, 98.6722, False, "Hub Perkotaan Utama"),
    ("Sumatera Utara", "Kab. Deli Serdang", 3.5500, 98.8667, False, "Kawasan Pergudangan"),
    ("Sumatera Utara", "Kab. Nias Barat", 0.9833, 97.4500, True, "Wilayah Strategis 3T"),
    ("Sumatera Barat", "Kota Padang", -0.9471, 100.4172, False, "Reguler"),
    ("Sumatera Barat", "Kab. Kepulauan Mentawai", -2.0000, 99.6667, True, "Wilayah Strategis 3T"),
    ("Riau", "Kota Pekanbaru", 0.5071, 101.4478, False, "Hub Perkotaan Utama"),
    ("Riau", "Kab. Dumai", 1.6667, 101.4500, False, "Kawasan Pelabuhan"),
    ("Kepulauan Riau", "Kota Batam", 1.1301, 104.0529, False, "Kawasan Perdagangan Bebas FTZ"),
    ("Kepulauan Riau", "Kab. Natuna", 3.9000, 108.2500, True, "Wilayah Strategis 3T"),
    ("Kepulauan Riau", "Kab. Kepulauan Anambas", 3.1667, 106.2500, True, "Wilayah Strategis 3T"),
    ("Jambi", "Kota Jambi", -1.6101, 103.6131, False, "Reguler"),
    ("Sumatera Selatan", "Kota Palembang", -2.9761, 104.7754, False, "Hub Perkotaan Utama"),
    ("Bengkulu", "Kota Bengkulu", -3.8004, 102.2655, False, "Reguler"),
    ("Bengkulu", "Kab. Enggano", -5.3500, 102.2500, True, "Wilayah Strategis 3T"),
    ("Lampung", "Kota Bandar Lampung", -5.4500, 105.2667, False, "Hub Perkotaan Utama"),
    ("Bangka Belitung", "Kota Pangkal Pinang", -2.1333, 106.1167, False, "Reguler"),
    ("Bangka Belitung", "Kab. Belitung Timur", -2.9833, 108.1500, False, "Reguler"),
    ("Kalimantan Barat", "Kota Pontianak", -0.0263, 109.3425, False, "Hub Perkotaan Utama"),
    ("Kalimantan Barat", "Kab. Sambas", 1.3500, 109.3000, True, "Wilayah Strategis 3T"),
    ("Kalimantan Tengah", "Kota Palangka Raya", -2.2083, 113.9167, False, "Reguler"),
    ("Kalimantan Selatan", "Kota Banjarmasin", -3.3167, 114.5900, False, "Hub Perkotaan Utama"),
    ("Kalimantan Timur", "Kota Balikpapan", -1.2379, 116.8289, False, "Hub Perkotaan Utama"),
    ("Kalimantan Timur", "Kota Samarinda", -0.5022, 117.1536, False, "Reguler"),
    ("Kalimantan Timur", "Kab. Penajam Paser Utara (IKN)", -1.3333, 116.7167, False, "Kawasan Strategis Nasional IKN"),
    ("Kalimantan Utara", "Kota Tarakan", 3.3000, 117.6333, False, "Reguler"),
    ("Kalimantan Utara", "Kab. Nunukan", 4.1333, 117.6667, True, "Wilayah Strategis 3T"),
    ("Sulawesi Utara", "Kota Manado", 1.4748, 124.8428, False, "Hub Perkotaan Utama"),
    ("Sulawesi Utara", "Kab. Kepulauan Talaud", 4.3333, 126.8333, True, "Wilayah Strategis 3T"),
    ("Gorontalo", "Kota Gorontalo", 0.5435, 123.0568, False, "Reguler"),
    ("Sulawesi Tengah", "Kota Palu", -0.9003, 119.8779, False, "Reguler"),
    ("Sulawesi Barat", "Kota Mamuju", -2.6775, 118.8872, False, "Reguler"),
    ("Sulawesi Selatan", "Kota Makassar", -5.1477, 119.4327, False, "Hub Perkotaan Utama"),
    ("Sulawesi Selatan", "Kab. Maros", -5.0000, 119.5667, False, "Kawasan Pergudangan Bandara"),
    ("Sulawesi Tenggara", "Kota Kendari", -3.9985, 122.5126, False, "Reguler"),
    ("Bali", "Kota Denpasar", -8.6705, 115.2126, False, "Hub Perkotaan Utama"),
    ("Bali", "Kab. Badung", -8.5833, 115.1833, False, "Kawasan Logistik Pariwisata"),
    ("Nusa Tenggara Barat", "Kota Mataram", -8.5833, 116.1167, False, "Reguler"),
    ("Nusa Tenggara Barat", "Kab. Lombok Barat", -8.6833, 116.1333, False, "Reguler"),
    ("Nusa Tenggara Timur", "Kota Kupang", -10.1772, 123.6070, False, "Reguler"),
    ("Nusa Tenggara Timur", "Kab. Rote Ndao", -10.7333, 123.1167, True, "Wilayah Strategis 3T"),
    ("Nusa Tenggara Timur", "Kab. Belu (Perbatasan)", -9.1000, 124.9000, True, "Wilayah Strategis 3T"),
    ("Maluku", "Kota Ambon", -3.6954, 128.1814, False, "Hub Kepulauan"),
    ("Maluku", "Kab. Kepulauan Aru", -5.7500, 134.5000, True, "Wilayah Strategis 3T"),
    ("Maluku Utara", "Kota Ternate", 0.7833, 127.3667, False, "Hub Kepulauan"),
    ("Maluku Utara", "Kab. Pulau Morotai", 2.3333, 128.4167, True, "Wilayah Strategis 3T"),
    ("Papua", "Kota Jayapura", -2.5337, 140.7181, False, "Hub Utama Papua"),
    ("Papua Barat", "Kota Sorong", -0.8762, 131.2558, False, "Kawasan Pelabuhan Timur"),
    ("Papua Barat", "Kab. Manokwari", -0.8615, 134.0620, False, "Reguler"),
    ("Papua Selatan", "Kab. Merauke", -8.4991, 140.4049, True, "Wilayah Strategis 3T"),
    ("Papua Tengah", "Kab. Nabire", -3.3667, 135.5000, True, "Wilayah Strategis 3T"),
    ("Papua Pegunungan", "Kab. Jayawijaya", -4.0833, 138.9500, True, "Wilayah Strategis 3T"),
    ("Papua Barat Daya", "Kab. Raja Ampat", -0.2333, 130.5000, True, "Wilayah Strategis 3T"),
    ("Aceh", "Kota Banda Aceh", 5.5483, 95.3238, False, "Reguler"),
    ("Aceh", "Kota Sabang", 5.8933, 95.3197, True, "Wilayah Strategis 3T"),
    ("Aceh", "Kab. Simeulue", 2.6167, 96.0833, True, "Wilayah Strategis 3T"),
]

FACILITY_TYPES = [
    "Central Fulfillment Hub",
    "Regional Cross-Dock",
    "Cold Chain Terminal",
    "Micro-Distribution Center",
    "Air Cargo Transit Hub",
]

CATEGORIES = [
    "Automated Sortation System",
    "Cold Storage Expansion",
    "Fleet Electrification & Charging",
    "High-Bay Racking & Robotics",
    "Solar Rooftop & Green Energy",
]

PROGRAM_MENUS = [
    "Pembangunan Ruang Kelas; Pembangunan Ruang Praktik; Pembangunan Toilet",
    "Pembangunan Ruang Praktik; Pembangunan Ruang UKS; Pembangunan Ruang Guru",
    "Rehabilitasi Ruang Kelas; Rehabilitasi Ruang Praktik; Rehabilitasi Toilet",
    "Pembangunan Ruang Praktik; Pembangunan Ruang Perpustakaan; Pembangunan Toilet",
    "Rehabilitasi Ruang Praktik; Rehabilitasi Ruang Guru; Rehabilitasi Ruang UKS",
    "Pembangunan Ruang Kelas; Pembangunan Ruang Guru; Pembangunan Ruang Perpustakaan",
]


def seed_database():
    print("=" * 60)
    print("[*] Initializing SiMonDB Demo SQLite Database...")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Roles
        print("[1/5] Seeding Roles...")
        roles = {
            "super_admin": Role(name="super_admin", description="Super Administrator"),
            "admin": Role(name="admin", description="Regional / Operations Administrator"),
            "viewer": Role(name="viewer", description="Operations Analyst & Viewer"),
        }
        for name, r_obj in roles.items():
            existing = db.query(Role).filter(Role.name == name).first()
            if not existing:
                db.add(r_obj)
        db.commit()

        # 2. Seed Users
        print("[2/5] Seeding Demo Users...")
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        viewer_role = db.query(Role).filter(Role.name == "viewer").first()

        users_to_seed = [
            ("Super Admin Demo", "superadmin", "admin@simondb.demo", "Admin123!", super_admin_role.id),
            ("Budi Santoso (Admin Operasional)", "regional_admin", "admin.ops@simondb.demo", "Admin123!", admin_role.id),
            ("Siti Rahma (Analyst Logistik)", "analyst_viewer", "analyst@simondb.demo", "Admin123!", viewer_role.id),
        ]

        for name, uname, email, pwd, rid in users_to_seed:
            if not db.query(User).filter(User.username == uname).first():
                user = User(
                    name=name,
                    username=uname,
                    email=email,
                    password_hash=hash_password(pwd),
                    role_id=rid,
                    is_active=True,
                )
                db.add(user)
        db.commit()

        # 3. Seed Facilities & Modernization Data (1,000 Facilities across 38 Provinces)
        print("[3/5] Seeding 1,000+ Distribution Facilities across 38 Indonesian Provinces...")
        existing_count = db.query(School).count()
        if existing_count < 200:
            facility_idx = 1
            for year in [2024, 2025, 2026]:
                # Repeat across provinces
                for prov_info in PROVINCES_COORDINATES:
                    prov, kab, lat_base, lng_base, is_3t, ket_wilayah = prov_info

                    # Generate 5-8 facilities per province location
                    num_hubs = random.randint(5, 9) if not is_3t else random.randint(2, 4)
                    for h in range(num_hubs):
                        hub_code = f"HUB-{year}-{facility_idx:05d}"
                        f_type = random.choice(FACILITY_TYPES)
                        
                        # Small jitter for geographic spread around the city
                        lat_jitter = lat_base + random.uniform(-0.08, 0.08)
                        lng_jitter = lng_base + random.uniform(-0.08, 0.08)

                        facility_name = f"{f_type} {kab} #{h+1}"
                        if is_3t:
                            facility_name += " [Pos Perbatasan/3T]"

                        school = School(
                            npsn=hub_code,
                            nama_sekolah=facility_name,
                            jenjang=f_type,
                            status_sekolah="Operational",
                            provinsi=prov,
                            kabupaten=kab,
                            kecamatan=f"Kecamatan {kab} Pusat",
                            kelurahan=f"Kelurahan Logistik {h+1}",
                            alamat=f"Jl. Raya Industri & Pergudangan Logistik No. {random.randint(10, 500)}",
                            nama_kepala_sekolah=f"Manager {random.choice(['Hendro', 'Agus', 'Dewi', 'Rian', 'Putri', 'Bambang', 'Wayan', 'Frans'])}",
                            nomor_hp=f"0812{random.randint(10000000, 99999999)}",
                            is_3t=is_3t,
                            keterangan_wilayah=ket_wilayah,
                            latitude=round(lat_jitter, 6),
                            longitude=round(lng_jitter, 6),
                        )
                        db.add(school)
                        db.flush()

                        # Add Modernization / Capex Record
                        budget = random.randint(8, 95) * 100_000_000 # 800 Juta - 9.5 Miliar
                        kategori = random.choice(CATEGORIES)
                        menu = random.choice(PROGRAM_MENUS)

                        revit = Revitalisasi(
                            school_id=school.id,
                            tahun=year,
                            kategori=kategori,
                            menu_dan_volume=menu,
                            nilai_bantuan=budget,
                            status_pks="Disetujui & Berjalan",
                            nomor_pks=f"PKS/LOG/{year}/{facility_idx:04d}",
                            tanggal_pks=date(year, random.randint(1, 6), random.randint(1, 28)),
                            pendamping="Tim Supervisi Infrastruktur Nasional",
                            status_sekolah_batal=False,
                        )
                        db.add(revit)
                        db.flush()

                        prog = ProgressMonitoring(
                            revitalisasi_id=revit.id,
                            tanggal_submit=datetime(year, random.randint(7, 12), random.randint(1, 28)),
                            progres_admin="100%",
                            progres_fisik=f"{random.randint(60, 100)}%",
                            nilai_pencairan=budget * random.choice([0.7, 0.85, 1.0]),
                            catatan="Audit operasional berjalan sesuai timeline target SLA.",
                        )
                        db.add(prog)

                        facility_idx += 1

            db.commit()
            print(f"[+] Seeded {facility_idx - 1} facilities successfully!")

        # 4. Seed Dynamic Analytics Tables for Query Builder (dapodik_datamart equivalent in SQLite)
        print("[4/5] Creating & Seeding Data Warehouse / Dynamic Analytics Tables...")

        # Table: shipment_deliveries
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS shipment_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tracking_code TEXT NOT NULL,
                origin_province TEXT NOT NULL,
                dest_province TEXT NOT NULL,
                carrier_fleet TEXT NOT NULL,
                service_level TEXT NOT NULL,
                package_weight_kg REAL NOT NULL,
                shipping_cost_idr REAL NOT NULL,
                delivery_status TEXT NOT NULL,
                transit_days INTEGER NOT NULL,
                sla_on_time TEXT NOT NULL,
                customer_rating INTEGER NOT NULL,
                created_date TEXT NOT NULL
            );
        """))

        # Table: warehouse_inventory
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS warehouse_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku_code TEXT NOT NULL,
                product_name TEXT NOT NULL,
                category TEXT NOT NULL,
                warehouse_hub TEXT NOT NULL,
                province TEXT NOT NULL,
                stock_quantity INTEGER NOT NULL,
                safety_stock_threshold INTEGER NOT NULL,
                unit_price_idr REAL NOT NULL,
                stock_status TEXT NOT NULL,
                last_restocked_date TEXT NOT NULL
            );
        """))

        # Table: fleet_vehicles
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS fleet_vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_plate TEXT NOT NULL,
                vehicle_model TEXT NOT NULL,
                fleet_type TEXT NOT NULL,
                assigned_province TEXT NOT NULL,
                fuel_type TEXT NOT NULL,
                mileage_km REAL NOT NULL,
                fuel_efficiency_km_per_l REAL NOT NULL,
                battery_or_fuel_level_pct INTEGER NOT NULL,
                operational_status TEXT NOT NULL,
                last_service_date TEXT NOT NULL
            );
        """))

        # Table: regional_financial_metrics
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS regional_financial_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fiscal_year INTEGER NOT NULL,
                quarter TEXT NOT NULL,
                region_name TEXT NOT NULL,
                total_revenue_idr REAL NOT NULL,
                fuel_and_energy_cost_idr REAL NOT NULL,
                maintenance_cost_idr REAL NOT NULL,
                labor_cost_idr REAL NOT NULL,
                net_operating_margin_pct REAL NOT NULL,
                fleet_utilization_pct REAL NOT NULL
            );
        """))
        db.commit()

        # Check if analytics tables already have data
        shipment_count = db.execute(text("SELECT count(*) FROM shipment_deliveries")).scalar()
        if shipment_count == 0:
            print("  Populating shipment_deliveries (1,500 records)...")
            CARRIERS = ["Fleet Express Alpha", "ColdChain Logistic Link", "MegaFreight AirCargo", "EcoVolt EV Delivery", "Nusantara Cargo Line"]
            SERVICES = ["Same-Day Priority", "Next-Day Guaranteed", "Standard Road Cargo", "Cold Chain Pharma", "Inter-Island Freight"]
            STATUSES = ["Delivered", "Delivered", "Delivered", "In-Transit", "Out for Delivery", "Delayed"]
            PROV_NAMES = [p[0] for p in PROVINCES_COORDINATES]

            for s_i in range(1500):
                orig = random.choice(PROV_NAMES)
                dest = random.choice(PROV_NAMES)
                weight = round(random.uniform(0.5, 120.0), 2)
                cost = round(weight * random.randint(12000, 45000) + random.randint(25000, 150000), 0)
                transit = random.randint(1, 5)
                on_time = "YES" if random.random() > 0.12 else "NO"
                stat = random.choice(STATUSES)
                rating = random.randint(4, 5) if on_time == "YES" else random.randint(1, 3)
                dt_str = (datetime.now() - timedelta(days=random.randint(1, 180))).strftime("%Y-%m-%d")

                db.execute(text("""
                    INSERT INTO shipment_deliveries 
                    (tracking_code, origin_province, dest_province, carrier_fleet, service_level, package_weight_kg, shipping_cost_idr, delivery_status, transit_days, sla_on_time, customer_rating, created_date)
                    VALUES (:tc, :orig, :dest, :cf, :sl, :pw, :sc, :ds, :td, :sla, :cr, :cd)
                """), {
                    "tc": f"TRK-{random.randint(1000000, 9999999)}",
                    "orig": orig,
                    "dest": dest,
                    "cf": random.choice(CARRIERS),
                    "sl": random.choice(SERVICES),
                    "pw": weight,
                    "sc": cost,
                    "ds": stat,
                    "td": transit,
                    "sla": on_time,
                    "cr": rating,
                    "cd": dt_str,
                })

            print("  Populating warehouse_inventory (400 records)...")
            ITEM_CATS = [
                ("Electronics & Components", ["Smart Hub Controller", "Industrial Router 5G", "Barcode Scanner Zebra", "Telematics Sensor IoT", "Thermal Printer"]),
                ("Cold Chain Pharma", ["Vaccine Reagent A", "Insulin Storage Unit", "Bio-Specimen Container", "Plasma Cold Box"]),
                ("FMCG & Consumer Goods", ["Premium Roasted Coffee 1kg", "Ultra-Filtered Milk Carton", "Organic Palm Oil 5L", "Snack Pack Box"]),
                ("Automotive & Fleet Parts", ["Electric Motor Hub 48V", "Heavy Duty Tire 18-Inch", "Brake Pad Ceramic", "Lithium Battery Cell 100Ah"]),
            ]
            for cat_name, items in ITEM_CATS:
                for item in items:
                    for prov_i in random.sample(PROVINCES_COORDINATES, 15):
                        qty = random.randint(20, 1200)
                        safety = random.randint(50, 150)
                        price = round(random.randint(35000, 8500000), -3)
                        st_stat = "OPTIMAL" if qty >= safety else "LOW STOCK"
                        last_dt = (datetime.now() - timedelta(days=random.randint(1, 60))).strftime("%Y-%m-%d")

                        db.execute(text("""
                            INSERT INTO warehouse_inventory
                            (sku_code, product_name, category, warehouse_hub, province, stock_quantity, safety_stock_threshold, unit_price_idr, stock_status, last_restocked_date)
                            VALUES (:sku, :pn, :cat, :wh, :prov, :sq, :sst, :up, :ss, :lrd)
                        """), {
                            "sku": f"SKU-{random.randint(10000, 99999)}",
                            "pn": item,
                            "cat": cat_name,
                            "wh": f"Hub {prov_i[1]}",
                            "prov": prov_i[0],
                            "sq": qty,
                            "sst": safety,
                            "up": price,
                            "ss": st_stat,
                            "lrd": last_dt,
                        })

            print("  Populating fleet_vehicles (200 records)...")
            FLEET_TYPES = [
                ("Heavy Long-Haul Truck", ["Hino Profia 500", "Mitsubishi Fuso Super Great", "Volvo FH16"], "Diesel Euro 5"),
                ("Electric Blind Van", ["Wuling EV Commercial", "DFSK Gelora E", "BYD T3 EV"], "Electric Battery"),
                ("Cold Chain Box Truck", ["Isuzu Giga ColdBox", "Hino Dutro Refrigerator"], "Diesel & Battery Backup"),
                ("Last-Mile Cargo Trike", ["Selis Electric Trike", "Viar Karya EV"], "Electric Battery"),
            ]
            for f_type, models, fuel in FLEET_TYPES:
                for idx in range(50):
                    plate = f"B {random.randint(1000, 9999)} {''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))}"
                    prov_sample = random.choice(PROVINCES_COORDINATES)[0]
                    mileage = round(random.uniform(5000, 240000), 1)
                    eff = round(random.uniform(7.5, 16.0) if "Diesel" in fuel else random.uniform(22.0, 35.0), 1)
                    batt = random.randint(35, 100)
                    op_stat = random.choice(["Active Route", "Active Route", "Active Route", "Charging / Refueling", "Scheduled Maintenance"])
                    serv_dt = (datetime.now() - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d")

                    db.execute(text("""
                        INSERT INTO fleet_vehicles
                        (vehicle_plate, vehicle_model, fleet_type, assigned_province, fuel_type, mileage_km, fuel_efficiency_km_per_l, battery_or_fuel_level_pct, operational_status, last_service_date)
                        VALUES (:vp, :vm, :ft, :ap, :ftype, :mkm, :eff, :bf, :ops, :lsd)
                    """), {
                        "vp": plate,
                        "vm": random.choice(models),
                        "ft": f_type,
                        "ap": prov_sample,
                        "ftype": fuel,
                        "mkm": mileage,
                        "eff": eff,
                        "bf": batt,
                        "ops": op_stat,
                        "lsd": serv_dt,
                    })

            print("  Populating regional_financial_metrics (120 records)...")
            for yr in [2024, 2025, 2026]:
                for qtr in ["Q1", "Q2", "Q3", "Q4"]:
                    for prov in ["DKI Jakarta", "Jawa Barat", "Jawa Timur", "Jawa Tengah", "Sumatera Utara", "Sulawesi Selatan", "Kalimantan Timur", "Bali", "Papua", "Banten"]:
                        rev = round(random.uniform(15_000_000_000, 95_000_000_000), 0)
                        fuel_c = round(rev * random.uniform(0.18, 0.28), 0)
                        maint_c = round(rev * random.uniform(0.08, 0.14), 0)
                        labor_c = round(rev * random.uniform(0.15, 0.22), 0)
                        margin = round(random.uniform(18.5, 34.2), 2)
                        util = round(random.uniform(74.0, 96.5), 1)

                        db.execute(text("""
                            INSERT INTO regional_financial_metrics
                            (fiscal_year, quarter, region_name, total_revenue_idr, fuel_and_energy_cost_idr, maintenance_cost_idr, labor_cost_idr, net_operating_margin_pct, fleet_utilization_pct)
                            VALUES (:yr, :qtr, :rn, :rev, :fc, :mc, :lc, :mg, :ut)
                        """), {
                            "yr": yr, "qtr": qtr, "rn": prov, "rev": rev, "fc": fuel_c, "mc": maint_c, "lc": labor_c, "mg": margin, "ut": util
                        })

            db.commit()
            print("[+] Seeded dynamic analytics tables successfully!")

        print("[5/5] Checking Database Integrity...")
        all_tables = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        print(f"[+] Total SQLite Tables Created: {len(all_tables)}")
        for t in all_tables:
            count = db.execute(text(f'SELECT count(*) FROM "{t[0]}"')).scalar()
            print(f"   * {t[0]:<30}: {count:>6} rows")

        print("=" * 60)
        print("[SUCCESS] SiMonDB Demo Database is fully seeded and ready!")
        print("   Super Admin Email   : admin@simondb.demo")
        print("   Super Admin Password: Admin123!")
        print("=" * 60)

    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Error during seeding: {exc}")
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

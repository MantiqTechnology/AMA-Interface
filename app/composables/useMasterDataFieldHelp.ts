type MasterDataFieldCopy = {
  label: string;
  help: string;
};

type MasterDataCopy = Record<string, MasterDataFieldCopy>;

const masterDataHelpCopy = {
  en: {
    'station.stationCode': {
      label: 'Station code',
      help: 'Short operational station identifier used in routes, schedules, and flight planning.'
    },
    'station.stationName': {
      label: 'Station name',
      help: 'Full station or airfield name shown to operations users.'
    },
    'station.airportType': {
      label: 'Airport type',
      help: 'Classifies whether this point is an airport, airstrip, or STOL airfield for route planning.'
    },
    'station.city': {
      label: 'City or region',
      help: 'Local area used to identify where the station is located.'
    },
    'station.province': {
      label: 'Province',
      help: 'Province or territory used for station filtering and reporting.'
    },
    'station.stationPicName': {
      label: 'Station PIC',
      help: 'Primary station contact for ground coordination.'
    },
    'station.stationPicPhone': {
      label: 'PIC phone',
      help: 'Phone number for the station contact used during operational coordination.'
    },
    'station.operationalNotes': {
      label: 'Operational notes',
      help: 'Station-specific constraints, handling context, or local operating notes.'
    },
    'station.isRemoteStation': {
      label: 'Remote station',
      help: 'Marks stations with remote-area operating constraints.'
    },
    'station.lowConnectivityMode': {
      label: 'Low connectivity',
      help: 'Marks stations where digital confirmation may be delayed or intermittent.'
    },
    'station.hasFuelService': {
      label: 'Fuel service',
      help: 'Indicates whether fuel uplift can be planned at this station.'
    },
    'station.hasHandlingService': {
      label: 'Handling service',
      help: 'Indicates whether ground handling support is available at this station.'
    },
    'station.hasParkingService': {
      label: 'Parking service',
      help: 'Indicates whether aircraft parking can be arranged at this station.'
    },
    'route.routeCode': {
      label: 'Route code',
      help: 'Operational route identifier used by flight requests, schedules, rates, and readiness checks.'
    },
    'route.origin': {
      label: 'Origin',
      help: 'Departure station for this route.'
    },
    'route.destination': {
      label: 'Destination',
      help: 'Arrival station for this route.'
    },
    'route.duration': {
      label: 'Duration minutes',
      help: 'Planned block time in minutes used to estimate ETA and schedule feasibility.'
    },
    'route.distance': {
      label: 'Distance',
      help: 'Route distance in kilometres used for planning, reporting, and rate context.'
    },
    'route.operationalNotes': {
      label: 'Operational notes',
      help: 'Route-specific notes such as terrain, weather pattern, or coordination requirements.'
    },
    'route.restrictionLevel': {
      label: 'Restriction level',
      help: 'Controls whether the route is normal, advisory-only, or blocked for planning.'
    },
    'route.restrictionNote': {
      label: 'Restriction note',
      help: 'Required explanation when a route has advisory or blocking restrictions.'
    },
    'aircraft.registrationNumber': {
      label: 'Registration number',
      help: 'Aircraft registration used for assignment, readiness, and operational tracking.'
    },
    'aircraft.serialNumber': {
      label: 'Serial number / MSN',
      help: 'Manufacturer serial number used for asset traceability.'
    },
    'aircraft.aircraftType': {
      label: 'Aircraft type',
      help: 'Aircraft type used by route suitability, rate preview, and operational reports.'
    },
    'aircraft.manufacturer': {
      label: 'Manufacturer',
      help: 'Aircraft manufacturer used for master data and maintenance reference.'
    },
    'aircraft.model': {
      label: 'Model',
      help: 'Aircraft model or variant used for capacity and fuel planning context.'
    },
    'aircraft.fleetCode': {
      label: 'Fleet code',
      help: 'Internal fleet grouping used for filtering and operations reporting.'
    },
    'aircraft.passengerCapacity': {
      label: 'Passenger capacity',
      help: 'Maximum passenger seats before route-specific capacity reservations are applied.'
    },
    'aircraft.cargoCapacityKg': {
      label: 'Cargo capacity kg',
      help: 'Maximum cargo capacity in kilograms before route-specific reservations are applied.'
    },
    'aircraft.fuelType': {
      label: 'Fuel type',
      help: 'Fuel product the aircraft normally requires for uplift planning.'
    },
    'aircraft.engineCategory': {
      label: 'Engine category',
      help: 'Engine class used to interpret fuel profile and operating assumptions.'
    },
    'aircraft.usableFuelCapacityLitre': {
      label: 'Usable fuel capacity L',
      help: 'Usable fuel quantity in litres for planning range and uplift context.'
    },
    'aircraft.fuelCapacityBasis': {
      label: 'Fuel capacity basis',
      help: 'Clarifies whether capacity is usable fuel or total tank capacity.'
    },
    'aircraft.cruiseFuelBurnLitrePerHour': {
      label: 'Cruise burn L/hour',
      help: 'Estimated cruise fuel burn used by advisory fuel calculations.'
    },
    'aircraft.holdingFuelBurnLitrePerHour': {
      label: 'Holding burn L/hour',
      help: 'Estimated holding fuel burn used for contingency planning.'
    },
    'aircraft.taxiFuelBurnLitrePerHour': {
      label: 'Taxi burn L/hour',
      help: 'Estimated taxi fuel burn used by advisory fuel calculations.'
    },
    'aircraft.fuelProfileSource': {
      label: 'Fuel profile source',
      help: 'Source of the fuel profile such as AFM, POH, approved table, historical estimate, or demo data.'
    },
    'aircraft.fuelProfileEffectiveFrom': {
      label: 'Fuel profile effective from',
      help: 'Date from which this fuel profile should be treated as current.'
    },
    'aircraft.fuelProfileReference': {
      label: 'Fuel profile reference',
      help: 'Reference document, table, revision, or note behind the fuel profile.'
    },
    'aircraft.fuelProfileAdvisoryOnly': {
      label: 'Fuel profile is advisory only',
      help: 'Marks fuel calculations as planning guidance rather than an approved operational limit.'
    },
    'aircraft.defaultCapacityProfileId': {
      label: 'Default capacity profile',
      help: 'Default capacity rule suggested when this aircraft is selected for a flight request.'
    },
    'aircraft.operationalStatus': {
      label: 'Operational status',
      help: 'Controls whether the aircraft is active, inactive, or retired in operational planning.'
    },
    'aircraft.serviceabilityStatus': {
      label: 'Serviceability',
      help: 'Current maintenance readiness state checked during aircraft assignment.'
    },
    'aircraft.baseStationId': {
      label: 'Home base',
      help: 'Normal base station used for positioning and operational context.'
    },
    'aircraft.currentStationId': {
      label: 'Current station',
      help: 'Latest known aircraft station used by flight request readiness checks.'
    },
    'aircraft.lastMaintenanceCheckAt': {
      label: 'Last inspection date',
      help: 'Most recent maintenance inspection date shown in readiness context.'
    },
    'aircraft.nextMaintenanceDueAt': {
      label: 'Next scheduled maintenance date',
      help: 'Next maintenance due date used to flag serviceability warnings.'
    },
    'aircraft.serviceabilityNote': {
      label: 'Operational restriction or maintenance note',
      help: 'Explanation for non-serviceable or restricted aircraft states.'
    },
    'personnel.employeeCode': {
      label: 'Employee code',
      help: 'Internal personnel identifier used in crew assignment and audit trails.'
    },
    'personnel.fullName': {
      label: 'Full legal name',
      help: 'Crew member name shown in flight request assignment and readiness screens.'
    },
    'personnel.crewRole': {
      label: 'Crew role',
      help: 'Operational role used to filter PIC, co-pilot, cabin, and ground crew candidates.'
    },
    'personnel.licenseType': {
      label: 'Primary license type',
      help: 'Main licence type used for pilot eligibility checks.'
    },
    'personnel.licenseNumber': {
      label: 'Primary license number',
      help: 'Primary licence reference number for crew records.'
    },
    'personnel.licenseExpiryDate': {
      label: 'License expiry',
      help: 'Licence expiry date used to warn when a crew assignment is no longer valid.'
    },
    'personnel.medicalExpiryDate': {
      label: 'Medical certificate expiry',
      help: 'Medical certificate expiry date used for flight crew readiness.'
    },
    'personnel.baseStationId': {
      label: 'Base station',
      help: 'Normal base station for crew assignment and positioning context.'
    },
    'personnel.availabilityStatus': {
      label: 'Availability',
      help: 'Current personnel availability used by crew candidate filtering.'
    },
    'personnel.dutyStationId': {
      label: 'Duty station',
      help: 'Current duty station used to understand crew positioning for a flight.'
    },
    'personnel.readinessNote': {
      label: 'Operational note',
      help: 'Crew-specific readiness note visible to operations users.'
    },
    'personnel.departmentId': {
      label: 'Unit',
      help: 'Organizational unit used for ownership, reporting, and filtering.'
    },
    'personnel.employmentStatus': {
      label: 'Employment status',
      help: 'Employment state used to keep inactive personnel out of planning.'
    },
    'scheduleTemplate.templateCode': {
      label: 'Template code',
      help: 'Reusable schedule identifier used when pre-filling flight requests.'
    },
    'scheduleTemplate.routeId': {
      label: 'Route',
      help: 'Route this schedule template applies to.'
    },
    'scheduleTemplate.serviceTypeId': {
      label: 'Service type',
      help: 'Flight service model this schedule template should create.'
    },
    'scheduleTemplate.defaultAircraftId': {
      label: 'Default aircraft',
      help: 'Aircraft suggested when this schedule template is applied.'
    },
    'scheduleTemplate.capacityProfileId': {
      label: 'Capacity profile',
      help: 'Capacity profile suggested with this template.'
    },
    'scheduleTemplate.operatingDays': {
      label: 'Operating days',
      help: 'Days of week when this template is normally available.'
    },
    'scheduleTemplate.departureTimeLocal': {
      label: 'Departure local',
      help: 'Default local departure time copied into new flight requests.'
    },
    'scheduleTemplate.arrivalTimeLocal': {
      label: 'Arrival local',
      help: 'Default local arrival time copied into new flight requests.'
    },
    'scheduleTemplate.arrivalDayOffset': {
      label: 'Arrival day offset',
      help: 'Use 0 for same-day arrival or a positive value when arrival is on a later local date.'
    },
    'scheduleTemplate.bookingOpenMinutesBefore': {
      label: 'Booking opens before (minutes)',
      help: 'How many minutes before departure bookings or requests may open.'
    },
    'scheduleTemplate.bookingCloseMinutesBefore': {
      label: 'Booking closes before',
      help: 'How many minutes before departure bookings or requests should close.'
    },
    'scheduleTemplate.effectiveFrom': {
      label: 'Effective from',
      help: 'First date this schedule template is valid.'
    },
    'scheduleTemplate.effectiveUntil': {
      label: 'Effective until',
      help: 'Last date this schedule template is valid, if known.'
    },
    'scheduleTemplate.scheduleNote': {
      label: 'Schedule note',
      help: 'External or planner-facing note about this schedule pattern.'
    },
    'scheduleTemplate.internalOperationalNote': {
      label: 'Internal operational note',
      help: 'Internal operations note used when applying or reviewing this template.'
    },
    'capacityProfile.profileCode': {
      label: 'Profile code',
      help: 'Short capacity profile identifier used by flight requests and templates.'
    },
    'capacityProfile.profileName': {
      label: 'Profile name',
      help: 'Readable profile name shown to planners.'
    },
    'capacityProfile.aircraftId': {
      label: 'Aircraft',
      help: 'Aircraft this capacity rule applies to.'
    },
    'capacityProfile.routeId': {
      label: 'Route',
      help: 'Route this capacity rule applies to.'
    },
    'capacityProfile.serviceTypeId': {
      label: 'Operation type',
      help: 'Service type this capacity rule applies to.'
    },
    'capacityProfile.seatCapacity': {
      label: 'Total seats',
      help: 'Seat capacity available before blocked seats are subtracted.'
    },
    'capacityProfile.cargoCapacityKg': {
      label: 'Maximum cargo capacity',
      help: 'Cargo capacity available before reserved operational cargo is subtracted.'
    },
    'capacityProfile.reservedSeatCount': {
      label: 'Blocked seats',
      help: 'Seats held back for crew, safety, medevac equipment, or operational reasons.'
    },
    'capacityProfile.reservedCargoKg': {
      label: 'Reserved operational cargo',
      help: 'Cargo weight reserved for operational load before sellable/requestable capacity.'
    },
    'capacityProfile.capacityNote': {
      label: 'Capacity note',
      help: 'Planner note explaining capacity assumptions or restrictions.'
    },
    'flightReason.reasonCode': {
      label: 'Reason code',
      help: 'Short reason identifier used in flight lifecycle audit and reporting.'
    },
    'flightReason.reasonName': {
      label: 'Reason name',
      help: 'Readable reason shown when users record delays, cancellations, diversions, or corrections.'
    },
    'flightReason.reasonType': {
      label: 'Reason type',
      help: 'Flight lifecycle event this reason applies to.'
    },
    'flightReason.category': {
      label: 'Category',
      help: 'Operational grouping for reporting and filtering.'
    },
    'flightReason.description': {
      label: 'Description',
      help: 'Explanation shown to users when selecting this reason.'
    },
    'flightReason.requiresNote': {
      label: 'Require operator note',
      help: 'Requires the user to enter an explanation when this reason is selected.'
    },
    'flightReason.affectsOperationalKpi': {
      label: 'Operational KPI impact',
      help: 'Marks this reason as affecting operational performance reporting.'
    },
    'flightReason.affectsFinanceReview': {
      label: 'Require finance review',
      help: 'Flags events with this reason for finance follow-up.'
    },
    'flightReason.dashboardSeverity': {
      label: 'Operational severity',
      help: 'Severity used by dashboards and operational alerts.'
    }
  },
  id: {
    'station.stationCode': {
      label: 'Kode stasiun',
      help: 'Identifier singkat stasiun untuk rute, jadwal, dan planning penerbangan.'
    },
    'station.stationName': {
      label: 'Nama stasiun',
      help: 'Nama lengkap stasiun atau airfield yang tampil untuk user operasi.'
    },
    'station.airportType': {
      label: 'Tipe airport',
      help: 'Mengelompokkan titik ini sebagai airport, airstrip, atau STOL airfield untuk planning rute.'
    },
    'station.city': {
      label: 'Kota atau region',
      help: 'Area lokal untuk mengidentifikasi lokasi stasiun.'
    },
    'station.province': {
      label: 'Provinsi',
      help: 'Provinsi atau wilayah untuk filtering dan reporting stasiun.'
    },
    'station.stationPicName': {
      label: 'PIC stasiun',
      help: 'Kontak utama stasiun untuk koordinasi ground.'
    },
    'station.stationPicPhone': {
      label: 'Telepon PIC',
      help: 'Nomor telepon kontak stasiun untuk koordinasi operasional.'
    },
    'station.operationalNotes': {
      label: 'Catatan operasional',
      help: 'Constraint stasiun, konteks handling, atau catatan operasi lokal.'
    },
    'station.isRemoteStation': {
      label: 'Stasiun remote',
      help: 'Menandai stasiun dengan constraint operasi area remote.'
    },
    'station.lowConnectivityMode': {
      label: 'Koneksi rendah',
      help: 'Menandai stasiun yang konfirmasi digitalnya bisa terlambat atau intermittent.'
    },
    'station.hasFuelService': {
      label: 'Layanan fuel',
      help: 'Menandai apakah uplift fuel bisa direncanakan di stasiun ini.'
    },
    'station.hasHandlingService': {
      label: 'Layanan handling',
      help: 'Menandai apakah ground handling tersedia di stasiun ini.'
    },
    'station.hasParkingService': {
      label: 'Layanan parking',
      help: 'Menandai apakah parking pesawat bisa diatur di stasiun ini.'
    },
    'route.routeCode': {
      label: 'Kode rute',
      help: 'Identifier rute untuk flight request, jadwal, tarif, dan readiness check.'
    },
    'route.origin': {
      label: 'Origin',
      help: 'Stasiun keberangkatan untuk rute ini.'
    },
    'route.destination': {
      label: 'Destination',
      help: 'Stasiun kedatangan untuk rute ini.'
    },
    'route.duration': {
      label: 'Durasi menit',
      help: 'Block time rencana dalam menit untuk estimasi ETA dan kelayakan jadwal.'
    },
    'route.distance': {
      label: 'Jarak',
      help: 'Jarak rute dalam kilometer untuk planning, reporting, dan konteks tarif.'
    },
    'route.operationalNotes': {
      label: 'Catatan operasional',
      help: 'Catatan khusus rute seperti terrain, pola cuaca, atau kebutuhan koordinasi.'
    },
    'route.restrictionLevel': {
      label: 'Level restriction',
      help: 'Menentukan apakah rute normal, advisory, atau diblokir untuk planning.'
    },
    'route.restrictionNote': {
      label: 'Catatan restriction',
      help: 'Penjelasan wajib saat rute memiliki advisory atau blocking restriction.'
    },
    'aircraft.registrationNumber': {
      label: 'Nomor registrasi',
      help: 'Registrasi pesawat untuk assignment, readiness, dan tracking operasional.'
    },
    'aircraft.serialNumber': {
      label: 'Serial number / MSN',
      help: 'Nomor serial manufaktur untuk traceability aset.'
    },
    'aircraft.aircraftType': {
      label: 'Tipe pesawat',
      help: 'Tipe pesawat untuk kesesuaian rute, preview tarif, dan laporan operasional.'
    },
    'aircraft.manufacturer': {
      label: 'Manufacturer',
      help: 'Pabrikan pesawat untuk master data dan referensi maintenance.'
    },
    'aircraft.model': {
      label: 'Model',
      help: 'Model atau varian pesawat untuk konteks kapasitas dan fuel planning.'
    },
    'aircraft.fleetCode': {
      label: 'Kode fleet',
      help: 'Pengelompokan fleet internal untuk filtering dan reporting operasi.'
    },
    'aircraft.passengerCapacity': {
      label: 'Kapasitas penumpang',
      help: 'Jumlah seat maksimum sebelum reservasi kapasitas khusus rute diterapkan.'
    },
    'aircraft.cargoCapacityKg': {
      label: 'Kapasitas cargo kg',
      help: 'Kapasitas cargo maksimum dalam kilogram sebelum reservasi khusus rute diterapkan.'
    },
    'aircraft.fuelType': {
      label: 'Tipe fuel',
      help: 'Produk fuel normal pesawat untuk planning uplift.'
    },
    'aircraft.engineCategory': {
      label: 'Kategori engine',
      help: 'Kelas engine untuk interpretasi profil fuel dan asumsi operasi.'
    },
    'aircraft.usableFuelCapacityLitre': {
      label: 'Kapasitas fuel usable L',
      help: 'Jumlah fuel usable dalam liter untuk konteks range dan uplift.'
    },
    'aircraft.fuelCapacityBasis': {
      label: 'Basis kapasitas fuel',
      help: 'Menjelaskan apakah kapasitas adalah usable fuel atau total tank capacity.'
    },
    'aircraft.cruiseFuelBurnLitrePerHour': {
      label: 'Cruise burn L/jam',
      help: 'Estimasi fuel burn saat cruise untuk kalkulasi fuel advisory.'
    },
    'aircraft.holdingFuelBurnLitrePerHour': {
      label: 'Holding burn L/jam',
      help: 'Estimasi fuel burn saat holding untuk planning contingency.'
    },
    'aircraft.taxiFuelBurnLitrePerHour': {
      label: 'Taxi burn L/jam',
      help: 'Estimasi fuel burn saat taxi untuk kalkulasi fuel advisory.'
    },
    'aircraft.fuelProfileSource': {
      label: 'Sumber profil fuel',
      help: 'Sumber profil fuel seperti AFM, POH, tabel approved, estimasi historis, atau data demo.'
    },
    'aircraft.fuelProfileEffectiveFrom': {
      label: 'Profil fuel efektif dari',
      help: 'Tanggal mulai profil fuel ini dianggap berlaku.'
    },
    'aircraft.fuelProfileReference': {
      label: 'Referensi profil fuel',
      help: 'Dokumen, tabel, revisi, atau catatan yang menjadi dasar profil fuel.'
    },
    'aircraft.fuelProfileAdvisoryOnly': {
      label: 'Profil fuel hanya advisory',
      help: 'Menandai kalkulasi fuel sebagai panduan planning, bukan limit operasional approved.'
    },
    'aircraft.defaultCapacityProfileId': {
      label: 'Profil kapasitas default',
      help: 'Aturan kapasitas default yang disarankan saat pesawat ini dipilih di flight request.'
    },
    'aircraft.operationalStatus': {
      label: 'Status operasional',
      help: 'Menentukan apakah pesawat aktif, inactive, atau retired dalam planning operasi.'
    },
    'aircraft.serviceabilityStatus': {
      label: 'Serviceability',
      help: 'Status readiness maintenance terkini yang dicek saat assignment pesawat.'
    },
    'aircraft.baseStationId': {
      label: 'Home base',
      help: 'Base station normal untuk konteks positioning dan operasi.'
    },
    'aircraft.currentStationId': {
      label: 'Stasiun saat ini',
      help: 'Stasiun terakhir pesawat untuk readiness check flight request.'
    },
    'aircraft.lastMaintenanceCheckAt': {
      label: 'Tanggal inspeksi terakhir',
      help: 'Tanggal inspeksi maintenance terakhir yang tampil di konteks readiness.'
    },
    'aircraft.nextMaintenanceDueAt': {
      label: 'Tanggal maintenance berikutnya',
      help: 'Tanggal maintenance due berikutnya untuk warning serviceability.'
    },
    'aircraft.serviceabilityNote': {
      label: 'Catatan restriction operasional atau maintenance',
      help: 'Penjelasan untuk status pesawat yang tidak serviceable atau restricted.'
    },
    'personnel.employeeCode': {
      label: 'Kode pegawai',
      help: 'Identifier personel internal untuk assignment kru dan audit trail.'
    },
    'personnel.fullName': {
      label: 'Nama lengkap legal',
      help: 'Nama kru yang tampil di assignment flight request dan readiness screen.'
    },
    'personnel.crewRole': {
      label: 'Role kru',
      help: 'Role operasional untuk filter kandidat PIC, co-pilot, cabin, dan ground crew.'
    },
    'personnel.licenseType': {
      label: 'Tipe lisensi utama',
      help: 'Tipe lisensi utama untuk eligibility check pilot.'
    },
    'personnel.licenseNumber': {
      label: 'Nomor lisensi utama',
      help: 'Nomor referensi lisensi utama dalam record kru.'
    },
    'personnel.licenseExpiryDate': {
      label: 'Masa berlaku lisensi',
      help: 'Tanggal expiry lisensi untuk warning assignment kru yang tidak valid.'
    },
    'personnel.medicalExpiryDate': {
      label: 'Masa berlaku sertifikat medis',
      help: 'Tanggal expiry sertifikat medis untuk readiness kru terbang.'
    },
    'personnel.baseStationId': {
      label: 'Base station',
      help: 'Base station normal untuk konteks assignment dan positioning kru.'
    },
    'personnel.availabilityStatus': {
      label: 'Availability',
      help: 'Status availability personel untuk filter kandidat kru.'
    },
    'personnel.dutyStationId': {
      label: 'Duty station',
      help: 'Duty station saat ini untuk memahami positioning kru.'
    },
    'personnel.readinessNote': {
      label: 'Catatan operasional',
      help: 'Catatan readiness khusus kru yang terlihat oleh user operasi.'
    },
    'personnel.departmentId': {
      label: 'Unit',
      help: 'Unit organisasi untuk ownership, reporting, dan filtering.'
    },
    'personnel.employmentStatus': {
      label: 'Status employment',
      help: 'Status employment untuk mengeluarkan personel inactive dari planning.'
    },
    'scheduleTemplate.templateCode': {
      label: 'Kode template',
      help: 'Identifier jadwal reusable saat mengisi flight request.'
    },
    'scheduleTemplate.routeId': {
      label: 'Rute',
      help: 'Rute yang digunakan oleh template jadwal ini.'
    },
    'scheduleTemplate.serviceTypeId': {
      label: 'Tipe layanan',
      help: 'Model layanan flight yang akan dibuat dari template ini.'
    },
    'scheduleTemplate.defaultAircraftId': {
      label: 'Pesawat default',
      help: 'Pesawat yang disarankan saat template jadwal ini dipakai.'
    },
    'scheduleTemplate.capacityProfileId': {
      label: 'Profil kapasitas',
      help: 'Profil kapasitas yang disarankan bersama template ini.'
    },
    'scheduleTemplate.operatingDays': {
      label: 'Hari operasi',
      help: 'Hari dalam seminggu saat template ini biasanya tersedia.'
    },
    'scheduleTemplate.departureTimeLocal': {
      label: 'Keberangkatan lokal',
      help: 'Jam keberangkatan lokal default yang disalin ke flight request baru.'
    },
    'scheduleTemplate.arrivalTimeLocal': {
      label: 'Kedatangan lokal',
      help: 'Jam kedatangan lokal default yang disalin ke flight request baru.'
    },
    'scheduleTemplate.arrivalDayOffset': {
      label: 'Offset hari kedatangan',
      help: 'Gunakan 0 untuk tiba di hari yang sama atau nilai positif bila tiba di tanggal lokal berikutnya.'
    },
    'scheduleTemplate.bookingOpenMinutesBefore': {
      label: 'Booking dibuka sebelum (menit)',
      help: 'Berapa menit sebelum keberangkatan booking atau request mulai dibuka.'
    },
    'scheduleTemplate.bookingCloseMinutesBefore': {
      label: 'Booking ditutup sebelum',
      help: 'Berapa menit sebelum keberangkatan booking atau request ditutup.'
    },
    'scheduleTemplate.effectiveFrom': {
      label: 'Efektif dari',
      help: 'Tanggal pertama template jadwal ini berlaku.'
    },
    'scheduleTemplate.effectiveUntil': {
      label: 'Efektif sampai',
      help: 'Tanggal terakhir template jadwal ini berlaku, bila diketahui.'
    },
    'scheduleTemplate.scheduleNote': {
      label: 'Catatan jadwal',
      help: 'Catatan untuk planner atau pihak eksternal tentang pola jadwal ini.'
    },
    'scheduleTemplate.internalOperationalNote': {
      label: 'Catatan operasional internal',
      help: 'Catatan internal operasi saat memakai atau mereview template ini.'
    },
    'capacityProfile.profileCode': {
      label: 'Kode profil',
      help: 'Identifier singkat profil kapasitas untuk flight request dan template.'
    },
    'capacityProfile.profileName': {
      label: 'Nama profil',
      help: 'Nama profil yang mudah dibaca oleh planner.'
    },
    'capacityProfile.aircraftId': {
      label: 'Pesawat',
      help: 'Pesawat yang memakai aturan kapasitas ini.'
    },
    'capacityProfile.routeId': {
      label: 'Rute',
      help: 'Rute yang memakai aturan kapasitas ini.'
    },
    'capacityProfile.serviceTypeId': {
      label: 'Tipe operasi',
      help: 'Tipe layanan yang memakai aturan kapasitas ini.'
    },
    'capacityProfile.seatCapacity': {
      label: 'Total seat',
      help: 'Kapasitas seat sebelum blocked seats dikurangi.'
    },
    'capacityProfile.cargoCapacityKg': {
      label: 'Kapasitas cargo maksimum',
      help: 'Kapasitas cargo sebelum reserved operational cargo dikurangi.'
    },
    'capacityProfile.reservedSeatCount': {
      label: 'Blocked seats',
      help: 'Seat yang ditahan untuk kru, safety, peralatan medevac, atau alasan operasional.'
    },
    'capacityProfile.reservedCargoKg': {
      label: 'Reserved operational cargo',
      help: 'Bobot cargo yang dicadangkan untuk load operasional sebelum kapasitas requestable.'
    },
    'capacityProfile.capacityNote': {
      label: 'Catatan kapasitas',
      help: 'Catatan planner yang menjelaskan asumsi atau restriction kapasitas.'
    },
    'flightReason.reasonCode': {
      label: 'Kode reason',
      help: 'Identifier singkat reason untuk audit lifecycle flight dan reporting.'
    },
    'flightReason.reasonName': {
      label: 'Nama reason',
      help: 'Reason yang tampil saat user mencatat delay, cancellation, diversion, atau correction.'
    },
    'flightReason.reasonType': {
      label: 'Tipe reason',
      help: 'Event lifecycle flight yang memakai reason ini.'
    },
    'flightReason.category': {
      label: 'Kategori',
      help: 'Pengelompokan operasional untuk reporting dan filtering.'
    },
    'flightReason.description': {
      label: 'Deskripsi',
      help: 'Penjelasan yang tampil saat user memilih reason ini.'
    },
    'flightReason.requiresNote': {
      label: 'Wajib catatan operator',
      help: 'Mewajibkan user mengisi penjelasan saat reason ini dipilih.'
    },
    'flightReason.affectsOperationalKpi': {
      label: 'Berdampak KPI operasional',
      help: 'Menandai reason ini mempengaruhi reporting performa operasional.'
    },
    'flightReason.affectsFinanceReview': {
      label: 'Wajib review finance',
      help: 'Menandai event dengan reason ini untuk follow-up finance.'
    },
    'flightReason.dashboardSeverity': {
      label: 'Severity operasional',
      help: 'Severity yang dipakai dashboard dan alert operasional.'
    }
  }
} as const satisfies Record<'en' | 'id', MasterDataCopy>;

function titleFromField(field: string) {
  const raw = field.split('.').at(-1) ?? field;
  return raw
    .replace(/Id$/u, '')
    .replace(/([A-Z])/gu, ' $1')
    .replace(/^./u, (letter) => letter.toUpperCase());
}

export function useMasterDataFieldHelp() {
  const { locale } = useI18n();

  function meta(field: string) {
    const localized = (masterDataHelpCopy[locale.value] as MasterDataCopy)[field];
    const fallback = (masterDataHelpCopy.en as MasterDataCopy)[field];
    return (
      localized ??
      fallback ?? {
        label: titleFromField(field),
        help: locale.value === 'id' ? 'Konteks field master data.' : 'Master data field context.'
      }
    );
  }

  function label(field: string) {
    return meta(field).label;
  }

  function help(field: string) {
    return meta(field).help;
  }

  return {
    help,
    label,
    meta
  };
}

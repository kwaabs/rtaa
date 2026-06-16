package models

import "github.com/uptrace/bun"

// ─── ECG (Electricity Company of Ghana) Network Models ────────────────────────
//
// All source objects are ArcSDE enterprise views (suffix _evw).
// Geometry column : the_geom (PostGIS geometry)
// Primary key     : ogc_fid  OR  objectid (bigint, nullable — views only)
// Common audit    : globalid, created_user, created_date, last_edited_user, last_edited_date
//
// These models support typed BUN queries beyond the generic GeoJSON endpoint.
// The FeaturesHandler serves GeoJSON using raw ST_AsGeoJSON queries driven by
// meta.layer_configs, so you do NOT need to add every table here — only those
// requiring custom business logic.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared embedded structs ───────────────────────────────────────────────────

// AuditFields holds the standard ArcSDE audit columns.
type AuditFields struct {
	GlobalID       *string `bun:"globalid"          json:"globalid,omitempty"`
	CreatedUser    *string `bun:"created_user"      json:"created_user,omitempty"`
	CreatedDate    *string `bun:"created_date"      json:"created_date,omitempty"`
	LastEditedUser *string `bun:"last_edited_user"  json:"last_edited_user,omitempty"`
	LastEditedDate *string `bun:"last_edited_date"  json:"last_edited_date,omitempty"`
}

// LocationFields holds the regional hierarchy present in most network views.
type LocationFields struct {
	Region         *string `bun:"region"            json:"region,omitempty"`
	District       *string `bun:"district"          json:"district,omitempty"`
	SubstationName *string `bun:"substation_name"   json:"substation_name,omitempty"`
	CircuitID      *string `bun:"circuit_id"        json:"circuit_id,omitempty"`
}

// EquipmentFields holds manufacturer / asset registration fields.
type EquipmentFields struct {
	Manufacturer          *string `bun:"manufacturer"            json:"manufacturer,omitempty"`
	OtherManufacturer     *string `bun:"other_manufacturer"      json:"other_manufacturer,omitempty"`
	SerialNumber          *string `bun:"serial_number"           json:"serial_number,omitempty"`
	ManufacturerModelNum  *string `bun:"manufacturer_model_number" json:"manufacturer_model_number,omitempty"`
	YearOfManufacture     *int64  `bun:"year_of_manufacture"     json:"year_of_manufacture,omitempty"`
	ConditionComments     *string `bun:"condition_comments"      json:"condition_comments,omitempty"`
}

// ─── OVERHEAD CONDUCTORS ─────────────────────────────────────────────────────

// OHConductor33kV maps dbo_oh_conductor_33kv_evw (LineString).
type OHConductor33kV struct {
	bun.BaseModel `bun:"dbo_oh_conductor_33kv_evw,alias:oh33"`
	OgcFID             *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID           *int64  `bun:"objectid"               json:"objectid,omitempty"`
	ConductorSize      *string `bun:"conductor_size"         json:"conductor_size,omitempty"`
	Phase              *string `bun:"phase"                  json:"phase,omitempty"`
	PhaseConfiguration *string `bun:"phase_configuration"    json:"phase_configuration,omitempty"`
	LengthInMeters     *float64 `bun:"length_in_meters"      json:"length_in_meters,omitempty"`
	Geom               []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// OHConductor11kV maps dbo_oh_conductor_11kv_evw (LineString).
type OHConductor11kV struct {
	bun.BaseModel `bun:"dbo_oh_conductor_11kv_evw,alias:oh11"`
	OgcFID             *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID           *int64   `bun:"objectid"               json:"objectid,omitempty"`
	ConductorSize      *string  `bun:"conductor_size"         json:"conductor_size,omitempty"`
	Phase              *string  `bun:"phase"                  json:"phase,omitempty"`
	PhaseConfiguration *string  `bun:"phase_configuration"    json:"phase_configuration,omitempty"`
	LengthInMeters     *float64 `bun:"length_in_meters"       json:"length_in_meters,omitempty"`
	Geom               []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// OHConductorLVLE maps dbo_oh_conductor_lvle_evw (LineString).
type OHConductorLVLE struct {
	bun.BaseModel `bun:"dbo_oh_conductor_lvle_evw,alias:ohlv"`
	OgcFID             *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID           *int64   `bun:"objectid"               json:"objectid,omitempty"`
	ConductorSize      *string  `bun:"conductor_size"         json:"conductor_size,omitempty"`
	Phase              *string  `bun:"phase"                  json:"phase,omitempty"`
	PhaseConfiguration *string  `bun:"phase_configuration"    json:"phase_configuration,omitempty"`
	LengthInMeters     *float64 `bun:"length_in_meters"       json:"length_in_meters,omitempty"`
	Geom               []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// ─── UNDERGROUND CABLES ──────────────────────────────────────────────────────

// UGCable33kV maps dbo_ug_cable_33kv_evw (LineString).
type UGCable33kV struct {
	bun.BaseModel `bun:"dbo_ug_cable_33kv_evw,alias:ug33"`
	OgcFID             *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID           *int64   `bun:"objectid"               json:"objectid,omitempty"`
	CableSize          *string  `bun:"cable_size"             json:"cable_size,omitempty"`
	Phase              *string  `bun:"phase"                  json:"phase,omitempty"`
	PhaseConfiguration *string  `bun:"phase_configuration"    json:"phase_configuration,omitempty"`
	LengthInMeters     *float64 `bun:"length_in_meters"       json:"length_in_meters,omitempty"`
	Depth              *float64 `bun:"depth"                  json:"depth,omitempty"`
	Geom               []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// UGCable11kV maps dbo_ug_cable_11kv_evw (LineString).
type UGCable11kV struct {
	bun.BaseModel `bun:"dbo_ug_cable_11kv_evw,alias:ug11"`
	OgcFID             *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID           *int64   `bun:"objectid"               json:"objectid,omitempty"`
	CableSize          *string  `bun:"cable_size"             json:"cable_size,omitempty"`
	Phase              *string  `bun:"phase"                  json:"phase,omitempty"`
	PhaseConfiguration *string  `bun:"phase_configuration"    json:"phase_configuration,omitempty"`
	LengthInMeters     *float64 `bun:"length_in_meters"       json:"length_in_meters,omitempty"`
	Depth              *float64 `bun:"depth"                  json:"depth,omitempty"`
	Geom               []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// UGCableLVLE maps dbo_ug_cable_lvle_evw (LineString).
type UGCableLVLE struct {
	bun.BaseModel `bun:"dbo_ug_cable_lvle_evw,alias:uglv"`
	OgcFID                        *int64   `bun:"ogc_fid"                           json:"ogc_fid,omitempty"`
	ObjectID                      *int64   `bun:"objectid"                          json:"objectid,omitempty"`
	DistributionTransformerUnique *string  `bun:"distribution_transformer_unique"   json:"distribution_transformer_unique,omitempty"`
	OriginatingNodeID             *string  `bun:"originating_node_id"               json:"originating_node_id,omitempty"`
	LegID                         *string  `bun:"leg_id"                            json:"leg_id,omitempty"`
	EndNodeID                     *string  `bun:"end_node_id"                       json:"end_node_id,omitempty"`
	LengthInMeters                *float64 `bun:"length_in_meters"                  json:"length_in_meters,omitempty"`
	EndConnectionType             *string  `bun:"end_connection_type"               json:"end_connection_type,omitempty"`
	EndConnectionConfiguration    *string  `bun:"end_connection_configuration"      json:"end_connection_configuration,omitempty"`
	CableSize                     *string  `bun:"cable_size"                        json:"cable_size,omitempty"`
	Depth                         *float64 `bun:"depth"                             json:"depth,omitempty"`
	Phase                         *string  `bun:"phase"                             json:"phase,omitempty"`
	PhaseConfiguration            *string  `bun:"phase_configuration"               json:"phase_configuration,omitempty"`
	FibreOpticConductorAttached   *string  `bun:"fibre_optic_conductor_attached"    json:"fibre_optic_conductor_attached,omitempty"`
	FibreOpticConductorType       *string  `bun:"fibre_optic_conductor_type"        json:"fibre_optic_conductor_type,omitempty"`
	CvExposedSections             *int64   `bun:"cv_exposed_sections"               json:"cv_exposed_sections,omitempty"`
	ConditionComments             *string  `bun:"condition_comments"                json:"condition_comments,omitempty"`
	Geom                          []byte   `bun:"the_geom,type:geometry"            json:"-"`
	LocationFields
	AuditFields
}

// ServiceLineLVLE maps dbo_service_line_lvle_evw (LineString).
type ServiceLineLVLE struct {
	bun.BaseModel `bun:"dbo_service_line_lvle_evw,alias:sl"`
	OgcFID         *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID       *int64   `bun:"objectid"               json:"objectid,omitempty"`
	CableSize      *string  `bun:"cable_size"             json:"cable_size,omitempty"`
	Phase          *string  `bun:"phase"                  json:"phase,omitempty"`
	LengthInMeters *float64 `bun:"length_in_meters"       json:"length_in_meters,omitempty"`
	Geom           []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// ─── OVERHEAD SUPPORT STRUCTURES ─────────────────────────────────────────────

// OHSupportStructure33kV maps dbo_oh_support_structure_33kv_evw (Point).
type OHSupportStructure33kV struct {
	bun.BaseModel `bun:"dbo_oh_support_structure_33kv_evw,alias:oss33"`
	OgcFID        *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID      *int64  `bun:"objectid"               json:"objectid,omitempty"`
	StructureType *string `bun:"structure_type"         json:"structure_type,omitempty"`
	Height        *string `bun:"height"                 json:"height,omitempty"`
	Material      *string `bun:"material"               json:"material,omitempty"`
	Geom          []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// OHSupportStructure11kV maps dbo_oh_support_structure_11kv_evw (Point).
type OHSupportStructure11kV struct {
	bun.BaseModel `bun:"dbo_oh_support_structure_11kv_evw,alias:oss11"`
	OgcFID        *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID      *int64  `bun:"objectid"               json:"objectid,omitempty"`
	StructureType *string `bun:"structure_type"         json:"structure_type,omitempty"`
	Height        *string `bun:"height"                 json:"height,omitempty"`
	Material      *string `bun:"material"               json:"material,omitempty"`
	Geom          []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// OHSupportStructureLVLE maps dbo_oh_support_structure_lvle_evw (Point).
type OHSupportStructureLVLE struct {
	bun.BaseModel `bun:"dbo_oh_support_structure_lvle_evw,alias:osslv"`
	OgcFID        *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID      *int64  `bun:"objectid"               json:"objectid,omitempty"`
	StructureType *string `bun:"structure_type"         json:"structure_type,omitempty"`
	Height        *string `bun:"height"                 json:"height,omitempty"`
	Material      *string `bun:"material"               json:"material,omitempty"`
	Geom          []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// ─── TRANSFORMERS ─────────────────────────────────────────────────────────────

// PowerTransformer maps dbo_power_transformer_evw (Point).
type PowerTransformer struct {
	bun.BaseModel `bun:"dbo_power_transformer_evw,alias:pt"`
	OgcFID              *int64   `bun:"ogc_fid"                 json:"ogc_fid,omitempty"`
	ObjectID            *int64   `bun:"objectid"                json:"objectid,omitempty"`
	RatedMVA            *float64 `bun:"rated_mva"               json:"rated_mva,omitempty"`
	PrimaryVoltage      *float64 `bun:"primary_voltage"         json:"primary_voltage,omitempty"`
	SecondaryVoltage    *float64 `bun:"secondary_voltage"       json:"secondary_voltage,omitempty"`
	VectorGroup         *string  `bun:"vector_group"            json:"vector_group,omitempty"`
	CoolingType         *string  `bun:"cooling_type"            json:"cooling_type,omitempty"`
	Geom                []byte   `bun:"the_geom,type:geometry"  json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// DistributionTransformerDSS maps dbo_distribution_transformer_dss_evw (Point).
type DistributionTransformerDSS struct {
	bun.BaseModel `bun:"dbo_distribution_transformer_dss_evw,alias:dtdss"`
	OgcFID           *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID         *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedKVA         *float64 `bun:"rated_kva"              json:"rated_kva,omitempty"`
	PrimaryVoltage   *float64 `bun:"primary_voltage"        json:"primary_voltage,omitempty"`
	SecondaryVoltage *float64 `bun:"secondary_voltage"      json:"secondary_voltage,omitempty"`
	VectorGroup      *string  `bun:"vector_group"           json:"vector_group,omitempty"`
	Geom             []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// StationTransformer maps dbo_station_transformer_evw (Point).
type StationTransformer struct {
	bun.BaseModel `bun:"dbo_station_transformer_evw,alias:st"`
	OgcFID  *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64 `bun:"objectid"               json:"objectid,omitempty"`
	Geom    []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// EarthingTransformer maps dbo_earthing_transformer_evw (Point).
type EarthingTransformer struct {
	bun.BaseModel `bun:"dbo_earthing_transformer_evw,alias:et"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// VoltageTransformer maps dbo_voltage_transformer_evw (Point).
type VoltageTransformer struct {
	bun.BaseModel `bun:"dbo_voltage_transformer_evw,alias:vt"`
	OgcFID              *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID            *int64   `bun:"objectid"               json:"objectid,omitempty"`
	VtRatio             *string  `bun:"vt_ratio"               json:"vt_ratio,omitempty"`
	Phase               *string  `bun:"phase"                  json:"phase,omitempty"`
	RatedVoltage        *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	MeteringClass       *float64 `bun:"metering_class"         json:"metering_class,omitempty"`
	ProtectionClass     *string  `bun:"protection_class"       json:"protection_class,omitempty"`
	VtBurden            *int64   `bun:"vt_burden"              json:"vt_burden,omitempty"`
	Geom                []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// CurrentTransformer maps dbo_current_transformer_evw (Point).
type CurrentTransformer struct {
	bun.BaseModel `bun:"dbo_current_transformer_evw,alias:ct"`
	OgcFID          *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID        *int64  `bun:"objectid"               json:"objectid,omitempty"`
	CtRatio         *string `bun:"ct_ratio"               json:"ct_ratio,omitempty"`
	Phase           *string `bun:"phase"                  json:"phase,omitempty"`
	AccuracyClass   *string `bun:"accuracy_class"         json:"accuracy_class,omitempty"`
	ProtectionClass *string `bun:"protection_class"       json:"protection_class,omitempty"`
	Geom            []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// CurrentTransformerDSS maps dbo_current_transformer_dss_evw (Point).
type CurrentTransformerDSS struct {
	bun.BaseModel `bun:"dbo_current_transformer_dss_evw,alias:ctdss"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	CtRatio  *string `bun:"ct_ratio"               json:"ct_ratio,omitempty"`
	Phase    *string `bun:"phase"                  json:"phase,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// ─── SWITCHING EQUIPMENT ──────────────────────────────────────────────────────

// Breaker maps dbo_breaker_evw (Point).
type Breaker struct {
	bun.BaseModel `bun:"dbo_breaker_evw,alias:br"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	RatedCurrent *float64 `bun:"rated_current"          json:"rated_current,omitempty"`
	BreakerType  *string  `bun:"breaker_type"           json:"breaker_type,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// Isolator maps dbo_isolator_evw (Point).
type Isolator struct {
	bun.BaseModel `bun:"dbo_isolator_evw,alias:iso"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	IsolatorType *string  `bun:"isolator_type"          json:"isolator_type,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// LoadBreakSwitch maps dbo_load_break_switch_evw (Point).
type LoadBreakSwitch struct {
	bun.BaseModel `bun:"dbo_load_break_switch_evw,alias:lbs"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// SectionalizerAlt maps dbo_sectionalizer_evw_ (trailing-underscore variant, Point).
type SectionalizerAlt struct {
	bun.BaseModel `bun:"dbo_sectionalizer_evw_,alias:seca"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// Sectionalizer maps dbo_sectionalizer_evw (Point).
type Sectionalizer struct {
	bun.BaseModel `bun:"dbo_sectionalizer_evw,alias:sec"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// PoleAutorecloser maps dbo_pole_mounted_autorecloser_evw (Point).
type PoleAutorecloser struct {
	bun.BaseModel `bun:"dbo_pole_mounted_autorecloser_evw,alias:par"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// CircuitSwitchDSS maps dbo_circuit_switches_dss_evw (Point).
type CircuitSwitchDSS struct {
	bun.BaseModel `bun:"dbo_circuit_switches_dss_evw,alias:csdss"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// Busbar maps dbo_busbar_evw (Point).
type Busbar struct {
	bun.BaseModel `bun:"dbo_busbar_evw,alias:bb"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	Material     *string  `bun:"material"               json:"material,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// ─── CAPACITORS & EARTHING ────────────────────────────────────────────────────

// CapacitorBank maps dbo_capacitor_bank_evw (Point).
type CapacitorBank struct {
	bun.BaseModel `bun:"dbo_capacitor_bank_evw,alias:cb"`
	OgcFID   *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedKVAR *float64 `bun:"rated_kvar"            json:"rated_kvar,omitempty"`
	Geom     []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// Capacitor33kV11kV maps dbo_capacitor_33kv_11kv_evw (Point).
type Capacitor33kV11kV struct {
	bun.BaseModel `bun:"dbo_capacitor_33kv_11kv_evw,alias:cap"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// EarthingResistor maps dbo_earthing_resistor_evw (Point).
type EarthingResistor struct {
	bun.BaseModel `bun:"dbo_earthing_resistor_evw,alias:er"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// Arrester maps dbo_arrester_evw (Point).
type Arrester struct {
	bun.BaseModel `bun:"dbo_arrester_evw,alias:arr"`
	OgcFID       *int64   `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID     *int64   `bun:"objectid"               json:"objectid,omitempty"`
	RatedVoltage *float64 `bun:"rated_voltage"          json:"rated_voltage,omitempty"`
	ArresterType *string  `bun:"arrester_type"          json:"arrester_type,omitempty"`
	Geom         []byte   `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// ─── PROTECTION & CONTROL ─────────────────────────────────────────────────────

// ProtectionRelay maps dbo_protection_relay_evw (Point).
type ProtectionRelay struct {
	bun.BaseModel `bun:"dbo_protection_relay_evw,alias:pr"`
	OgcFID    *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID  *int64  `bun:"objectid"               json:"objectid,omitempty"`
	RelayType *string `bun:"relay_type"             json:"relay_type,omitempty"`
	Geom      []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// RemoteRelay maps dbo_remote_relay_evw (Point).
type RemoteRelay struct {
	bun.BaseModel `bun:"dbo_remote_relay_evw,alias:rr"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// SCADADevice maps dbo_scada_device_evw (Point).
type SCADADevice struct {
	bun.BaseModel `bun:"dbo_scada_device_evw,alias:scada"`
	OgcFID     *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID   *int64  `bun:"objectid"               json:"objectid,omitempty"`
	DeviceType *string `bun:"device_type"            json:"device_type,omitempty"`
	Geom       []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// SCADADeviceDSS maps dbo_scada_device_dss_evw (Point).
type SCADADeviceDSS struct {
	bun.BaseModel `bun:"dbo_scada_device_dss_evw,alias:scadadss"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// SwitchGearPanel maps dbo_switch_gear_panel_evw (Point).
type SwitchGearPanel struct {
	bun.BaseModel `bun:"dbo_switch_gear_panel_evw,alias:sgp"`
	OgcFID    *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID  *int64  `bun:"objectid"               json:"objectid,omitempty"`
	PanelType *string `bun:"panel_type"             json:"panel_type,omitempty"`
	Geom      []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// TapChangerControlPanel maps dbo_tap_changer_control_panel_evw (Point).
type TapChangerControlPanel struct {
	bun.BaseModel `bun:"dbo_tap_changer_control_panel_evw,alias:tccp"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// RemoteControlPanel maps dbo_remote_control_panel_evw (Point).
type RemoteControlPanel struct {
	bun.BaseModel `bun:"dbo_remote_control_panel_evw,alias:rcp"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// MarshallingKiosk maps dbo_marshalling_kiosk_evw (Point).
type MarshallingKiosk struct {
	bun.BaseModel `bun:"dbo_marshalling_kiosk_evw,alias:mk"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// ─── BUILDINGS & FACILITIES ───────────────────────────────────────────────────

// ControlBuilding maps dbo_control_building_evw (Point).
type ControlBuilding struct {
	bun.BaseModel `bun:"dbo_control_building_evw,alias:cbld"`
	OgcFID           *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID         *int64  `bun:"objectid"               json:"objectid,omitempty"`
	BuildingType     *string `bun:"building_type"          json:"building_type,omitempty"`
	ConstructionYear *int64  `bun:"construction_year"      json:"construction_year,omitempty"`
	Geom             []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// ControlBuildingDSS maps dbo_control_building_dss_evw (Point).
type ControlBuildingDSS struct {
	bun.BaseModel `bun:"dbo_control_building_dss_evw,alias:cbdss"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	AuditFields
}

// DistributionPillarDSS maps dbo_distribution_pillar_dss_evw (Point).
type DistributionPillarDSS struct {
	bun.BaseModel `bun:"dbo_distribution_pillar_dss_evw,alias:dpdss"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// ─── POWER SUPPLY PANELS ──────────────────────────────────────────────────────

// ACDistributionPanel maps dbo_ac_distribution_panel_evw (Point).
type ACDistributionPanel struct {
	bun.BaseModel `bun:"dbo_ac_distribution_panel_evw,alias:acdp"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// DCDistributionPanel maps dbo_dc_distribution_panel_evw (Point).
type DCDistributionPanel struct {
	bun.BaseModel `bun:"dbo_dc_distribution_panel_evw,alias:dcdp"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// BatteryCharger maps dbo_battery_charger_evw (Point).
type BatteryCharger struct {
	bun.BaseModel `bun:"dbo_battery_charger_evw,alias:bch"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// BatteryCell maps dbo_battery_cell_evw (Point).
type BatteryCell struct {
	bun.BaseModel `bun:"dbo_battery_cell_evw,alias:bcl"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// ─── METERING ─────────────────────────────────────────────────────────────────

// CustomerMeter maps dbo_customer_meter_evw (Point).
type CustomerMeter struct {
	bun.BaseModel `bun:"dbo_customer_meter_evw,alias:cm"`
	OgcFID      *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID    *int64  `bun:"objectid"               json:"objectid,omitempty"`
	MeterNumber *string `bun:"meter_number"           json:"meter_number,omitempty"`
	TariffClass *string `bun:"tariff_class"           json:"tariff_class,omitempty"`
	MeterType   *string `bun:"meter_type"             json:"meter_type,omitempty"`
	Geom        []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// CustomerMeterLVLE maps dbo_customer_meter_lvle_evw (Point).
type CustomerMeterLVLE struct {
	bun.BaseModel `bun:"dbo_customer_meter_lvle_evw,alias:cmlv"`
	OgcFID      *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID    *int64  `bun:"objectid"               json:"objectid,omitempty"`
	MeterNumber *string `bun:"meter_number"           json:"meter_number,omitempty"`
	TariffClass *string `bun:"tariff_class"           json:"tariff_class,omitempty"`
	MeterType   *string `bun:"meter_type"             json:"meter_type,omitempty"`
	Geom        []byte  `bun:"the_geom,type:geometry" json:"-"`
	LocationFields
	EquipmentFields
	AuditFields
}

// ─── ADMINISTRATIVE BOUNDARIES ────────────────────────────────────────────────

// ECGRegionsDistricts maps dbo_ecg_operational_regions_and_district_boundaries_10_7_25 (Polygon).
type ECGRegionsDistricts struct {
	bun.BaseModel `bun:"dbo_ecg_operational_regions_and_district_boundaries_10_7_25,alias:ecgrd"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Region   *string `bun:"region"                 json:"region,omitempty"`
	District *string `bun:"district"               json:"district,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	AuditFields
}

// ECGNetworkExtent maps dbo_ecg (Polygon).
type ECGNetworkExtent struct {
	bun.BaseModel `bun:"dbo_ecg,alias:ecg"`
	OgcFID   *int64  `bun:"ogc_fid"                json:"ogc_fid,omitempty"`
	ObjectID *int64  `bun:"objectid"               json:"objectid,omitempty"`
	Geom     []byte  `bun:"the_geom,type:geometry" json:"-"`
	AuditFields
}

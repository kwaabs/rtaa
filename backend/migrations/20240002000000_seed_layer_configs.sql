-- +goose Up
-- +goose StatementBegin

-- ─────────────────────────────────────────────────────────────────────────────
-- ECG (Electricity Company of Ghana) network layer configurations.
-- Every dbo_*_evw table gets an entry here — no layer is hardcoded in the app.
--
-- Colour scheme:
--   33 kV         → red     (#ef4444)
--   11 kV         → orange  (#f97316)
--   LV / LVLE     → amber   (#f59e0b)
--   Transformers  → violet  (#8b5cf6)
--   Switching     → blue    (#3b82f6)
--   Control/SCADA → cyan    (#06b6d4)
--   Metering      → green   (#22c55e)
--   Structures    → gray    (#9ca3af)
--   Boundaries    → teal    (#14b8a6)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO meta.layer_configs
    (name, display_name, description,
     source_table, geom_column, geom_type, layer_type,
     paint_spec, popup_spec,
     min_zoom, max_zoom, is_visible, is_public, sort_order)
VALUES

-- ══════════════════════════════════════════════════════════════════════════════
-- OVERHEAD CONDUCTORS
-- ══════════════════════════════════════════════════════════════════════════════
(
    'oh_conductor_33kv',
    'OH Conductor – 33 kV',
    'Overhead conductors on the 33 kV network',
    'dbo.dbo_oh_conductor_33kv_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#ef4444","line-width":2.5,"line-opacity":0.9}'::jsonb,
    '{"conductor_size":"Conductor Size","phase":"Phase","phase_configuration":"Phase Config",
      "length_in_meters":"Length (m)","condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    10, 22, true, false, 10
),
(
    'oh_conductor_11kv',
    'OH Conductor – 11 kV',
    'Overhead conductors on the 11 kV network',
    'dbo_oh_conductor_11kv_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#f97316","line-width":2,"line-opacity":0.9}'::jsonb,
    '{"conductor_size":"Conductor Size","phase":"Phase","phase_configuration":"Phase Config",
      "length_in_meters":"Length (m)","condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    10, 22, true, false, 11
),
(
    'oh_conductor_lvle',
    'OH Conductor – LV',
    'Overhead low-voltage conductors',
    'dbo_oh_conductor_lvle_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#f59e0b","line-width":1.5,"line-opacity":0.85}'::jsonb,
    '{"conductor_size":"Conductor Size","phase":"Phase","length_in_meters":"Length (m)",
      "condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    12, 22, true, false, 12
),

-- ══════════════════════════════════════════════════════════════════════════════
-- UNDERGROUND CABLES
-- ══════════════════════════════════════════════════════════════════════════════
(
    'ug_cable_33kv',
    'UG Cable – 33 kV',
    'Underground cables on the 33 kV network',
    'dbo_ug_cable_33kv_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#ef4444","line-width":2.5,"line-opacity":0.9,"line-dasharray":[4,2]}'::jsonb,
    '{"cable_size":"Cable Size","phase":"Phase","length_in_meters":"Length (m)",
      "depth":"Depth (m)","condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    10, 22, true, false, 20
),
(
    'ug_cable_11kv',
    'UG Cable – 11 kV',
    'Underground cables on the 11 kV network',
    'dbo_ug_cable_11kv_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#f97316","line-width":2,"line-opacity":0.9,"line-dasharray":[4,2]}'::jsonb,
    '{"cable_size":"Cable Size","phase":"Phase","length_in_meters":"Length (m)",
      "depth":"Depth (m)","condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    10, 22, true, false, 21
),
(
    'ug_cable_lvle',
    'UG Cable – LV',
    'Underground low-voltage cables',
    'dbo_ug_cable_lvle_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#f59e0b","line-width":1.5,"line-opacity":0.85,"line-dasharray":[3,2]}'::jsonb,
    '{"cable_size":"Cable Size","phase":"Phase","length_in_meters":"Length (m)",
      "depth":"Depth (m)","condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    12, 22, true, false, 22
),
(
    'service_line_lvle',
    'Service Line – LV',
    'Low-voltage service lines to customers',
    'dbo_service_line_lvle_evw', 'the_geom', 'LineString', 'line',
    '{"line-color":"#fbbf24","line-width":1,"line-opacity":0.8,"line-dasharray":[2,2]}'::jsonb,
    '{"cable_size":"Cable Size","phase":"Phase","length_in_meters":"Length (m)",
      "condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    14, 22, false, false, 23
),

-- ══════════════════════════════════════════════════════════════════════════════
-- OVERHEAD SUPPORT STRUCTURES
-- ══════════════════════════════════════════════════════════════════════════════
(
    'oh_support_33kv',
    'OH Support Structure – 33 kV',
    'Poles and towers on the 33 kV network',
    'dbo_oh_support_structure_33kv_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#ef4444","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"structure_type":"Structure Type","height":"Height","material":"Material",
      "condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    11, 22, false, false, 30
),
(
    'oh_support_11kv',
    'OH Support Structure – 11 kV',
    'Poles and towers on the 11 kV network',
    'dbo_oh_support_structure_11kv_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#f97316","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"structure_type":"Structure Type","height":"Height","material":"Material",
      "condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    11, 22, false, false, 31
),
(
    'oh_support_lvle',
    'OH Support Structure – LV',
    'Poles on the low-voltage network',
    'dbo_oh_support_structure_lvle_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":3,"circle-color":"#f59e0b","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"structure_type":"Structure Type","height":"Height","material":"Material",
      "condition_comments":"Condition","globalid":"Global ID"}'::jsonb,
    13, 22, false, false, 32
),

-- ══════════════════════════════════════════════════════════════════════════════
-- TRANSFORMERS
-- ══════════════════════════════════════════════════════════════════════════════
(
    'power_transformer',
    'Power Transformer',
    'High-voltage power transformers',
    'dbo_power_transformer_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":8,"circle-color":"#8b5cf6","circle-stroke-color":"#fff",
      "circle-stroke-width":2,"circle-opacity":0.95}'::jsonb,
    '{"substation_name":"Substation","rated_mva":"Rated MVA","primary_voltage":"Primary (kV)",
      "secondary_voltage":"Secondary (kV)","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","year_of_manufacture":"Year","condition_comments":"Condition"}'::jsonb,
    8, 22, true, false, 40
),
(
    'distribution_transformer_dss',
    'Distribution Transformer – DSS',
    'Distribution transformers at distribution substations',
    'dbo_distribution_transformer_dss_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#7c3aed","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_kva":"Rated kVA","primary_voltage":"Primary (kV)",
      "secondary_voltage":"Secondary (kV)","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    10, 22, true, false, 41
),
(
    'station_transformer',
    'Station Transformer',
    'Station service transformers',
    'dbo_station_transformer_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#6d28d9","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_kva":"Rated kVA","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 42
),
(
    'earthing_transformer',
    'Earthing Transformer',
    'Earthing / neutral point transformers',
    'dbo_earthing_transformer_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#7c3aed","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 43
),
(
    'voltage_transformer',
    'Voltage Transformer (VT)',
    'Voltage instrument transformers',
    'dbo_voltage_transformer_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#a78bfa","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","vt_ratio":"VT Ratio","rated_voltage":"Rated Voltage",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "phase":"Phase","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 44
),
(
    'current_transformer',
    'Current Transformer (CT)',
    'Current instrument transformers',
    'dbo_current_transformer_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#a78bfa","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","ct_ratio":"CT Ratio","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","phase":"Phase","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 45
),
(
    'current_transformer_dss',
    'Current Transformer – DSS',
    'Current transformers at distribution substations',
    'dbo_current_transformer_dss_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#a78bfa","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","ct_ratio":"CT Ratio","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 46
),

-- ══════════════════════════════════════════════════════════════════════════════
-- SWITCHING EQUIPMENT
-- ══════════════════════════════════════════════════════════════════════════════
(
    'breaker',
    'Circuit Breaker',
    'Circuit breakers across the network',
    'dbo_breaker_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#3b82f6","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage (kV)",
      "rated_current":"Rated Current (A)","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    9, 22, true, false, 50
),
(
    'isolator',
    'Isolator / Disconnector',
    'Isolators and disconnecting switches',
    'dbo_isolator_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#2563eb","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 51
),
(
    'load_break_switch',
    'Load Break Switch',
    'Load break switches',
    'dbo_load_break_switch_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#1d4ed8","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 52
),
(
    'sectionalizer_alt',
    'Sectionalizer (alt)',
    'Alternate sectionalizer view',
    'dbo_sectionalizer_evw_', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#1e40af","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 53
),
(
    'sectionalizer',
    'Sectionalizer',
    'Automatic sectionalizers on the network',
    'dbo_sectionalizer_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#1e40af","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 53
),
(
    'pole_mounted_autorecloser',
    'Pole-Mounted Autorecloser',
    'Automatic reclosers on the overhead network',
    'dbo_pole_mounted_autorecloser_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#1e3a8a","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, true, false, 54
),
(
    'circuit_switches_dss',
    'Circuit Switches – DSS',
    'Circuit switches at distribution substations',
    'dbo_circuit_switches_dss_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#3b82f6","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","circuit_id":"Circuit",
      "manufacturer":"Manufacturer","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 55
),
(
    'busbar',
    'Busbar',
    'Busbars in substations',
    'dbo_busbar_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#60a5fa","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage",
      "material":"Material","condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 56
),

-- ══════════════════════════════════════════════════════════════════════════════
-- CAPACITOR BANKS
-- ══════════════════════════════════════════════════════════════════════════════
(
    'capacitor_bank',
    'Capacitor Bank',
    'Capacitor banks for reactive power compensation',
    'dbo_capacitor_bank_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#10b981","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_kvar":"Rated KVAR",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    9, 22, true, false, 57
),
(
    'capacitor_33kv_11kv',
    'Capacitor – 33 kV / 11 kV',
    'Capacitors on 33 kV and 11 kV networks',
    'dbo_capacitor_33kv_11kv_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#059669","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage",
      "manufacturer":"Manufacturer","condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 58
),
(
    'earthing_resistor',
    'Earthing Resistor',
    'Neutral earthing resistors',
    'dbo_earthing_resistor_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#6ee7b7","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 59
),
(
    'arrester',
    'Surge Arrester',
    'Lightning and surge arresters',
    'dbo_arrester_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#34d399","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","rated_voltage":"Rated Voltage",
      "manufacturer":"Manufacturer","condition_comments":"Condition"}'::jsonb,
    11, 22, false, false, 60
),

-- ══════════════════════════════════════════════════════════════════════════════
-- PROTECTION & CONTROL
-- ══════════════════════════════════════════════════════════════════════════════
(
    'protection_relay',
    'Protection Relay',
    'Protection relays in switchgear panels',
    'dbo_protection_relay_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#06b6d4","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","relay_type":"Relay Type",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 70
),
(
    'remote_relay',
    'Remote Relay',
    'Remote protection relays',
    'dbo_remote_relay_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#0891b2","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 71
),
(
    'scada_device',
    'SCADA Device',
    'SCADA RTUs and communication devices',
    'dbo_scada_device_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#0e7490","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","device_type":"Device Type",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    8, 22, true, false, 72
),
(
    'scada_device_dss',
    'SCADA Device – DSS',
    'SCADA devices at distribution substations',
    'dbo_scada_device_dss_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#155e75","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 73
),
(
    'switch_gear_panel',
    'Switchgear Panel',
    'Switchgear panel assemblies',
    'dbo_switch_gear_panel_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#0284c7","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","panel_type":"Panel Type",
      "manufacturer":"Manufacturer","serial_number":"Serial No.",
      "condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 74
),
(
    'tap_changer_control_panel',
    'Tap Changer Control Panel',
    'On-load tap changer control panels',
    'dbo_tap_changer_control_panel_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#0369a1","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "serial_number":"Serial No.","condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 75
),
(
    'remote_control_panel',
    'Remote Control Panel',
    'Remote control panels in substations',
    'dbo_remote_control_panel_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#075985","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 76
),
(
    'marshalling_kiosk',
    'Marshalling Kiosk',
    'Cable marshalling kiosks',
    'dbo_marshalling_kiosk_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#0c4a6e","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 77
),

-- ══════════════════════════════════════════════════════════════════════════════
-- BUILDINGS & FACILITIES
-- ══════════════════════════════════════════════════════════════════════════════
(
    'control_building',
    'Control Building',
    'Substation control buildings',
    'dbo_control_building_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":7,"circle-color":"#64748b","circle-stroke-color":"#fff",
      "circle-stroke-width":1.5,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","building_type":"Building Type",
      "construction_year":"Built","condition_comments":"Condition"}'::jsonb,
    8, 22, false, false, 80
),
(
    'control_building_dss',
    'Control Building – DSS',
    'Control buildings at distribution substations',
    'dbo_control_building_dss_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":6,"circle-color":"#475569","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","condition_comments":"Condition"}'::jsonb,
    9, 22, false, false, 81
),
(
    'distribution_pillar_dss',
    'Distribution Pillar – DSS',
    'Low-voltage distribution pillars at substations',
    'dbo_distribution_pillar_dss_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":5,"circle-color":"#94a3b8","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.9}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 82
),

-- ══════════════════════════════════════════════════════════════════════════════
-- POWER SUPPLY PANELS
-- ══════════════════════════════════════════════════════════════════════════════
(
    'ac_distribution_panel',
    'AC Distribution Panel',
    'AC auxiliary distribution panels in substations',
    'dbo_ac_distribution_panel_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#6b7280","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 83
),
(
    'dc_distribution_panel',
    'DC Distribution Panel',
    'DC auxiliary distribution panels in substations',
    'dbo_dc_distribution_panel_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#4b5563","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 84
),
(
    'battery_charger',
    'Battery Charger',
    'Battery charger units in substations',
    'dbo_battery_charger_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":4,"circle-color":"#374151","circle-stroke-color":"#ccc",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 85
),
(
    'battery_cell',
    'Battery Cell',
    'Battery cell banks in substations',
    'dbo_battery_cell_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":3,"circle-color":"#1f2937","circle-stroke-color":"#9ca3af",
      "circle-stroke-width":1,"circle-opacity":0.85}'::jsonb,
    '{"substation_name":"Substation","manufacturer":"Manufacturer",
      "condition_comments":"Condition"}'::jsonb,
    10, 22, false, false, 86
),

-- ══════════════════════════════════════════════════════════════════════════════
-- METERING
-- ══════════════════════════════════════════════════════════════════════════════
(
    'customer_meter',
    'Customer Meter',
    'Customer electricity meters',
    'dbo_customer_meter_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":3,"circle-color":"#22c55e","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.8}'::jsonb,
    '{"meter_number":"Meter No.","tariff_class":"Tariff","meter_type":"Type",
      "manufacturer":"Manufacturer","condition_comments":"Condition"}'::jsonb,
    14, 22, false, false, 90
),
(
    'customer_meter_lvle',
    'Customer Meter – LV Line Extension',
    'Customer meters on LV line extensions',
    'dbo_customer_meter_lvle_evw', 'the_geom', 'Point', 'circle',
    '{"circle-radius":3,"circle-color":"#16a34a","circle-stroke-color":"#fff",
      "circle-stroke-width":1,"circle-opacity":0.8}'::jsonb,
    '{"meter_number":"Meter No.","tariff_class":"Tariff","meter_type":"Type",
      "manufacturer":"Manufacturer","condition_comments":"Condition"}'::jsonb,
    14, 22, false, false, 91
),

-- ══════════════════════════════════════════════════════════════════════════════
-- ADMINISTRATIVE BOUNDARIES
-- ══════════════════════════════════════════════════════════════════════════════
(
    'ecg_regions_districts',
    'ECG Operational Regions & Districts',
    'ECG operational region and district boundaries',
    'dbo_ecg_operational_regions_and_district_boundaries_10_7_25',
    'the_geom', 'Polygon', 'fill',
    '{"fill-color":"#14b8a6","fill-opacity":0.1,"fill-outline-color":"#14b8a6"}'::jsonb,
    '{"region":"Region","district":"District"}'::jsonb,
    0, 14, true, false, 100
),
(
    'ecg',
    'ECG Network Extent',
    'ECG network coverage area',
    'dbo_ecg', 'the_geom', 'Polygon', 'fill',
    '{"fill-color":"#0d9488","fill-opacity":0.06,"fill-outline-color":"#0d9488"}'::jsonb,
    '{}'::jsonb,
    0, 12, false, false, 101
)

ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    source_table = EXCLUDED.source_table,
    geom_column  = EXCLUDED.geom_column,
    geom_type    = EXCLUDED.geom_type,
    layer_type   = EXCLUDED.layer_type,
    paint_spec   = EXCLUDED.paint_spec,
    popup_spec   = EXCLUDED.popup_spec,
    min_zoom     = EXCLUDED.min_zoom,
    max_zoom     = EXCLUDED.max_zoom,
    sort_order   = EXCLUDED.sort_order,
    updated_at   = now();

-- Backfill source_layer in case migration 20240005 has already run
-- (safe no-op if the column doesn't exist yet — handled by 20240005)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'meta'
      AND table_name   = 'layer_configs'
      AND column_name  = 'source_layer'
  ) THEN
    UPDATE meta.layer_configs
    SET source_layer = CASE
        WHEN source_table LIKE '%.%' THEN split_part(source_table, '.', 2)
        ELSE source_table
    END
    WHERE source_layer = '' OR source_layer IS NULL;
  END IF;
END $$;

-- Update default map centre to Ghana (Accra)
UPDATE meta.app_configs SET value = '-0.1870'  WHERE key = 'map.default_center_lng';
UPDATE meta.app_configs SET value = '5.6037'   WHERE key = 'map.default_center_lat';
UPDATE meta.app_configs SET value = '8'        WHERE key = 'map.default_zoom';
UPDATE meta.app_configs SET value = 'ECG Network Map' WHERE key = 'app.title';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM meta.layer_configs WHERE source_table LIKE 'dbo_%';
-- +goose StatementEnd

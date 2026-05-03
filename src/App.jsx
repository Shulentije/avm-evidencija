import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import logoUrl from "./assets/logo.png";
import { createClient } from "@supabase/supabase-js";
import {
  FolderOpen, FileText, Plus, ClipboardList, StickyNote,
  ShieldCheck, User, MapPin, Trash2, ExternalLink, Pencil, Save,
  LayoutGrid, BarChart3, Table, ChevronRight, X, Download,
  LogOut, Search, Calendar, Users, Activity, Clock, Check,
} from "lucide-react";

/* ═══════════════════════════════════════════
   KONSTANTE & SUPABASE
   ═══════════════════════════════════════════ */
const STORAGE_BASE_KEY = "avm-evidencija-projekata";
const ACTIVE_YEAR = new Date().getFullYear();
const LEGACY_STORAGE_KEY = `${STORAGE_BASE_KEY}-${ACTIVE_YEAR}`;
const STORAGE_KEY = `${STORAGE_BASE_KEY}-all-years`;
const SETTINGS_KEY = `${STORAGE_BASE_KEY}-settings`;

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ═══════════════════════════════════════════
   INK & MOSS PALETA
   ═══════════════════════════════════════════ */
const INK    = "#0e0e0e";
const MOSS   = "#3d4a3d";
const SAGE   = "#6b7a6b";
const LINEN  = "#f0eee8";
const PAPER  = "#ffffff";
const RULE   = "#e0ddd5";
const MUTED  = "#b0b8b0";
const CREAM  = "#f7f6f2";
const DANGER = "#9b2c2c";
const DANGER_BG = "#fef2f2";
const DANGER_BORDER = "#e8c4c4";

/* ═══════════════════════════════════════════
   PIPELINE FAZE
   ═══════════════════════════════════════════ */
const PIPELINE_STAGES = [
  "Ponuda",
  "Analiza lokacije",
  "Elaborat VU",
  "KP Idejno",
  "Čeka UZKD",
  "KP Glavni",
  "Završeno",
];

const STAGE_MAP_FROM_OLD = {
  "Pokrenuto": "Ponuda",
  "Konzervatorska analiza": "Analiza lokacije",
  "Konzervatorski projekat": "KP Glavni",
  "Predato": "Završeno",
};

const DEFAULT_PHASE_1_TEXT =
  "Dinamika obrade i prihvatanje rješenja od strane Uprave za zaštitu kulturnih dobara. Pri izradi idejnog rješenja uz konsultacije sa projektantom definiše se izgled objekta i generalna razrada projekta. Na nivou koncepta i idejnog rješenja, uz saglasnost investitora, projekat se šalje UZKD na provjeru usaglašenosti sa konzervatorskim uslovima i Konzervatorskom analizom.";

const DEFAULT_PHASE_2_TEXT =
  "Dinamika izrade projekta konzervacije zavisi od trenutka dobijanja potrebnih podataka koji će biti definisani ugovorom između investitora, projektanta i arhitekte konzervatora. Izrada finalnog konzervatorskog projekta traje 15 radnih dana od dana dobijanja svih potrebnih informacija i dokumentacije.";

const OLD_DEFAULT_OFFER_TEXTS = [
  "Konzervatorska analiza + Konzervatorski projekat",
  "izradu konzervatorskog projekta za potrebe izgradnje objekta",
  "Za potrebe izrade konzervatorskog projekta za izgradnju / rekonstrukciju / sanaciju",
];

/* ═══════════════════════════════════════════
   UTILITY FUNKCIJE
   ═══════════════════════════════════════════ */
function pad2(v) { return String(v).padStart(2, "0"); }

function buildProjectCode(sequence, year, month) {
  const yy = String(year || ACTIVE_YEAR).slice(-2);
  const mm = pad2(month || new Date().getMonth() + 1);
  const ss = pad2(sequence || 1);
  return `AVM${yy}${mm}-KP.${ss}`;
}

function sanitizeFolderPart(value) {
  const invalid = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
  let text = String(value || "").trim();
  invalid.forEach((c) => { text = text.split(c).join("-"); });
  text = text.replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  return text.slice(0, 80);
}

function buildProjectFolderName(project) {
  const code = sanitizeFolderPart(project?.projectCode || "");
  const name = sanitizeFolderPart(project?.nazivPredmeta || "");
  const loc  = sanitizeFolderPart(project?.opstina || "");
  return [code, name, loc].filter(Boolean).join("_");
}

function buildProjectFolderPath(basePath, project) {
  const base = String(basePath || "").replace(/[\\/]+$/g, "");
  const folder = buildProjectFolderName(project);
  if (!base) return folder;
  if (!folder) return base;
  return `${base}/${folder}`;
}

function isDesktopAvailable() {
  return typeof window !== "undefined" && Boolean(window.desktopAPI);
}

function currency(value) {
  return `${Number(value || 0).toLocaleString("sr-Latn-ME", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })} €`;
}

function numberFormat(value) {
  return Number(value || 0).toLocaleString("sr-Latn-ME", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .replaceAll("č", "c").replaceAll("ć", "c").replaceAll("š", "s")
    .replaceAll("ž", "z").replaceAll("đ", "dj")
    .replaceAll("Č", "C").replaceAll("Ć", "C").replaceAll("Š", "S")
    .replaceAll("Ž", "Z").replaceAll("Đ", "Dj");
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

function loadProjects() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function loadSettings() {
  if (typeof window === "undefined") return { baseFolderPath: "C:/AVM/Projekti" };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { baseFolderPath: "C:/AVM/Projekti" };
    return { baseFolderPath: JSON.parse(raw)?.baseFolderPath || "C:/AVM/Projekti" };
  } catch { return { baseFolderPath: "C:/AVM/Projekti" }; }
}

function buildDefaultOfferDescription(project) {
  const vrsta = String(project?.vrstaRadova || "").trim();
  if (vrsta) return `Konzervatorski projekat za potrebe ${vrsta}`;
  return "Konzervatorski projekat za potrebe izgradnje / rekonstrukcije / sanacije";
}

function normalizeOfferOpis(rawValue, project) {
  const raw = String(rawValue || "").trim();
  if (!raw) return buildDefaultOfferDescription(project);
  if (OLD_DEFAULT_OFFER_TEXTS.includes(raw)) return buildDefaultOfferDescription(project);
  return raw;
}

/* ═══════════════════════════════════════════
   OFFER KALKULACIJE
   ═══════════════════════════════════════════ */
function makeOfferItem(seed = 1) {
  return {
    id: `ITEM-${Date.now()}-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    description: seed === 1 ? "Konzervatorski projekat" : `Stavka ${seed}`,
    quantity: 0, unitLabel: "m2", unitPrice: 0,
  };
}

function sumOfferItems(items = []) {
  return (Array.isArray(items) ? items : []).reduce(
    (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0
  );
}

function recalcChecklist(checklist = {}) {
  const items = Array.isArray(checklist.offerItems) && checklist.offerItems.length
    ? checklist.offerItems : [makeOfferItem(1)];
  const total = sumOfferItems(items);
  const pdv = Number(checklist.pdvStopa || 21);
  return {
    ...checklist, offerItems: items,
    ukupnaPonudaBezPdv: total, faza1: total * 0.6, faza2: total * 0.4,
    ukupnoSaPdv: total * (1 + pdv / 100),
  };
}

/* ═══════════════════════════════════════════
   NORMALIZACIJA PROJEKTA
   ═══════════════════════════════════════════ */
function emptyNewProject(count, year = ACTIVE_YEAR) {
  return {
    projectSequence: count + 1,
    projectYear: Number(year || ACTIVE_YEAR),
    projectMonth: new Date().getMonth() + 1,
    startDate: todayIso(),
    nazivPredmeta: "", investitor: "", projektant: "",
    vrstaRadova: "", parcela: "", katastarskaOpstina: "",
    urbanistickaParcela: "", opstina: "", planskiDokument: "",
    status: "U toku", stage: "Ponuda", opis: "",
    googleMapsLink: "", assignedTo: "",
  };
}

function normalizeStage(rawStage) {
  if (PIPELINE_STAGES.includes(rawStage)) return rawStage;
  if (STAGE_MAP_FROM_OLD[rawStage]) return STAGE_MAP_FROM_OLD[rawStage];
  return "Ponuda";
}

function normalizeProject(project) {
  const year = Number(project.projectYear || (project.startDate ? new Date(project.startDate).getFullYear() : ACTIVE_YEAR) || ACTIVE_YEAR);
  const month = Number(project.projectMonth || (project.startDate ? new Date(project.startDate).getMonth() + 1 : 1));
  const seq = Number(project.projectSequence || 1);

  const p = {
    id: project.id || `PRJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectCode: project.projectCode || buildProjectCode(seq, year, month),
    projectSequence: seq, projectYear: year, projectMonth: month,
    startDate: project.startDate || todayIso(),
    nazivPredmeta: project.nazivPredmeta || "",
    investitor: project.investitor || "",
    projektant: project.projektant || "",
    vrstaRadova: project.vrstaRadova || "",
    parcela: project.parcela || "",
    katastarskaOpstina: project.katastarskaOpstina || "",
    urbanistickaParcela: project.urbanistickaParcela || "",
    opstina: project.opstina || "",
    planskiDokument: project.planskiDokument || "",
    status: project.status || "U toku",
    stage: normalizeStage(project.stage || "Ponuda"),
    opis: project.opis || "",
    googleMapsLink: project.googleMapsLink || "",
    folderPath: project.folderPath || "",
    assignedTo: project.assignedTo || "",
    notes: Array.isArray(project.notes) ? project.notes : [],
    offers: Array.isArray(project.offers) ? project.offers : [],
  };

  const baseChecklist = {
    ponudaBroj: project.checklist?.ponudaBroj || "",
    ponudaDatum: project.checklist?.ponudaDatum || "",
    offerOpis: normalizeOfferOpis(project.checklist?.offerOpis, p),
    pdvStopa: Number(project.checklist?.pdvStopa || 21),
    phase1Description: project.checklist?.phase1Description || DEFAULT_PHASE_1_TEXT,
    phase2Description: project.checklist?.phase2Description || DEFAULT_PHASE_2_TEXT,
    offerItems: Array.isArray(project.checklist?.offerItems)
      ? project.checklist.offerItems.map((item, i) => ({
          id: item.id || `ITEM-${i}-${Date.now()}`,
          description: item.description || `Stavka ${i + 1}`,
          quantity: Number(item.quantity || 0),
          unitLabel: item.unitLabel || "m2",
          unitPrice: Number(item.unitPrice || 0),
        }))
      : [makeOfferItem(1)],
    analizaZavrsena: project.checklist?.analizaZavrsena || "",
    analizaPlacena: project.checklist?.analizaPlacena || "",
    pozitivnoMisljenje: project.checklist?.pozitivnoMisljenje || "",
    projekatZavrsen: project.checklist?.projekatZavrsen || "",
    projekatPlacen: project.checklist?.projekatPlacen || "",
    saglasnostNaProjekat: project.checklist?.saglasnostNaProjekat || "",
    ukupnaPonudaBezPdv: Number(project.checklist?.ukupnaPonudaBezPdv || 0),
    faza1: Number(project.checklist?.faza1 || 0),
    faza2: Number(project.checklist?.faza2 || 0),
    ostvarenaNaplata: Number(project.checklist?.ostvarenaNaplata || 0),
    ukupnoSaPdv: Number(project.checklist?.ukupnoSaPdv || 0),
  };

  return { ...p, checklist: recalcChecklist(baseChecklist) };
}

/* ═══════════════════════════════════════════
   IMPORT STARIH PROJEKATA IZ JSON-a
   ═══════════════════════════════════════════ */
function importLegacyProject(raw) {
  return normalizeProject({
    id: `PRJ-LEGACY-${raw.year}-${raw.seq}-${Math.random().toString(36).slice(2, 8)}`,
    projectCode: raw.new_code || buildProjectCode(raw.seq, raw.year, raw.month),
    projectSequence: raw.seq || 1,
    projectYear: raw.year || ACTIVE_YEAR,
    projectMonth: raw.month || 1,
    startDate: `${raw.year || ACTIVE_YEAR}-${pad2(raw.month || 1)}-01`,
    nazivPredmeta: raw.name || "",
    investitor: raw.investitor || "",
    projektant: raw.projektant || "",
    vrstaRadova: raw.vrstaRadova || "",
    parcela: raw.parcela || "",
    katastarskaOpstina: raw.katastarskaOpstina || "",
    urbanistickaParcela: raw.urbanistickaParcela || "",
    opstina: raw.opstina || "",
    planskiDokument: raw.planskiDokument || "",
    status: raw.status || "Završeno",
    stage: raw.stage || "Završeno",
    assignedTo: raw.worker || "",
    opis: raw.notes || "",
    googleMapsLink: raw.googleMapsLink || "",
    folderPath: "",
    notes: raw.notes ? [{ id: `NOTE-LEGACY-${Date.now()}`, text: raw.notes, createdAt: "Import", author: "Sistem" }] : [],
    checklist: {
      ukupnaPonudaBezPdv: Number(raw.cijena || 0),
      ostvarenaNaplata: Number(raw.cijena || 0),
    },
  });
}

/* ═══════════════════════════════════════════
   MAPA HELPER
   ═══════════════════════════════════════════ */
function extractCoordinates(value) {
  const input = String(value || "").trim();
  if (!input) return null;
  if (!input.startsWith("http")) {
    const m = input.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/i);
    if (m) return { lat: Number(m[1]), lng: Number(m[3]) };
    return null;
  }
  try {
    const url = new URL(input);
    const q = url.searchParams.get("q");
    if (q) { const m = q.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/i); if (m) return { lat: Number(m[1]), lng: Number(m[3]) }; }
    const m = input.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
    if (m) return { lat: Number(m[1]), lng: Number(m[3]) };
    return null;
  } catch { return null; }
}

function buildMapOpenUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  return `https://www.google.com/maps?q=${encodeURIComponent(input)}`;
}

function buildOsmEmbedUrl(value) {
  const c = extractCoordinates(value);
  if (!c) return "";
  const d = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${c.lng-d}%2C${c.lat-d}%2C${c.lng+d}%2C${c.lat+d}&layer=mapnik&marker=${c.lat}%2C${c.lng}`;
}

/* ═══════════════════════════════════════════
   REUSABLE UI KOMPONENTE
   ═══════════════════════════════════════════ */
function Input({ label, style: extraStyle, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <input {...props} style={{
        width: "100%", border: `1px solid ${RULE}`, borderRadius: 6, padding: "9px 11px",
        fontSize: 13, outline: "none", background: PAPER, color: INK, boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
        ...extraStyle,
      }} onFocus={(e) => { e.target.style.borderColor = MOSS; }} onBlur={(e) => { e.target.style.borderColor = RULE; }} />
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <textarea {...props} style={{
        width: "100%", minHeight: 80, border: `1px solid ${RULE}`, borderRadius: 6, padding: "9px 11px",
        fontSize: 13, outline: "none", resize: "vertical", background: PAPER, color: INK, boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }} />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <select {...props} style={{
        width: "100%", border: `1px solid ${RULE}`, borderRadius: 6, padding: "9px 11px",
        fontSize: 13, outline: "none", background: PAPER, color: INK, boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }}>
        {children}
      </select>
    </label>
  );
}

function Btn({ children, active, danger, primary, style: extraStyle, ...props }) {
  const [hovered, setHovered] = useState(false);
  let bg = "transparent";
  let color = SAGE;
  let border = "1px solid transparent";

  if (active || primary) { bg = MOSS; color = PAPER; border = `1px solid ${MOSS}`; }
  else if (danger) { bg = hovered ? DANGER_BG : "transparent"; color = DANGER; border = hovered ? `1px solid ${DANGER_BORDER}` : "1px solid transparent"; }
  else if (hovered) { border = `1px solid ${RULE}`; color = INK; }

  return (
    <button
      {...props}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        border, background: bg, color, borderRadius: 6, padding: "8px 14px",
        cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "'Inter', sans-serif",
        transition: "all 0.15s", letterSpacing: "0.02em", whiteSpace: "nowrap",
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

function MetaCard({ label, value, large }) {
  return (
    <div style={{ padding: large ? 16 : 12, background: CREAM, borderRadius: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: large ? 20 : 14, fontWeight: 700, color: INK }}>{value || "—"}</div>
    </div>
  );
}

function MapPreview({ value }) {
  const openUrl = buildMapOpenUrl(value);
  const osmUrl = buildOsmEmbedUrl(value);
  const coords = extractCoordinates(value);

  if (!value) {
    return <div style={{ padding: 14, color: MUTED, fontSize: 12, border: `1px dashed ${RULE}`, borderRadius: 8, background: CREAM }}>Nije unijeta lokacija.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {osmUrl ? (
        <iframe title="Mapa" src={osmUrl} style={{ width: "100%", height: 200, border: `1px solid ${RULE}`, borderRadius: 8, background: PAPER }} loading="lazy" />
      ) : (
        <div style={{ padding: 14, color: MUTED, fontSize: 12, border: `1px dashed ${RULE}`, borderRadius: 8 }}>
          Mini mapa zahtijeva koordinate (npr. 42.4304, 18.7712)
        </div>
      )}
      {coords && <div style={{ fontSize: 11, color: SAGE, background: CREAM, padding: "6px 10px", borderRadius: 6 }}>Koordinate: {coords.lat}, {coords.lng}</div>}
      <a href={openUrl} target="_blank" rel="noreferrer" style={{
        display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
        color: MOSS, fontSize: 12, fontWeight: 600, padding: "6px 0",
      }}>
        <ExternalLink size={13} /> Otvori u Google Maps
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════ */
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage("Neuspješna prijava. Provjeri email i lozinku.");
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: LINEN, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter', sans-serif", color: INK,
    }}>
      <div onSubmit={login} style={{
        width: "100%", maxWidth: 380, background: PAPER, border: `1px solid ${RULE}`,
        borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "0 8px 30px rgba(14,14,14,0.06)",
      }}>
        <img src={logoUrl} alt="AVM logo" style={{ width: 120, height: "auto", objectFit: "contain", alignSelf: "center", marginBottom: 4 }} />
        <h1 style={{ margin: 0, textAlign: "center", fontSize: 20, fontWeight: 700, letterSpacing: "0.06em" }}>
          <span style={{ fontWeight: 800 }}>AVM</span> <span style={{ fontWeight: 300 }}>ARCHITECTS</span>
        </h1>
        <div style={{ textAlign: "center", color: SAGE, fontSize: 12, marginBottom: 8 }}>Evidencija konzervatorskih projekata</div>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ime@firma.com" />
        <Input label="Lozinka" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Unesi lozinku" />
        <Btn primary onClick={login} disabled={loading} style={{ marginTop: 4, padding: "11px 14px" }}>
          {loading ? "Prijava..." : "Prijavi se"}
        </Btn>
        {message && <div style={{ color: DANGER, background: DANGER_BG, border: `1px solid ${DANGER_BORDER}`, borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>{message}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIPELINE KANBAN KARTICA
   ═══════════════════════════════════════════ */
function PipelineCard({ project, isSelected, onClick }) {
  const [hovered, setHovered] = useState(false);
  const borderColor = isSelected ? MOSS : hovered ? SAGE : "transparent";
  const textColor = isSelected || hovered ? INK : SAGE;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
        border: `1.5px solid ${borderColor}`, background: PAPER, marginBottom: 6,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.04em" }}>{project.projectCode}</div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: textColor, marginTop: 3, transition: "color 0.15s",
        fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {project.nazivPredmeta || "Bez naziva"}
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {project.investitor || "—"}
      </div>
      {project.assignedTo && (
        <div style={{ fontSize: 10, color: SAGE, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <User size={10} /> {project.assignedTo}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIPELINE BOČNI PANEL
   ═══════════════════════════════════════════ */
function SidePanel({ project, onClose, isAdmin, updateField, updateChecklist, userName, isMobile }) {
  const [newNote, setNewNote] = useState("");
  if (!project) return null;

  const addNote = () => {
    if (!newNote.trim()) return;
    updateField("notes", [
      { id: `NOTE-${Date.now()}`, text: newNote.trim(), createdAt: new Date().toLocaleString("sr-Latn-ME"), author: userName },
      ...project.notes,
    ]);
    setNewNote("");
  };

  // Activity feed: merge notes + stage events
  const activityItems = [
    ...project.notes.map((n) => ({ type: "note", ...n })),
  ].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: isMobile ? "100%" : 460, maxWidth: "100vw",
      background: PAPER, borderLeft: `1px solid ${RULE}`,
      boxShadow: "-8px 0 30px rgba(14,14,14,0.08)", zIndex: 1000,
      display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${RULE}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: PAPER, zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em" }}>{project.projectCode}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 2, fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic" }}>
            {project.nazivPredmeta || "Bez naziva"}
          </div>
        </div>
        <Btn onClick={onClose} style={{ padding: 6 }}><X size={16} /></Btn>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <MetaCard label="Investitor" value={project.investitor} />
          <MetaCard label="Projektant" value={project.projektant} />
          <MetaCard label="Vrsta radova" value={project.vrstaRadova} />
          <MetaCard label="Opština" value={project.opstina} />
          <MetaCard label="Parcela" value={project.parcela} />
          <MetaCard label="KO" value={project.katastarskaOpstina} />
          <MetaCard label="Status" value={project.status} />
          <MetaCard label="Dodijeljeno" value={project.assignedTo} />
        </div>

        {/* Edit stage/status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Select label="Faza" value={project.stage} onChange={(e) => updateField("stage", e.target.value)}>
            {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select label="Status" value={project.status} onChange={(e) => updateField("status", e.target.value)}>
            <option>U toku</option>
            <option>Čeka investitora</option>
            <option>Završeno</option>
            <option>Na čekanju</option>
          </Select>
        </div>

        {/* Assigned to */}
        <Input label="Dodijeljeni radnik" value={project.assignedTo} onChange={(e) => updateField("assignedTo", e.target.value)} placeholder="Ime radnika" />

        {/* Financial summary */}
        {isAdmin && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Finansije</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MetaCard label="Bez PDV" value={currency(project.checklist.ukupnaPonudaBezPdv)} />
              <MetaCard label="Sa PDV" value={currency(project.checklist.ukupnoSaPdv)} />
              <MetaCard label="Naplaćeno" value={currency(project.checklist.ostvarenaNaplata)} />
              <MetaCard label="Faza I (60%)" value={currency(project.checklist.faza1)} />
            </div>
          </div>
        )}

        {/* Mini map */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Lokacija</div>
          <MapPreview value={project.googleMapsLink} />
        </div>

        {/* Activity feed */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Aktivnost</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Nova bilješka..."
              rows={2}
              style={{
                flex: 1, border: `1px solid ${RULE}`, borderRadius: 6, padding: "8px 10px",
                fontSize: 12, outline: "none", resize: "vertical", background: PAPER, color: INK,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <Btn primary onClick={addNote} style={{ alignSelf: "flex-end", padding: "8px 12px" }}>
              <Plus size={14} />
            </Btn>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activityItems.length ? activityItems.map((item) => (
              <div key={item.id} style={{ padding: "8px 10px", background: CREAM, borderRadius: 6, borderLeft: `3px solid ${item.type === "note" ? MOSS : SAGE}` }}>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>
                  {item.author || "Sistem"} · {item.createdAt}
                </div>
                <div style={{ fontSize: 12, color: INK, lineHeight: 1.5 }}>{item.text}</div>
              </div>
            )) : (
              <div style={{ color: MUTED, fontSize: 12 }}>Nema bilješki.</div>
            )}
          </div>
        </div>

        {/* Folder & actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => {
            const folder = project.folderPath || buildProjectFolderPath("C:/AVM/Projekti", project);
            if (isDesktopAvailable()) { window.desktopAPI.openFolder(folder); }
            else { try { navigator.clipboard.writeText(folder); } catch {} window.alert(`Putanja:\n${folder}`); }
          }}>
            <FolderOpen size={14} /> Otvori folder
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIPELINE POGLED
   ═══════════════════════════════════════════ */
function PipelineView({ projects, selectedId, setSelectedId, onOpenPanel, isMobile }) {
  const stageGroups = useMemo(() => {
    const groups = {};
    PIPELINE_STAGES.forEach((s) => { groups[s] = []; });
    projects.forEach((p) => {
      const stage = PIPELINE_STAGES.includes(p.stage) ? p.stage : "Ponuda";
      groups[stage].push(p);
    });
    return groups;
  }, [projects]);

  if (isMobile) {
    const [activeStage, setActiveStage] = useState(PIPELINE_STAGES[0]);
    return (
      <div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
          {PIPELINE_STAGES.map((stage) => (
            <Btn key={stage} active={activeStage === stage} onClick={() => setActiveStage(stage)}
              style={{ fontSize: 11, padding: "6px 10px", flexShrink: 0 }}>
              {stage} <span style={{ opacity: 0.6, marginLeft: 2 }}>({stageGroups[stage].length})</span>
            </Btn>
          ))}
        </div>
        <div>
          {stageGroups[activeStage].map((p) => (
            <PipelineCard key={p.id} project={p} isSelected={selectedId === p.id}
              onClick={() => { setSelectedId(p.id); onOpenPanel(p.id); }} />
          ))}
          {!stageGroups[activeStage].length && <div style={{ color: MUTED, fontSize: 12, padding: 16 }}>Nema projekata u ovoj fazi.</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(160px, 1fr))`,
      gap: 10, overflowX: "auto", minHeight: "calc(100vh - 120px)", alignItems: "start",
    }}>
      {PIPELINE_STAGES.map((stage) => (
        <div key={stage} style={{ minWidth: 150 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase",
            padding: "8px 4px", borderBottom: `2px solid ${RULE}`, marginBottom: 8,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{stage}</span>
            <span style={{
              background: CREAM, color: MUTED, fontSize: 10, fontWeight: 800,
              padding: "2px 7px", borderRadius: 10, minWidth: 18, textAlign: "center",
            }}>{stageGroups[stage].length}</span>
          </div>
          <div>
            {stageGroups[stage].map((p) => (
              <PipelineCard key={p.id} project={p} isSelected={selectedId === p.id}
                onClick={() => { setSelectedId(p.id); onOpenPanel(p.id); }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD POGLED
   ═══════════════════════════════════════════ */
function DashboardView({ projects, yearFilter }) {
  const visible = yearFilter === "all"
    ? projects
    : projects.filter((p) => String(p.projectYear) === String(yearFilter));

  const total = visible.length;
  const active = visible.filter((p) => p.status !== "Završeno").length;
  const finished = visible.filter((p) => p.status === "Završeno").length;
  const totalBez = visible.reduce((s, p) => s + Number(p.checklist?.ukupnaPonudaBezPdv || 0), 0);
  const totalSa = visible.reduce((s, p) => s + Number(p.checklist?.ukupnoSaPdv || 0), 0);
  const paid = visible.reduce((s, p) => s + Number(p.checklist?.ostvarenaNaplata || 0), 0);
  const unpaid = Math.max(totalSa - paid, 0);

  const byStage = {};
  PIPELINE_STAGES.forEach((s) => { byStage[s] = 0; });
  visible.forEach((p) => { byStage[p.stage] = (byStage[p.stage] || 0) + 1; });

  const byWorker = {};
  visible.forEach((p) => {
    const w = p.assignedTo || "Nedodijeljeno";
    byWorker[w] = (byWorker[w] || 0) + 1;
  });

  const byStatus = {};
  visible.forEach((p) => { byStatus[p.status || "Bez statusa"] = (byStatus[p.status || "Bez statusa"] || 0) + 1; });

  const byYear = {};
  projects.forEach((p) => { byYear[p.projectYear || ACTIVE_YEAR] = (byYear[p.projectYear || ACTIVE_YEAR] || 0) + 1; });

  const maxStageCount = Math.max(...Object.values(byStage), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <MetaCard large label="Ukupno predmeta" value={total} />
        <MetaCard large label="Aktivni" value={active} />
        <MetaCard large label="Završeni" value={finished} />
        <MetaCard large label="Ukupno bez PDV" value={currency(totalBez)} />
        <MetaCard large label="Ukupno sa PDV" value={currency(totalSa)} />
        <MetaCard large label="Naplaćeno" value={currency(paid)} />
        <MetaCard large label="Za naplatu" value={currency(unpaid)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Stage bar chart */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Projekti po fazi</div>
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 90, fontSize: 11, color: INK, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage}</div>
              <div style={{ flex: 1, height: 18, background: RULE, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${(byStage[stage] / maxStageCount) * 100}%`, height: "100%",
                  background: stage === "Završeno" ? SAGE : MOSS, borderRadius: 4, transition: "width 0.3s",
                  minWidth: byStage[stage] > 0 ? 20 : 0,
                }} />
              </div>
              <div style={{ width: 28, fontSize: 12, fontWeight: 700, color: INK, textAlign: "right" }}>{byStage[stage]}</div>
            </div>
          ))}
        </div>

        {/* By worker */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Projekti po radniku</div>
          {Object.entries(byWorker).sort((a, b) => b[1] - a[1]).map(([worker, count]) => (
            <div key={worker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${RULE}`, fontSize: 13 }}>
              <span style={{ color: INK }}>{worker}</span>
              <strong style={{ color: MOSS }}>{count}</strong>
            </div>
          ))}
        </div>

        {/* By status */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Po statusu</div>
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${RULE}`, fontSize: 13 }}>
              <span style={{ color: INK }}>{status}</span>
              <strong style={{ color: MOSS }}>{count}</strong>
            </div>
          ))}
        </div>

        {/* By year */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Po godini</div>
          {Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, count]) => (
            <div key={year} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${RULE}`, fontSize: 13 }}>
              <span style={{ color: INK }}>{year}</span>
              <strong style={{ color: MOSS }}>{count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHECKLISTA POGLED
   ═══════════════════════════════════════════ */
function ChecklistView({ projects, isAdmin, setSelectedId, onOpenPanel }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${RULE}` }}>
            {["Br.", "God.", "Naziv", "Investitor", "Vrsta radova", "Faza", "Status", "Radnik",
              ...(isAdmin ? ["Ponuda", "Analiza", "Projekat završen", "Bez PDV", "Faza I", "Faza II", "Naplata", "+PDV"] : ["Analiza", "Projekat završen"]),
            ].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 6px", fontWeight: 700, color: SAGE, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} onClick={() => { setSelectedId(p.id); onOpenPanel(p.id); }}
              style={{ cursor: "pointer", borderBottom: `1px solid ${RULE}`, transition: "background 0.1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = CREAM; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <td style={{ padding: "8px 6px", fontWeight: 700, fontSize: 11, color: MOSS, whiteSpace: "nowrap" }}>{p.projectCode}</td>
              <td style={{ padding: "8px 6px", color: MUTED }}>{p.projectYear}</td>
              <td style={{ padding: "8px 6px", fontWeight: 600, color: INK, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic" }}>{p.nazivPredmeta || "—"}</td>
              <td style={{ padding: "8px 6px", color: INK, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.investitor || "—"}</td>
              <td style={{ padding: "8px 6px", color: SAGE }}>{p.vrstaRadova || "—"}</td>
              <td style={{ padding: "8px 6px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: p.stage === "Završeno" ? "#e8f0e8" : CREAM, color: p.stage === "Završeno" ? MOSS : INK, padding: "3px 8px", borderRadius: 4 }}>
                  {p.stage}
                </span>
              </td>
              <td style={{ padding: "8px 6px", color: SAGE }}>{p.status}</td>
              <td style={{ padding: "8px 6px", color: SAGE }}>{p.assignedTo || "—"}</td>
              {isAdmin && <td style={{ padding: "8px 6px", color: SAGE, whiteSpace: "nowrap" }}>{p.checklist.ponudaBroj ? `${p.checklist.ponudaBroj}` : "—"}</td>}
              <td style={{ padding: "8px 6px", color: SAGE }}>{p.checklist.analizaZavrsena || "—"}</td>
              <td style={{ padding: "8px 6px", color: SAGE }}>{p.checklist.projekatZavrsen || "—"}</td>
              {isAdmin && <td style={{ padding: "8px 6px", fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{currency(p.checklist.ukupnaPonudaBezPdv)}</td>}
              {isAdmin && <td style={{ padding: "8px 6px", color: SAGE, whiteSpace: "nowrap" }}>{currency(p.checklist.faza1)}</td>}
              {isAdmin && <td style={{ padding: "8px 6px", color: SAGE, whiteSpace: "nowrap" }}>{currency(p.checklist.faza2)}</td>}
              {isAdmin && <td style={{ padding: "8px 6px", color: MOSS, fontWeight: 600, whiteSpace: "nowrap" }}>{currency(p.checklist.ostvarenaNaplata)}</td>}
              {isAdmin && <td style={{ padding: "8px 6px", fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{currency(p.checklist.ukupnoSaPdv)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   POPUP / NOTIFICATION
   ═══════════════════════════════════════════ */
function PopupCenter({ notifications }) {
  if (!notifications.length) return null;
  return (
    <div style={{ position: "fixed", top: 14, right: 14, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, width: 300, maxWidth: "calc(100vw - 28px)" }}>
      {notifications.map((item) => (
        <div key={item.id} style={{
          background: MOSS, color: PAPER, borderRadius: 8, padding: "10px 14px",
          boxShadow: "0 8px 25px rgba(14,14,14,0.18)", fontSize: 12, fontWeight: 600,
        }}>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>{item.createdAt}</div>
          {item.message}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   OFFERS PAGE (ponude + PDF)
   ═══════════════════════════════════════════ */
function OffersEditor({ project, updateChecklistField, updateSelectedOfferItem, removeOfferItem, addOfferItem, addOfferToProject, exportOfferPdf, pdfStatus }) {
  if (!project) return <div style={{ color: MUTED, fontSize: 13, padding: 20 }}>Odaberi projekat iz sidebar-a.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetaCard label="Projekat" value={project.projectCode} />
        <MetaCard label="Naziv" value={project.nazivPredmeta} />
        <MetaCard label="Investitor" value={project.investitor} />
        <MetaCard label="Vrsta radova" value={project.vrstaRadova} />
      </div>

      <div style={{ background: CREAM, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>Podaci ponude</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Broj ponude" value={project.checklist.ponudaBroj} onChange={(e) => updateChecklistField("ponudaBroj", e.target.value)} />
          <Input label="Datum ponude" type="date" value={project.checklist.ponudaDatum} onChange={(e) => updateChecklistField("ponudaDatum", e.target.value)} />
        </div>
        <TextArea label="Opis ponude" rows={2} value={project.checklist.offerOpis || ""} onChange={(e) => updateChecklistField("offerOpis", e.target.value)} />
        <Input label="PDV stopa (%)" type="number" value={project.checklist.pdvStopa} onChange={(e) => updateChecklistField("pdvStopa", Number(e.target.value || 0))} />
      </div>

      <div style={{ background: CREAM, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>Stavke obračuna</div>
        {(project.checklist.offerItems || []).map((item, idx) => {
          const rowTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
          return (
            <div key={item.id} style={{ border: `1px solid ${RULE}`, borderRadius: 8, padding: 12, background: PAPER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>Stavka {idx + 1}</div>
                <Btn danger onClick={() => removeOfferItem(item.id)} style={{ padding: 4 }}><Trash2 size={12} /></Btn>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 6 }}>
                <Input label="Opis" value={item.description} onChange={(e) => updateSelectedOfferItem(item.id, "description", e.target.value)} />
                <Input label="Količina" type="number" value={item.quantity} onChange={(e) => updateSelectedOfferItem(item.id, "quantity", e.target.value)} />
                <Input label="Jedinica" value={item.unitLabel} onChange={(e) => updateSelectedOfferItem(item.id, "unitLabel", e.target.value)} />
                <Input label="Jed. cijena" type="number" value={item.unitPrice} onChange={(e) => updateSelectedOfferItem(item.id, "unitPrice", e.target.value)} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: MOSS, fontWeight: 600 }}>Ukupno: {currency(rowTotal)}</div>
            </div>
          );
        })}
        <Btn onClick={addOfferItem}><Plus size={14} /> Dodaj stavku</Btn>
      </div>

      <div style={{ background: CREAM, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>Opis faza</div>
        <TextArea label="FAZA I" rows={3} value={project.checklist.phase1Description || ""} onChange={(e) => updateChecklistField("phase1Description", e.target.value)} />
        <TextArea label="FAZA II" rows={3} value={project.checklist.phase2Description || ""} onChange={(e) => updateChecklistField("phase2Description", e.target.value)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetaCard label="Ukupno bez PDV" value={currency(project.checklist.ukupnaPonudaBezPdv)} />
        <MetaCard label="FAZA I 60%" value={currency(project.checklist.faza1)} />
        <MetaCard label="FAZA II 40%" value={currency(project.checklist.faza2)} />
        <MetaCard label="Ukupno + PDV" value={currency(project.checklist.ukupnoSaPdv)} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={addOfferToProject}><FileText size={14} /> Kreiraj ponudu</Btn>
        <Btn primary onClick={() => exportOfferPdf(project)}><Download size={14} /> Izvezi PDF</Btn>
      </div>
      {pdfStatus && <div style={{ fontSize: 12, color: SAGE, background: CREAM, padding: "8px 12px", borderRadius: 6 }}>{pdfStatus}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP KOMPONENT
   ═══════════════════════════════════════════ */
export default function App() {
  const [projects, setProjects] = useState(() => loadProjects().map(normalizeProject));
  const [baseFolderPath, setBaseFolderPath] = useState(loadSettings().baseFolderPath);
  const [selectedId, setSelectedId] = useState(() => loadProjects()[0]?.id || null);
  const [page, setPage] = useState("pipeline");
  const [accessMode, setAccessMode] = useState("admin");
  const [newProject, setNewProject] = useState(() => emptyNewProject(loadProjects().length, ACTIVE_YEAR));
  const [pdfStatus, setPdfStatus] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoAspectRatio, setLogoAspectRatio] = useState(1);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState("worker");
  const [userName, setUserName] = useState("Korisnik");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Offline lokalno");
  const [notifications, setNotifications] = useState([]);
  const [panelProjectId, setPanelProjectId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.map(normalizeProject)));
  }, [projects]);

  // Auth init
  useEffect(() => {
    let active = true;
    async function initAuth() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session || null);
      setAuthLoading(false);
    }
    initAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => { if (active) setSession(s || null); });
    return () => { active = false; listener?.subscription?.unsubscribe?.(); };
  }, []);

  // Load role
  useEffect(() => {
    async function loadRole() {
      if (!session?.user?.id) { setUserRole("worker"); setUserName("Korisnik"); setAccessMode("worker"); return; }
      const { data } = await supabase.from("profiles").select("role, name").eq("id", session.user.id).maybeSingle();
      const role = data?.role === "admin" ? "admin" : "worker";
      setUserRole(role);
      setUserName(data?.name || session.user.email || "Korisnik");
      setAccessMode(role);
    }
    loadRole();
  }, [session]);

  // Cloud load
  async function loadProjectsFromCloud(showLoading = true) {
    if (!session?.user?.id) return;
    if (showLoading) setSyncStatus("Učitavanje...");
    const { data, error } = await supabase.from("projects").select("id, data, updated_at").order("updated_at", { ascending: false });
    if (error) { setSyncStatus("Online učitavanje nije uspjelo."); setCloudLoaded(true); return; }
    const cloud = Array.isArray(data) ? data.map((r) => normalizeProject(r.data || { id: r.id })) : [];
    if (cloud.length) { setProjects(cloud); setSelectedId((c) => c || cloud[0]?.id || null); setSyncStatus("Online učitani."); }
    else { setSyncStatus("Online baza prazna."); }
    setCloudLoaded(true);
  }

  useEffect(() => { if (session?.user?.id) loadProjectsFromCloud(true); }, [session?.user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = supabase.channel("projects-rt").on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => loadProjectsFromCloud(false)).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  // Sync to cloud
  useEffect(() => {
    if (!session?.user?.id || !cloudLoaded) return;
    const t = setTimeout(async () => {
      try {
        const norm = projects.map(normalizeProject);
        const now = new Date().toISOString();
        setSyncStatus("Sync...");
        if (userRole === "admin") {
          const rows = norm.map((p) => ({ id: p.id, owner_id: session.user.id, data: p, updated_at: now }));
          const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        } else {
          for (const p of norm) { await supabase.from("projects").update({ data: p, updated_at: now }).eq("id", p.id); }
        }
        setSyncStatus("Sinhronizovano.");
      } catch { setSyncStatus("Greška pri sync-u."); }
    }, 800);
    return () => clearTimeout(t);
  }, [projects, session?.user?.id, userRole, cloudLoaded]);

  // Settings persist
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ baseFolderPath }));
  }, [baseFolderPath]);

  // Responsive
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h(); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
  }, []);

  // Load logo
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resp = await fetch(logoUrl);
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!active) return;
          const du = String(reader.result || "");
          setLogoDataUrl(du);
          const img = new Image();
          img.onload = () => { if (active) setLogoAspectRatio(img.naturalWidth / img.naturalHeight || 1); };
          img.src = du;
        };
        reader.readAsDataURL(blob);
      } catch { if (active) setLogoDataUrl(""); }
    })();
    return () => { active = false; };
  }, []);

  // Derived data
  const availableYears = useMemo(() => {
    const years = new Set([ACTIVE_YEAR]);
    projects.forEach((p) => years.add(Number(p.projectYear || ACTIVE_YEAR)));
    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesYear = yearFilter === "all" || String(p.projectYear) === String(yearFilter);
      if (!matchesYear) return false;
      if (!term) return true;
      return [p.projectCode, p.nazivPredmeta, p.investitor, p.projektant, p.vrstaRadova, p.parcela, p.katastarskaOpstina, p.opstina, p.assignedTo, p.projectYear].join(" ").toLowerCase().includes(term);
    });
  }, [projects, search, yearFilter]);

  const selectedProject = projects.find((p) => p.id === selectedId) || filteredProjects[0] || null;
  const panelProject = projects.find((p) => p.id === panelProjectId) || null;
  const isAdmin = userRole === "admin" && accessMode === "admin";

  // Actions
  function showPopup(message) {
    const id = `POP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((c) => [{ id, message, createdAt: new Date().toLocaleTimeString("sr-Latn-ME") }, ...c].slice(0, 4));
    setTimeout(() => setNotifications((c) => c.filter((i) => i.id !== id)), 4500);
  }

  function updateProject(projectId, updater) {
    setProjects((cur) => cur.map((p) => p.id === projectId ? normalizeProject(updater(p)) : p));
  }

  function updateSelectedProject(updater) { if (selectedId) updateProject(selectedId, updater); }

  function updateSelectedProjectField(field, value) {
    if (!selectedProject) return;
    updateSelectedProject((p) => {
      const next = { ...p, [field]: value };
      if (["projectYear", "projectMonth", "projectSequence"].includes(field)) {
        next.projectCode = buildProjectCode(next.projectSequence, next.projectYear, next.projectMonth);
        next.folderPath = buildProjectFolderPath(baseFolderPath, next);
      }
      if (field === "vrstaRadova") next.checklist = { ...p.checklist, offerOpis: buildDefaultOfferDescription(next) };
      if (field === "status" && p.status !== value) showPopup(`Status: ${p.nazivPredmeta || p.projectCode} → ${value}`);
      if (field === "stage" && p.stage !== value) showPopup(`Faza: ${p.nazivPredmeta || p.projectCode} → ${value}`);
      return next;
    });
  }

  function updatePanelProjectField(field, value) {
    if (!panelProjectId) return;
    updateProject(panelProjectId, (p) => {
      const next = { ...p, [field]: value };
      if (field === "stage" && p.stage !== value) showPopup(`Faza: ${p.nazivPredmeta || p.projectCode} → ${value}`);
      if (field === "status" && p.status !== value) showPopup(`Status: ${p.nazivPredmeta || p.projectCode} → ${value}`);
      return next;
    });
  }

  function updateChecklistField(field, value) {
    if (!selectedProject) return;
    updateSelectedProject((p) => ({ ...p, checklist: recalcChecklist({ ...p.checklist, [field]: value }) }));
  }

  function updateSelectedOfferItem(itemId, field, value) {
    if (!selectedProject) return;
    updateSelectedProject((p) => {
      const nextItems = p.checklist.offerItems.map((item) =>
        item.id === itemId ? { ...item, [field]: field === "quantity" || field === "unitPrice" ? Number(value || 0) : value } : item
      );
      return { ...p, checklist: recalcChecklist({ ...p.checklist, offerItems: nextItems }) };
    });
  }

  function addOfferItem() {
    if (!selectedProject) return;
    updateSelectedProject((p) => ({
      ...p, checklist: recalcChecklist({ ...p.checklist, offerItems: [...(p.checklist.offerItems || []), makeOfferItem((p.checklist.offerItems?.length || 0) + 1)] }),
    }));
  }

  function removeOfferItem(itemId) {
    if (!selectedProject) return;
    updateSelectedProject((p) => {
      const next = (p.checklist.offerItems || []).filter((i) => i.id !== itemId);
      return { ...p, checklist: recalcChecklist({ ...p.checklist, offerItems: next.length ? next : [makeOfferItem(1)] }) };
    });
  }

  function addOfferToProject() {
    if (userRole !== "admin") { window.alert("Samo admin može kreirati ponude."); return; }
    if (!selectedProject) return;
    const recalc = recalcChecklist(selectedProject.checklist);
    const offer = {
      id: `OFF-${Date.now()}`,
      number: recalc.ponudaBroj || `${selectedProject.projectSequence}-${selectedProject.projectYear}`,
      date: recalc.ponudaDatum || todayIso(),
      amount: Number(recalc.ukupnaPonudaBezPdv || 0),
      description: buildDefaultOfferDescription(selectedProject),
      pdvStopa: Number(recalc.pdvStopa || 21),
      items: recalc.offerItems || [],
      phase1Description: recalc.phase1Description || DEFAULT_PHASE_1_TEXT,
      phase2Description: recalc.phase2Description || DEFAULT_PHASE_2_TEXT,
    };
    updateSelectedProject((p) => ({
      ...p, offers: [offer, ...p.offers],
      checklist: recalcChecklist({ ...p.checklist, ponudaBroj: offer.number, ponudaDatum: offer.date, offerOpis: offer.description }),
    }));
    setPdfStatus("Ponuda kreirana.");
  }

  async function exportOfferPdf(project) {
    if (userRole !== "admin") { window.alert("Samo admin."); return; }
    if (!project) return;
    const checklist = recalcChecklist(project.checklist);
    const offer = project.offers[0] || {
      number: checklist.ponudaBroj || `${project.projectSequence}-${project.projectYear}`,
      date: checklist.ponudaDatum || todayIso(),
      amount: Number(checklist.ukupnaPonudaBezPdv || 0),
      description: buildDefaultOfferDescription(project),
      pdvStopa: Number(checklist.pdvStopa || 21),
      items: checklist.offerItems || [],
      phase1Description: checklist.phase1Description || DEFAULT_PHASE_1_TEXT,
      phase2Description: checklist.phase2Description || DEFAULT_PHASE_2_TEXT,
    };
    try {
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pw = 210, margin = 12, cw = pw - margin * 2;
      let y = 12;

      const clamp = (t, mx) => { const s = sanitizePdfText(t || ""); return s.length <= mx ? s : s.slice(0, mx - 3) + "..."; };
      const writeWrap = (t, x, ys, mw, lh, ml, opts = {}) => {
        const lines = pdf.splitTextToSize(sanitizePdfText(t || ""), mw).slice(0, ml);
        if (lines.length === ml) { const li = lines.length - 1; lines[li] = lines[li].slice(0, -3) + "..."; }
        pdf.text(lines, x, ys, opts);
        return ys + lines.length * lh;
      };

      // Header
      pdf.setFillColor(226, 232, 240);
      pdf.roundedRect(margin, y, cw, 34, 3, 3, "F");
      if (logoDataUrl) {
        try { const lw = 44, lh = lw / Math.max(logoAspectRatio, 0.1); pdf.addImage(logoDataUrl, "PNG", margin + 4, y + (34 - lh) / 2, lw, lh); } catch {}
      }
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
      pdf.text("PONUDA", pw - margin - 30, y + 13);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
      pdf.text(sanitizePdfText(`br. ${offer.number}`), pw - margin - 30, y + 21);
      y += 42;

      // Info row
      pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, cw, 16, 2, 2, "FD");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
      pdf.text("INVESTITOR", margin + 3, y + 5);
      pdf.text("DATUM", margin + 140, y + 5);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      pdf.text(clamp(project.investitor || "-", 34), margin + 3, y + 11);
      pdf.text(sanitizePdfText(formatDisplayDate(offer.date) || "-"), margin + 140, y + 11);
      y += 22;

      // Description
      pdf.setFontSize(8.5);
      y = writeWrap(`${offer.description} na katastarskoj parceli ${project.parcela || "-"}${project.katastarskaOpstina ? `, KO ${project.katastarskaOpstina}` : ""}${project.opstina ? `, ${project.opstina}` : ""}.`, margin, y, cw, 4.2, 3);
      y += 5;

      // Table
      const c1 = 82, c2 = 24, c3 = 36, c4 = cw - c1 - c2 - c3, rh = 7, gap = 1.1;
      pdf.setFillColor(15, 23, 42); pdf.setTextColor(255, 255, 255);
      pdf.roundedRect(margin, y, cw, rh, 1.3, 1.3, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
      pdf.text("Opis", margin + 2, y + 4.7);
      pdf.text("Jedinica", margin + c1 + 2, y + 4.7);
      pdf.text("Jed. cijena", margin + c1 + c2 + 2, y + 4.7);
      pdf.text("Ukupno", margin + c1 + c2 + c3 + 2, y + 4.7);
      y += rh + gap;

      pdf.setTextColor(15, 23, 42);
      const drawRow = (row, opts = {}) => {
        const bg = opts.bg || [248, 250, 252];
        pdf.setFillColor(bg[0], bg[1], bg[2]);
        pdf.roundedRect(margin, y, cw, rh, 1.2, 1.2, "F");
        pdf.setFont("helvetica", opts.bold ? "bold" : "normal"); pdf.setFontSize(7.2);
        pdf.text(clamp(row[0], 38), margin + 2, y + 4.7);
        pdf.text(clamp(row[1], 16), margin + c1 + 2, y + 4.7);
        pdf.text(clamp(row[2], 18), margin + c1 + c2 + 2, y + 4.7);
        pdf.text(clamp(row[3], 18), margin + c1 + c2 + c3 + 2, y + 4.7);
        y += rh + gap;
      };

      (offer.items || []).slice(0, 6).forEach((item) => {
        const tot = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        drawRow([item.description || "", `${numberFormat(item.quantity || 0)} ${item.unitLabel || ""}`.trim(), `${numberFormat(item.unitPrice || 0)} €/${item.unitLabel || ""}`, numberFormat(tot)]);
      });

      const tb = Number(checklist.ukupnaPonudaBezPdv || 0);
      const f1 = Number(checklist.faza1 || 0);
      const f2 = Number(checklist.faza2 || 0);
      const pdvAmt = tb * (Number(checklist.pdvStopa || 21) / 100);
      const ts = Number(checklist.ukupnoSaPdv || 0);

      drawRow(["FAZA I", "60%", "/", numberFormat(f1)], { bg: [241, 245, 249] });
      drawRow(["FAZA II", "40%", "/", numberFormat(f2)], { bg: [241, 245, 249] });
      drawRow(["UKUPNO", "", "", numberFormat(tb)], { bg: [235, 240, 246], bold: true });
      drawRow([`PDV ${checklist.pdvStopa || 21}%`, "", "", numberFormat(pdvAmt)], { bg: [235, 240, 246], bold: true });
      drawRow(["UKUPNO + PDV", "", "", numberFormat(ts)], { bg: [214, 221, 230], bold: true });
      y += 3;

      // Phase boxes
      pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, cw, 22, 2, 2, "FD");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
      pdf.text("FAZA I", margin + 3, y + 5.5);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.2);
      writeWrap(checklist.phase1Description || DEFAULT_PHASE_1_TEXT, margin + 3, y + 10, cw - 6, 3.4, 4);
      y += 26;

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, cw, 22, 2, 2, "FD");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
      pdf.text("FAZA II", margin + 3, y + 5.5);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.2);
      writeWrap(checklist.phase2Description || DEFAULT_PHASE_2_TEXT, margin + 3, y + 10, cw - 6, 3.4, 4);

      // Footer
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      pdf.text(sanitizePdfText(`Podgorica, ${formatDisplayDate(offer.date)}.`), margin, 282);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
      pdf.text("AVM architects d.o.o.", 145, 282);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.2);
      pdf.text("Andrija Vuksanovic", 145, 287);
      pdf.text("spec.Sci.arh. konzervator", 145, 291);

      const fileName = `Ponuda_${project.projectCode.replace(/[^\w.-]+/g, "_")}.pdf`;
      if (isDesktopAvailable() && window.desktopAPI?.savePdf) {
        try {
          const bytes = Array.from(new Uint8Array(pdf.output("arraybuffer")));
          const result = await window.desktopAPI.savePdf({ folderPath: project.folderPath || buildProjectFolderPath(baseFolderPath, project), fileName, bytes });
          if (result?.ok) { setPdfStatus(`PDF sačuvan: ${result.outputPath}`); return; }
        } catch {}
      }
      pdf.save(fileName);
      setPdfStatus("PDF preuzet.");
    } catch (err) { console.error(err); setPdfStatus("Greška pri PDF-u."); }
  }

  async function addProject() {
    if (userRole !== "admin") { window.alert("Samo admin."); return; }
    const year = Number(newProject.projectYear || ACTIVE_YEAR);
    const seq = Number(newProject.projectSequence || projects.filter((p) => Number(p.projectYear) === year).length + 1);
    const month = Number(newProject.projectMonth || new Date().getMonth() + 1);
    const code = buildProjectCode(seq, year, month);
    const created = normalizeProject({
      id: `PRJ-${Date.now()}`, ...newProject, projectYear: year, projectMonth: month, projectSequence: seq,
      projectCode: code, folderPath: buildProjectFolderPath(baseFolderPath, { ...newProject, projectCode: code }),
      checklist: recalcChecklist({ offerOpis: buildDefaultOfferDescription(newProject), pdvStopa: 21, phase1Description: DEFAULT_PHASE_1_TEXT, phase2Description: DEFAULT_PHASE_2_TEXT, offerItems: [makeOfferItem(1)] }),
    });
    if (!created.nazivPredmeta || !created.investitor) { window.alert("Unesi naziv predmeta i investitora."); return; }
    if (isDesktopAvailable() && created.folderPath) { try { await window.desktopAPI.createProjectFolder(created.folderPath); } catch {} }
    setProjects((c) => [created, ...c]);
    setSelectedId(created.id);
    setShowNewForm(false);
    setNewProject(emptyNewProject(projects.filter((p) => Number(p.projectYear) === year).length + 1, year));
    showPopup(`Novi predmet: ${created.nazivPredmeta}`);
  }

  async function deleteProject(projectId) {
    const p = projects.find((i) => i.id === projectId);
    if (!window.confirm(`Obriši predmet: ${p?.nazivPredmeta || p?.projectCode}?`)) return;
    const rem = projects.filter((i) => i.id !== projectId);
    setProjects(rem);
    setSelectedId(rem[0]?.id || null);
    if (panelProjectId === projectId) setPanelProjectId(null);
    try { await supabase.from("projects").delete().eq("id", projectId); setSyncStatus("Obrisano."); } catch { setSyncStatus("Lokalno obrisano."); }
  }

  function exportChecklistCsv() {
    const rows = [
      ["Br projekta", "Naziv", "Investitor", "Projektant", "Vrsta radova", "Status", "Faza", "Radnik", "Ponuda br", "Analiza zavrsena", "Projekat zavrsen", "Bez PDV", "Faza I", "Faza II", "Naplata", "Sa PDV", "Godina", "Folder"],
      ...projects.map((p) => [p.projectCode, p.nazivPredmeta, p.investitor, p.projektant, p.vrstaRadova, p.status, p.stage, p.assignedTo, p.checklist.ponudaBroj, p.checklist.analizaZavrsena, p.checklist.projekatZavrsen, p.checklist.ukupnaPonudaBezPdv, p.checklist.faza1, p.checklist.faza2, p.checklist.ostvarenaNaplata, p.checklist.ukupnoSaPdv, p.projectYear, p.folderPath || ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `checklista_${ACTIVE_YEAR}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) { window.alert("JSON mora biti niz."); return; }
      const imported = data.map(importLegacyProject);
      const existingCodes = new Set(projects.map((p) => p.projectCode));
      const fresh = imported.filter((p) => !existingCodes.has(p.projectCode));
      if (!fresh.length) { window.alert("Svi projekti su već importovani."); return; }
      setProjects((c) => [...c, ...fresh]);
      showPopup(`Importovano ${fresh.length} projekata.`);
    } catch { window.alert("Greška pri čitanju JSON fajla."); }
  }

  async function saveNow() {
    try {
      const norm = projects.map(normalizeProject);
      const now = new Date().toISOString();
      setSyncStatus("Ručno čuvanje...");
      if (session?.user?.id && userRole === "admin") {
        const rows = norm.map((p) => ({ id: p.id, owner_id: session.user.id, data: p, updated_at: now }));
        const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(norm));
      setSyncStatus("Sačuvano.");
      showPopup("Podaci sačuvani.");
    } catch { setSyncStatus("Greška."); showPopup("Greška pri čuvanju."); }
  }

  async function logout() { await supabase.auth.signOut(); }

  // Loading / Login guards
  if (authLoading) {
    return <div style={{ minHeight: "100vh", background: LINEN, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: SAGE }}>Učitavanje...</div>;
  }
  if (!session) return <LoginScreen />;

  const navItems = [
    { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
    { id: "dashboard", label: "Dashboard", icon: BarChart3, adminOnly: true },
    { id: "checklist", label: "Checklista", icon: Table },
    { id: "offers", label: "Ponude", icon: FileText, adminOnly: true },
  ].filter((n) => !n.adminOnly || isAdmin);

  // ═══════════════ RENDER ═══════════════
  return (
    <div style={{ minHeight: "100vh", background: LINEN, color: INK, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <PopupCenter notifications={notifications} />

      {/* Side panel overlay */}
      {panelProjectId && (
        <>
          <div onClick={() => setPanelProjectId(null)} style={{ position: "fixed", inset: 0, background: "rgba(14,14,14,0.15)", zIndex: 999 }} />
          <SidePanel
            project={panelProject}
            onClose={() => setPanelProjectId(null)}
            isAdmin={isAdmin}
            updateField={(f, v) => updatePanelProjectField(f, v)}
            updateChecklist={(f, v) => {
              if (!panelProjectId) return;
              updateProject(panelProjectId, (p) => ({ ...p, checklist: recalcChecklist({ ...p.checklist, [f]: v }) }));
            }}
            userName={userName}
            isMobile={isMobile}
          />
        </>
      )}

      <div style={{ display: isMobile ? "flex" : "grid", gridTemplateColumns: "210px minmax(0, 1fr)", flexDirection: "column", flex: 1 }}>
        {/* ═══════════ SIDEBAR (desktop) ═══════════ */}
        {!isMobile && (
          <aside style={{
            width: 210, background: PAPER, borderRight: `1px solid ${RULE}`,
            display: "flex", flexDirection: "column", padding: "16px 12px", gap: 12,
            overflowY: "auto", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box",
          }}>
            {/* Brand */}
            <div style={{ padding: "4px 0", borderBottom: `1px solid ${RULE}`, paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={logoUrl} alt="AVM" style={{ width: 32, height: 32, objectFit: "contain" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", color: INK }}>AVM</div>
                  <div style={{ fontSize: 10, fontWeight: 400, color: SAGE, letterSpacing: "0.04em" }}>ARCHITECTS</div>
                </div>
              </div>
            </div>

            {/* Nav */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {navItems.map((n) => {
                const Icon = n.icon;
                const active = page === n.id;
                return (
                  <button key={n.id} onClick={() => setPage(n.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6,
                    border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: active ? MOSS : "transparent", color: active ? PAPER : SAGE,
                    transition: "all 0.12s", fontFamily: "'Inter', sans-serif", textAlign: "left",
                  }}>
                    <Icon size={15} /> {n.label}
                  </button>
                );
              })}
            </div>

            {/* User info */}
            <div style={{ fontSize: 11, color: SAGE, padding: "6px 0", borderTop: `1px solid ${RULE}`, marginTop: 4 }}>
              <div style={{ fontWeight: 700, color: INK, marginBottom: 2 }}>{userName}</div>
              <div>{userRole === "admin" ? "Administrator" : "Radnik"}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{syncStatus}</div>
            </div>

            {/* Year filter */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Godina</div>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{
                width: "100%", border: `1px solid ${RULE}`, borderRadius: 6, padding: "6px 8px",
                fontSize: 12, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif",
              }}>
                <option value="all">Sve</option>
                {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Search */}
            <div>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 8, top: 9, color: MUTED }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pretraga..."
                  style={{
                    width: "100%", border: `1px solid ${RULE}`, borderRadius: 6, padding: "7px 8px 7px 28px",
                    fontSize: 12, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Project list */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, overflowY: "auto", minHeight: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                Projekti ({filteredProjects.length})
              </div>
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    textAlign: "left", padding: "7px 8px", borderRadius: 6, cursor: "pointer",
                    border: selectedId === p.id ? `1.5px solid ${MOSS}` : "1.5px solid transparent",
                    background: selectedId === p.id ? CREAM : "transparent",
                    transition: "all 0.1s", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>{p.projectCode}</div>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: INK, marginTop: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic",
                  }}>
                    {p.nazivPredmeta || "Bez naziva"}
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
              {isAdmin && <Btn onClick={() => setShowNewForm(true)} style={{ justifyContent: "flex-start", fontSize: 11 }}><Plus size={13} /> Novi predmet</Btn>}
              <Btn onClick={saveNow} style={{ justifyContent: "flex-start", fontSize: 11 }}><Save size={13} /> Sačuvaj</Btn>
              {isAdmin && <Btn onClick={exportChecklistCsv} style={{ justifyContent: "flex-start", fontSize: 11 }}><Download size={13} /> CSV export</Btn>}
              {isAdmin && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 11, color: SAGE, cursor: "pointer", fontWeight: 600 }}>
                  <FileText size={13} /> Import JSON
                  <input type="file" accept=".json" onChange={handleImportJson} style={{ display: "none" }} />
                </label>
              )}
              <Btn onClick={logout} style={{ justifyContent: "flex-start", fontSize: 11 }}><LogOut size={13} /> Odjava</Btn>
            </div>
          </aside>
        )}

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <main style={{ flex: 1, padding: isMobile ? "12px 12px 80px" : "20px 24px", overflowX: "hidden" }}>
          {/* Mobile top bar */}
          {isMobile && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <img src={logoUrl} alt="AVM" style={{ width: 24, height: 24, objectFit: "contain" }} />
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.06em" }}>AVM</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {isAdmin && <Btn onClick={() => setShowNewForm(true)} style={{ padding: "6px 10px", fontSize: 11 }}><Plus size={13} /></Btn>}
                <Btn onClick={saveNow} style={{ padding: "6px 10px", fontSize: 11 }}><Save size={13} /></Btn>
                <Btn onClick={logout} style={{ padding: "6px 10px", fontSize: 11 }}><LogOut size={13} /></Btn>
              </div>
            </div>
          )}

          {/* Mobile search */}
          {isMobile && (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: MUTED }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pretraga..."
                style={{ width: "100%", border: `1px solid ${RULE}`, borderRadius: 6, padding: "9px 10px 9px 30px", fontSize: 13, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* Page title */}
          {!isMobile && (
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "0.02em", color: INK }}>
                  {navItems.find((n) => n.id === page)?.label || "Pipeline"}
                </h1>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                  {filteredProjects.length} projekata {yearFilter !== "all" ? `· ${yearFilter}` : "· sve godine"}
                </div>
              </div>
            </div>
          )}

          {/* ─── PIPELINE VIEW ─── */}
          {page === "pipeline" && (
            <PipelineView
              projects={filteredProjects}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onOpenPanel={(id) => setPanelProjectId(id)}
              isMobile={isMobile}
            />
          )}

          {/* ─── DASHBOARD VIEW ─── */}
          {page === "dashboard" && isAdmin && (
            <DashboardView projects={projects} yearFilter={yearFilter} />
          )}

          {/* ─── CHECKLIST VIEW ─── */}
          {page === "checklist" && (
            <ChecklistView projects={filteredProjects} isAdmin={isAdmin} setSelectedId={setSelectedId} onOpenPanel={(id) => setPanelProjectId(id)} />
          )}

          {/* ─── OFFERS VIEW ─── */}
          {page === "offers" && isAdmin && (
            <OffersEditor
              project={selectedProject}
              updateChecklistField={updateChecklistField}
              updateSelectedOfferItem={updateSelectedOfferItem}
              removeOfferItem={removeOfferItem}
              addOfferItem={addOfferItem}
              addOfferToProject={addOfferToProject}
              exportOfferPdf={exportOfferPdf}
              pdfStatus={pdfStatus}
            />
          )}
        </main>
      </div>

      {/* ═══════════ MOBILE BOTTOM TAB BAR ═══════════ */}
      {isMobile && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: PAPER,
          borderTop: `1px solid ${RULE}`, display: "flex", justifyContent: "space-around",
          padding: "6px 0 env(safe-area-inset-bottom, 8px)", zIndex: 500,
        }}>
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                color: active ? MOSS : MUTED, fontFamily: "'Inter', sans-serif",
                transition: "color 0.12s",
              }}>
                <Icon size={18} />
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{n.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ═══════════ NEW PROJECT MODAL ═══════════ */}
      {showNewForm && (
        <>
          <div onClick={() => setShowNewForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(14,14,14,0.2)", zIndex: 2000 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: isMobile ? "calc(100% - 32px)" : 520, maxHeight: "85vh", overflowY: "auto",
            background: PAPER, borderRadius: 12, padding: 24, zIndex: 2001,
            boxShadow: "0 16px 50px rgba(14,14,14,0.12)", fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Novi predmet</h2>
              <Btn onClick={() => setShowNewForm(false)} style={{ padding: 4 }}><X size={16} /></Btn>
            </div>

            <div style={{ background: CREAM, borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>Kod projekta</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: MOSS, marginTop: 4 }}>
                {buildProjectCode(Number(newProject.projectSequence || projects.filter((p) => Number(p.projectYear) === Number(newProject.projectYear || ACTIVE_YEAR)).length + 1), Number(newProject.projectYear || ACTIVE_YEAR), Number(newProject.projectMonth || new Date().getMonth() + 1))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Godina" type="number" value={newProject.projectYear} onChange={(e) => {
                const yr = Number(e.target.value || ACTIVE_YEAR);
                const sug = projects.filter((p) => Number(p.projectYear) === yr).length + 1;
                setNewProject((p) => ({ ...p, projectYear: yr, projectSequence: sug }));
              }} />
              <Input label="Mjesec" type="number" min="1" max="12" value={newProject.projectMonth} onChange={(e) => setNewProject((p) => ({ ...p, projectMonth: Number(e.target.value || 1) }))} />
              <Input label="Redni broj" type="number" value={newProject.projectSequence} onChange={(e) => setNewProject((p) => ({ ...p, projectSequence: Number(e.target.value || 1) }))} />
              <Input label="Datum početka" type="date" value={newProject.startDate} onChange={(e) => setNewProject((p) => ({ ...p, startDate: e.target.value }))} />
              <div style={{ gridColumn: "1/-1" }}><Input label="Naziv predmeta" value={newProject.nazivPredmeta} onChange={(e) => setNewProject((p) => ({ ...p, nazivPredmeta: e.target.value }))} /></div>
              <Input label="Investitor" value={newProject.investitor} onChange={(e) => setNewProject((p) => ({ ...p, investitor: e.target.value }))} />
              <Input label="Projektant" value={newProject.projektant} onChange={(e) => setNewProject((p) => ({ ...p, projektant: e.target.value }))} />
              <Input label="Vrsta radova" value={newProject.vrstaRadova} onChange={(e) => setNewProject((p) => ({ ...p, vrstaRadova: e.target.value }))} placeholder="izgradnja, rekonstrukcija..." />
              <Input label="Katastarska parcela" value={newProject.parcela} onChange={(e) => setNewProject((p) => ({ ...p, parcela: e.target.value }))} />
              <Input label="Katastarska opština" value={newProject.katastarskaOpstina} onChange={(e) => setNewProject((p) => ({ ...p, katastarskaOpstina: e.target.value }))} />
              <Input label="Opština" value={newProject.opstina} onChange={(e) => setNewProject((p) => ({ ...p, opstina: e.target.value }))} />
              <Input label="Urbanistička parcela" value={newProject.urbanistickaParcela} onChange={(e) => setNewProject((p) => ({ ...p, urbanistickaParcela: e.target.value }))} />
              <Input label="Planski dokument" value={newProject.planskiDokument} onChange={(e) => setNewProject((p) => ({ ...p, planskiDokument: e.target.value }))} />
              <Input label="Dodijeljeni radnik" value={newProject.assignedTo} onChange={(e) => setNewProject((p) => ({ ...p, assignedTo: e.target.value }))} />
              <Input label="Google Maps link" value={newProject.googleMapsLink} onChange={(e) => setNewProject((p) => ({ ...p, googleMapsLink: e.target.value }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 12 }}>
              <input value={baseFolderPath} onChange={(e) => setBaseFolderPath(e.target.value)} placeholder="Bazna lokacija foldera"
                style={{ border: `1px solid ${RULE}`, borderRadius: 6, padding: "9px 11px", fontSize: 12, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif" }}
              />
              <Btn onClick={async () => {
                if (!isDesktopAvailable()) return;
                try { const r = await window.desktopAPI.selectBaseFolder(); if (!r?.canceled && r?.folderPath) setBaseFolderPath(r.folderPath); } catch {}
              }}><FolderOpen size={13} /></Btn>
            </div>

            <Btn primary onClick={addProject} style={{ width: "100%", marginTop: 16, padding: "11px 14px" }}>
              <Plus size={15} /> Dodaj predmet
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import logoUrl from "./assets/logo.png";
import { createClient } from "@supabase/supabase-js";
import {
  FolderOpen,
  FileText,
  Plus,
  ClipboardList,
  StickyNote,
  ShieldCheck,
  User,
  MapPin,
  Trash2,
  ExternalLink,
  Pencil,
  Save,
} from "lucide-react";

const STORAGE_BASE_KEY = "avm-evidencija-projekata";
const ACTIVE_YEAR = new Date().getFullYear();
const LEGACY_STORAGE_KEY = `${STORAGE_BASE_KEY}-${ACTIVE_YEAR}`;
const STORAGE_KEY = `${STORAGE_BASE_KEY}-all-years`;
const SETTINGS_KEY = `${STORAGE_BASE_KEY}-settings`;

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DEFAULT_PHASE_1_TEXT =
  "Dinamika obrade i prihvatanje rješenja od strane Uprave za zaštitu kulturnih dobara. Pri izradi idejnog rješenja uz konsultacije sa projektantom definiše se izgled objekta i generalna razrada projekta. Na nivou koncepta i idejnog rješenja, uz saglasnost investitora, projekat se šalje UZKD na provjeru usaglašenosti sa konzervatorskim uslovima i Konzervatorskom analizom.";

const DEFAULT_PHASE_2_TEXT =
  "Dinamika izrade projekta konzervacije zavisi od trenutka dobijanja potrebnih podataka koji će biti definisani ugovorom između investitora, projektanta i arhitekte konzervatora. Izrada finalnog konzervatorskog projekta traje 15 radnih dana od dana dobijanja svih potrebnih informacija i dokumentacije.";

const OLD_DEFAULT_OFFER_TEXTS = [
  "Konzervatorska analiza + Konzervatorski projekat",
  "izradu konzervatorskog projekta za potrebe izgradnje objekta",
  "Za potrebe izrade konzervatorskog projekta za izgradnju / rekonstrukciju / sanaciju",
];

function loadProjects() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSettings() {
  if (typeof window === "undefined") return { baseFolderPath: "C:/AVM/Projekti" };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { baseFolderPath: "C:/AVM/Projekti" };
    const parsed = JSON.parse(raw);
    return { baseFolderPath: parsed?.baseFolderPath || "C:/AVM/Projekti" };
  } catch {
    return { baseFolderPath: "C:/AVM/Projekti" };
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function buildProjectCode(sequence, startDate, projectYear) {
  const safeYear = Number(projectYear || ACTIVE_YEAR);
  const date = startDate ? new Date(startDate) : new Date(`${safeYear}-01-01`);
  const month = pad2((date.getMonth() || 0) + 1);
  const year = String(safeYear || date.getFullYear()).slice(-2);
  return `KP. ${pad2(sequence)}-${month}/${year}`;
}

function sanitizeFolderPart(value) {
  const invalid = [String.fromCharCode(92), "/", ":", "*", "?", '"', "<", ">", "|"];
  let text = String(value || "").trim();
  invalid.forEach((char) => {
    text = text.split(char).join("-");
  });
  while (text.includes("  ")) text = text.split("  ").join(" ");
  while (text.includes("--")) text = text.split("--").join("-");
  return text.trim();
}

function buildProjectFolderName(project) {
  return [
    sanitizeFolderPart(project?.projectCode || ""),
    sanitizeFolderPart(project?.investitor || ""),
    sanitizeFolderPart(project?.projektant || ""),
    project?.parcela ? `KP ${sanitizeFolderPart(project.parcela)}` : "",
    project?.katastarskaOpstina ? `KO ${sanitizeFolderPart(project.katastarskaOpstina)}` : "",
  ]
    .filter(Boolean)
    .join(" - ")
    .trim();
}

function buildProjectFolderPath(baseFolderPath, project) {
  const base = String(baseFolderPath || "").trim().replace(/[\\/]+$/g, "");
  const folderName = buildProjectFolderName(project);
  if (!base) return folderName;
  if (!folderName) return base;
  return `${base}/${folderName}`;
}

function isDesktopAvailable() {
  return typeof window !== "undefined" && Boolean(window.desktopAPI);
}

function currency(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("sr-Latn-ME", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function numberFormat(value) {
  const number = Number(value || 0);
  return number.toLocaleString("sr-Latn-ME", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
    .replaceAll("č", "c")
    .replaceAll("ć", "c")
    .replaceAll("š", "s")
    .replaceAll("ž", "z")
    .replaceAll("đ", "dj")
    .replaceAll("Č", "C")
    .replaceAll("Ć", "C")
    .replaceAll("Š", "S")
    .replaceAll("Ž", "Z")
    .replaceAll("Đ", "Dj");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

function makeOfferItem(seed = 1) {
  return {
    id: `ITEM-${Date.now()}-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    description: seed === 1 ? "Konzervatorski projekat" : `Stavka ${seed}`,
    quantity: 0,
    unitLabel: "m2",
    unitPrice: 0,
  };
}

function sumOfferItems(items = []) {
  return (Array.isArray(items) ? items : []).reduce(
    (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
}

function recalcChecklist(checklist = {}) {
  const items =
    Array.isArray(checklist.offerItems) && checklist.offerItems.length
      ? checklist.offerItems
      : [makeOfferItem(1)];

  const ukupnoBezPdv = sumOfferItems(items);
  const pdvStopa = Number(checklist.pdvStopa || 21);

  return {
    ...checklist,
    offerItems: items,
    ukupnaPonudaBezPdv: Number(ukupnoBezPdv || 0),
    faza1: Number(ukupnoBezPdv * 0.6),
    faza2: Number(ukupnoBezPdv * 0.4),
    ukupnoSaPdv: Number(ukupnoBezPdv * (1 + pdvStopa / 100)),
  };
}

function emptyNewProject(projectCount, projectYear = ACTIVE_YEAR) {
  return {
    projectSequence: projectCount + 1,
    projectYear: Number(projectYear || ACTIVE_YEAR),
    startDate: todayIso(),
    nazivPredmeta: "",
    investitor: "",
    projektant: "",
    vrstaRadova: "",
    parcela: "",
    katastarskaOpstina: "",
    urbanistickaParcela: "",
    opstina: "",
    planskiDokument: "",
    status: "U toku",
    stage: "Pokrenuto",
    opis: "",
    googleMapsLink: "",
  };
}

function normalizeProject(project) {
  const baseChecklist = {
    ponudaBroj: project.checklist?.ponudaBroj || "",
    ponudaDatum: project.checklist?.ponudaDatum || "",
    offerOpis: normalizeOfferOpis(project.checklist?.offerOpis, project),
    pdvStopa: Number(project.checklist?.pdvStopa || 21),
    phase1Description: project.checklist?.phase1Description || DEFAULT_PHASE_1_TEXT,
    phase2Description: project.checklist?.phase2Description || DEFAULT_PHASE_2_TEXT,
    offerItems: Array.isArray(project.checklist?.offerItems)
      ? project.checklist.offerItems.map((item, index) => ({
          id: item.id || `ITEM-${index}-${Date.now()}`,
          description: item.description || `Stavka ${index + 1}`,
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

  return {
    id: project.id || `PRJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectCode: project.projectCode || "",
    projectSequence: Number(project.projectSequence || 1),
    projectYear: Number(project.projectYear || (project.startDate ? new Date(project.startDate).getFullYear() : ACTIVE_YEAR)),
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
    stage: project.stage || "Pokrenuto",
    opis: project.opis || "",
    googleMapsLink: project.googleMapsLink || "",
    folderPath: project.folderPath || "",
    notes: Array.isArray(project.notes) ? project.notes : [],
    offers: Array.isArray(project.offers) ? project.offers : [],
    checklist: recalcChecklist(baseChecklist),
  };
}

function extractCoordinates(value) {
  const input = String(value || "").trim();
  if (!input) return null;

  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    const coordMatch = input.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/i);
    if (coordMatch) return { lat: Number(coordMatch[1]), lng: Number(coordMatch[3]) };
    return null;
  }

  try {
    const url = new URL(input);
    const q = url.searchParams.get("q");
    if (q) {
      const qMatch = q.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/i);
      if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[3]) };
    }
    const atMatch = input.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
    if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[3]) };
    return null;
  } catch {
    return null;
  }
}

function buildMapOpenUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  return `https://www.google.com/maps?q=${encodeURIComponent(input)}`;
}

function buildOsmEmbedUrl(value) {
  const coords = extractCoordinates(value);
  if (!coords) return "";
  const { lat, lng } = coords;
  const delta = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function MetaCard({ label, value }) {
  return (
    <div style={styles.metaCard}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value || "—"}</div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <input {...props} style={styles.input} />
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <textarea {...props} style={styles.textarea} />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <select {...props} style={styles.input}>
        {children}
      </select>
    </label>
  );
}

function MapPreview({ value }) {
  const openUrl = buildMapOpenUrl(value);
  const osmUrl = buildOsmEmbedUrl(value);
  const coords = extractCoordinates(value);

  if (!value) {
    return (
      <div style={styles.mapEmpty}>
        Nije unijeta lokacija. U polje “Google Maps link / lokacija” možeš upisati adresu,
        koordinate ili Google Maps link.
      </div>
    );
  }

  return (
    <div style={styles.mapWrap}>
      {osmUrl ? (
        <iframe key={osmUrl} title="Mini mapa" src={osmUrl} style={styles.mapFrame} loading="lazy" />
      ) : (
        <div style={styles.mapEmpty}>
          Mini mapa se može prikazati kada link sadrži koordinate ili kada direktno uneseš
          koordinate, npr: <strong>42.4304, 18.7712</strong>
        </div>
      )}

      {coords && <div style={styles.mapCoords}>Koordinate: {coords.lat}, {coords.lng}</div>}

      <a href={openUrl} target="_blank" rel="noreferrer" style={styles.mapButton}>
        <ExternalLink size={14} /> Otvori u Google Maps
      </a>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("Neuspješna prijava. Provjeri email i lozinku.");
    }

    setLoading(false);
  }

  return (
    <div style={styles.loginPage}>
      <form onSubmit={login} style={styles.loginCard}>
        <img src={logoUrl} alt="AVM logo" style={styles.loginLogo} />
        <h1 style={styles.loginTitle}>AVM Evidencija</h1>
        <div style={styles.loginSubtitle}>Prijava za administratore i radnike</div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ime@firma.com"
          required
        />
        <Input
          label="Lozinka"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Unesi lozinku"
          required
        />

        <button type="submit" style={styles.buttonPrimary} disabled={loading}>
          {loading ? "Prijava..." : "Prijavi se"}
        </button>

        {message && <div style={styles.loginMessage}>{message}</div>}
      </form>
    </div>
  );
}

export default function App() {
  const [projects, setProjects] = useState(() => loadProjects().map(normalizeProject));
  const [baseFolderPath, setBaseFolderPath] = useState(loadSettings().baseFolderPath);
  const [selectedId, setSelectedId] = useState(() => loadProjects()[0]?.id || null);
  const [page, setPage] = useState("main");
  const [accessMode, setAccessMode] = useState("admin");
  const [newProject, setNewProject] = useState(() => emptyNewProject(loadProjects().length, ACTIVE_YEAR));
  const [newNote, setNewNote] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [saveMessage, setSaveMessage] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoAspectRatio, setLogoAspectRatio] = useState(1);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState("worker");
  const [userName, setUserName] = useState("Korisnik");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Offline lokalno");
  const [notifications, setNotifications] = useState([]);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.map(normalizeProject)));
  }, [projects]);

  async function loadProjectsFromCloud(showLoading = true) {
    if (!session?.user?.id) return;

    if (showLoading) setSyncStatus("Učitavanje online projekata...");

    const { data, error } = await supabase
      .from("projects")
      .select("id, data, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      setSyncStatus("Online učitavanje nije uspjelo, koristi se lokalna kopija.");
      setCloudLoaded(true);
      return;
    }

    const cloudProjects = Array.isArray(data)
      ? data.map((row) => normalizeProject(row.data || { id: row.id }))
      : [];

    if (cloudProjects.length) {
      setProjects(cloudProjects);
      setSelectedId((current) => current || cloudProjects[0]?.id || null);
      setSyncStatus(showLoading ? "Online projekti učitani." : "Podaci osvježeni u realnom vremenu.");
    } else {
      setSyncStatus("Online baza je prazna. Novi projekti će se sinhronizovati.");
    }

    setCloudLoaded(true);
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    loadProjectsFromCloud(true);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          loadProjectsFromCloud(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || !cloudLoaded) return;

    const timer = setTimeout(async () => {
      try {
        const normalizedProjects = projects.map(normalizeProject);
        const now = new Date().toISOString();

        setSyncStatus("Sinhronizacija u toku...");

        if (userRole === "admin") {
          const rows = normalizedProjects.map((project) => ({
            id: project.id,
            owner_id: session.user.id,
            data: project,
            updated_at: now,
          }));

          const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        } else {
          for (const project of normalizedProjects) {
            const { error } = await supabase
              .from("projects")
              .update({ data: project, updated_at: now })
              .eq("id", project.id);
            if (error) throw error;
          }
        }

        setSyncStatus("Sinhronizovano online.");
      } catch (error) {
        console.error(error);
        setSyncStatus("Greška pri online sinhronizaciji. Lokalna kopija je sačuvana.");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [projects, session?.user?.id, userRole, cloudLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ baseFolderPath }));
  }, [baseFolderPath]);

  useEffect(() => {
    if (accessMode === "worker") setPage("worker");
    if (userRole !== "admin" && (page === "main" || page === "offers")) setPage("worker");
  }, [accessMode, userRole, page]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session || null);
      setAuthLoading(false);
    }

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession || null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    async function loadRole() {
      if (!session?.user?.id) {
        setUserRole("worker");
        setUserName("Korisnik");
        setAccessMode("worker");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = data?.role === "admin" ? "admin" : "worker";
      setUserRole(role);
      setUserName(data?.name || session.user.email || "Korisnik");
      setAccessMode(role === "admin" ? "admin" : "worker");
    }

    loadRole();
  }, [session]);

  useEffect(() => {
    let active = true;
    async function loadLogo() {
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!active) return;
          const dataUrl = String(reader.result || "");
          setLogoDataUrl(dataUrl);

          const image = new Image();
          image.onload = () => {
            if (!active) return;
            const ratio = image.naturalWidth && image.naturalHeight
              ? image.naturalWidth / image.naturalHeight
              : 1;
            setLogoAspectRatio(ratio);
          };
          image.src = dataUrl;
        };
        reader.readAsDataURL(blob);
      } catch {
        if (active) setLogoDataUrl("");
      }
    }
    loadLogo();
    return () => {
      active = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set([ACTIVE_YEAR]);
    projects.forEach((project) => years.add(Number(project.projectYear || ACTIVE_YEAR)));
    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesYear = yearFilter === "all" || String(project.projectYear || ACTIVE_YEAR) === String(yearFilter);
      if (!matchesYear) return false;
      if (!term) return true;
      return [
        project.projectCode,
        project.nazivPredmeta,
        project.investitor,
        project.projektant,
        project.vrstaRadova,
        project.parcela,
        project.katastarskaOpstina,
        project.opstina,
        project.projectYear,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [projects, search, yearFilter]);

  const selectedProject =
    projects.find((project) => project.id === selectedId) || filteredProjects[0] || null;

  const newProjectYear = Number(newProject.projectYear || ACTIVE_YEAR);
  const suggestedSequenceForYear =
    projects.filter((project) => Number(project.projectYear || ACTIVE_YEAR) === newProjectYear).length + 1;
  const nextSequenceForYear = Number(newProject.projectSequence || suggestedSequenceForYear);

  const nextProjectCode = buildProjectCode(
    nextSequenceForYear,
    newProject.startDate,
    newProjectYear
  );

  const nextProjectFolderPreview = buildProjectFolderPath(baseFolderPath, {
    ...newProject,
    projectCode: nextProjectCode,
  });

  function showPopup(message) {
    const id = `POP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((current) => [{ id, message, createdAt: new Date().toLocaleTimeString("sr-Latn-ME") }, ...current].slice(0, 4));
    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }

  function updateSelectedProject(updater) {
    setProjects((current) =>
      current.map((project) =>
        project.id === selectedId ? normalizeProject(updater(project)) : project
      )
    );
  }

  function updateSelectedProjectField(field, value) {
    if (!selectedProject) return;
    updateSelectedProject((project) => {
      const nextProject = { ...project, [field]: value };

      if (["projectYear", "projectSequence", "startDate", "investitor", "projektant", "parcela", "katastarskaOpstina"].includes(field)) {
        const year = Number(nextProject.projectYear || ACTIVE_YEAR);
        nextProject.projectCode = buildProjectCode(nextProject.projectSequence, nextProject.startDate, year);
        nextProject.folderPath = buildProjectFolderPath(baseFolderPath, nextProject);
      }

      if (field === "vrstaRadova") {
        nextProject.checklist = {
          ...project.checklist,
          offerOpis: buildDefaultOfferDescription(nextProject),
        };
      }

      if (field === "status" && project.status !== value) {
        showPopup(`Status promijenjen: ${project.nazivPredmeta || project.projectCode} → ${value}`);
      }

      return nextProject;
    });
  }

  function saveSelectedProjectEdits() {
    setSaveMessage("Izmjene su sačuvane.");
    setTimeout(() => setSaveMessage(""), 2000);
  }

  function updateSelectedOfferItem(itemId, field, value) {
    if (!selectedProject) return;
    updateSelectedProject((project) => {
      const nextItems = project.checklist.offerItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: field === "quantity" || field === "unitPrice" ? Number(value || 0) : value,
            }
          : item
      );

      return {
        ...project,
        checklist: recalcChecklist({ ...project.checklist, offerItems: nextItems }),
      };
    });
  }

  function addOfferItem() {
    if (!selectedProject) return;
    updateSelectedProject((project) => {
      const nextItems = [
        ...(project.checklist.offerItems || []),
        makeOfferItem((project.checklist.offerItems?.length || 0) + 1),
      ];
      return { ...project, checklist: recalcChecklist({ ...project.checklist, offerItems: nextItems }) };
    });
  }

  function removeOfferItem(itemId) {
    if (!selectedProject) return;
    updateSelectedProject((project) => {
      const nextItems = (project.checklist.offerItems || []).filter((item) => item.id !== itemId);
      return {
        ...project,
        checklist: recalcChecklist({
          ...project.checklist,
          offerItems: nextItems.length ? nextItems : [makeOfferItem(1)],
        }),
      };
    });
  }

  async function selectBaseFolder() {
    if (!isDesktopAvailable()) {
      window.alert("Izbor foldera preko sistemskog dijaloga radi u desktop verziji.");
      return;
    }
    try {
      const result = await window.desktopAPI.selectBaseFolder();
      if (!result?.canceled && result?.folderPath) setBaseFolderPath(result.folderPath);
    } catch {
      window.alert("Folder nije mogao biti izabran.");
    }
  }

  async function openProjectFolder(project) {
    const folder = project?.folderPath || buildProjectFolderPath(baseFolderPath, project || {});
    if (!folder) return;

    if (isDesktopAvailable()) {
      const result = await window.desktopAPI.openFolder(folder);
      if (!result?.ok && result?.error) window.alert(result.error);
      return;
    }

    try {
      await window.navigator.clipboard.writeText(folder);
    } catch {}
    window.alert(`Putanja foldera:\n\n${folder}`);
  }

  async function addProject() {
    if (userRole !== "admin") {
      window.alert("Samo admin može kreirati nove predmete.");
      return;
    }
    const year = Number(newProject.projectYear || ACTIVE_YEAR);
    const sequence = Number(
      newProject.projectSequence ||
        projects.filter((project) => Number(project.projectYear || ACTIVE_YEAR) === year).length + 1
    );
    const projectDraft = {
      id: `PRJ-${Date.now()}`,
      ...newProject,
      projectYear: year,
      projectSequence: sequence,
      projectCode: buildProjectCode(sequence, newProject.startDate, year),
    };

    const created = normalizeProject({
      ...projectDraft,
      folderPath: buildProjectFolderPath(baseFolderPath, projectDraft),
      checklist: recalcChecklist({
        offerOpis: buildDefaultOfferDescription(projectDraft),
        pdvStopa: 21,
        phase1Description: DEFAULT_PHASE_1_TEXT,
        phase2Description: DEFAULT_PHASE_2_TEXT,
        offerItems: [makeOfferItem(1)],
      }),
    });

    if (!created.nazivPredmeta || !created.investitor) {
      window.alert("Unesi naziv predmeta i investitora.");
      return;
    }

    if (isDesktopAvailable() && created.folderPath) {
      try {
        await window.desktopAPI.createProjectFolder(created.folderPath);
      } catch {}
    }

    setProjects((current) => [created, ...current]);
    setSelectedId(created.id);
    setPage(accessMode === "worker" ? "worker" : "main");
    setPdfStatus("");
    setNewProject(
      emptyNewProject(
        projects.filter((project) => Number(project.projectYear || ACTIVE_YEAR) === year).length + 1,
        year
      )
    );
    showPopup(`Novi predmet dodat: ${created.nazivPredmeta || created.projectCode}`);
  }

  async function deleteProject(projectId) {
    if (!projectId) return;

    const project = projects.find((item) => item.id === projectId);
    const projectName = project?.nazivPredmeta || project?.projectCode || "odabrani predmet";

    const confirmed = window.confirm(
      `Da li sigurno želiš da obrišeš predmet:

${projectName}?

Predmet će biti obrisan iz aplikacije i online baze. Lokalni folder na računaru se neće brisati.`
    );

    if (!confirmed) return;

    const remainingProjects = projects.filter((item) => item.id !== projectId);
    setProjects(remainingProjects);
    setSelectedId(remainingProjects[0]?.id || null);

    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
      setSyncStatus("Predmet je obrisan i sinhronizovan online.");
    } catch (error) {
      console.error(error);
      setSyncStatus("Predmet je obrisan lokalno, ali brisanje online nije uspjelo.");
    }
  }

  function addNote() {
    if (!selectedProject || !newNote.trim()) return;
    const noteText = newNote.trim();

    updateSelectedProject((project) => ({
      ...project,
      notes: [
        {
          id: `NOTE-${Date.now()}`,
          text: noteText,
          createdAt: new Date().toLocaleString("sr-Latn-ME"),
          author: userName || "Korisnik",
        },
        ...project.notes,
      ],
    }));

    setNewNote("");
    showPopup(`Nova bilješka dodata: ${selectedProject.nazivPredmeta || selectedProject.projectCode}`);
  }

  function addOfferToProject() {
    if (userRole !== "admin") {
      window.alert("Samo admin može kreirati ponude.");
      return;
    }
    if (!selectedProject) return;

    const recalculated = recalcChecklist(selectedProject.checklist);
    const amount = Number(recalculated.ukupnaPonudaBezPdv || 0);
    const pdvStopa = Number(recalculated.pdvStopa || 21);

    const offer = {
      id: `OFF-${Date.now()}`,
      number: recalculated.ponudaBroj || `${selectedProject.projectSequence}-${selectedProject.projectYear || ACTIVE_YEAR}`,
      date: recalculated.ponudaDatum || todayIso(),
      amount,
      description: buildDefaultOfferDescription(selectedProject),
      pdvStopa,
      items: recalculated.offerItems || [],
      phase1Description: recalculated.phase1Description || DEFAULT_PHASE_1_TEXT,
      phase2Description: recalculated.phase2Description || DEFAULT_PHASE_2_TEXT,
    };

    updateSelectedProject((project) => ({
      ...project,
      offers: [offer, ...project.offers],
      checklist: recalcChecklist({
        ...project.checklist,
        ponudaBroj: offer.number,
        ponudaDatum: offer.date,
        offerOpis: offer.description,
      }),
    }));

    setPdfStatus("Ponuda je upisana u projekat. Možeš je izvesti u PDF.");
  }

  async function exportOfferPdf(project) {
    if (userRole !== "admin") {
      window.alert("Samo admin može izvoziti ponude.");
      return;
    }
    if (!project) return;

    const checklist = recalcChecklist(project.checklist);
    const offer = project.offers[0] || {
      number: checklist.ponudaBroj || `${project.projectSequence}-${project.projectYear || ACTIVE_YEAR}`,
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
      const pageWidth = 210;
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      let y = 12;

      const clampText = (text, maxLength) => {
        const safe = sanitizePdfText(text || "");
        if (safe.length <= maxLength) return safe;
        return `${safe.slice(0, maxLength - 3)}...`;
      };

      const writeWrappedLimited = (text, x, yStart, maxWidth, lineHeight, maxLines, options = {}) => {
        const safe = sanitizePdfText(text || "");
        const lines = pdf.splitTextToSize(safe, maxWidth).slice(0, maxLines);
        if (lines.length === maxLines) {
          const lastIndex = lines.length - 1;
          const last = lines[lastIndex];
          if (last.length > 3) lines[lastIndex] = `${last.slice(0, Math.max(0, last.length - 3))}...`;
        }
        pdf.text(lines, x, yStart, options);
        return yStart + lines.length * lineHeight;
      };

      pdf.setFillColor(226, 232, 240);
      const headerH = 34;
      pdf.roundedRect(margin, y, contentWidth, headerH, 3, 3, "F");

      if (logoDataUrl) {
        try {
          const logoW = 44;
          const logoH = logoW / Math.max(logoAspectRatio, 0.1);
          const logoX = margin + 4;
          const logoY = y + (headerH - logoH) / 2;
          pdf.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
        } catch {}
      }

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("PONUDA", pageWidth - margin - 30, y + 13);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(sanitizePdfText(`br. ${offer.number}`), pageWidth - margin - 30, y + 21);

      y += headerH + 8;

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 16, 2, 2, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text("INVESTITOR", margin + 3, y + 5);
      pdf.text("BROJ PROJEKTA", margin + 70, y + 5);
      pdf.text("DATUM", margin + 140, y + 5);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(clampText(project.investitor || "-", 34), margin + 3, y + 11);
      pdf.text(clampText(project.projectCode || "-", 24), margin + 70, y + 11);
      pdf.text(sanitizePdfText(formatDisplayDate(offer.date) || "-"), margin + 140, y + 11);

      y += 22;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      y = writeWrappedLimited(
        `${offer.description} na katastarskoj parceli ${project.parcela || "-"}${
          project.katastarskaOpstina ? `, KO ${project.katastarskaOpstina}` : ""
        }${project.opstina ? `, ${project.opstina}` : ""}.`,
        margin,
        y,
        contentWidth,
        4.2,
        3
      );

      y += 5;

      const tableX = margin;
      const col1 = 82;
      const col2 = 24;
      const col3 = 36;
      const col4 = contentWidth - col1 - col2 - col3;
      const rowH = 7;
      const gap = 1.1;

      pdf.setFillColor(15, 23, 42);
      pdf.setTextColor(255, 255, 255);
      pdf.roundedRect(tableX, y, contentWidth, rowH, 1.3, 1.3, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text("Opis", tableX + 2, y + 4.7);
      pdf.text("Jedinica", tableX + col1 + 2, y + 4.7);
      pdf.text("Jed. cijena", tableX + col1 + col2 + 2, y + 4.7);
      pdf.text("Ukupno", tableX + col1 + col2 + col3 + 2, y + 4.7);
      y += rowH + gap;

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);

      const drawRow = (row, opts = {}) => {
        const bg = opts.bg || [248, 250, 252];
        const bold = Boolean(opts.bold);
        pdf.setFillColor(bg[0], bg[1], bg[2]);
        pdf.roundedRect(tableX, y, contentWidth, rowH, 1.2, 1.2, "F");
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.text(clampText(row[0], 38), tableX + 2, y + 4.7);
        pdf.text(clampText(row[1], 16), tableX + col1 + 2, y + 4.7);
        pdf.text(clampText(row[2], 18), tableX + col1 + col2 + 2, y + 4.7);
        pdf.text(clampText(row[3], 18), tableX + col1 + col2 + col3 + 2, y + 4.7);
        y += rowH + gap;
      };

      (offer.items || []).slice(0, 6).forEach((item) => {
        const total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        drawRow([
          String(item.description || ""),
          `${numberFormat(item.quantity || 0)} ${item.unitLabel || ""}`.trim(),
          `${numberFormat(item.unitPrice || 0)} €/${item.unitLabel || ""}`,
          numberFormat(total),
        ]);
      });

      const totalWithoutPdv = Number(checklist.ukupnaPonudaBezPdv || 0);
      const faza1 = Number(checklist.faza1 || 0);
      const faza2 = Number(checklist.faza2 || 0);
      const pdvIznos = totalWithoutPdv * (Number(checklist.pdvStopa || 21) / 100);
      const totalWithPdv = Number(checklist.ukupnoSaPdv || 0);

      drawRow(["FAZA I", "60%", "/", numberFormat(faza1)], { bg: [241, 245, 249] });
      drawRow(["FAZA II", "40%", "/", numberFormat(faza2)], { bg: [241, 245, 249] });
      drawRow(["UKUPNO", "", "", numberFormat(totalWithoutPdv)], { bg: [235, 240, 246], bold: true });
      drawRow([`PDV ${checklist.pdvStopa || 21}%`, "", "", numberFormat(pdvIznos)], {
        bg: [235, 240, 246],
        bold: true,
      });
      drawRow(["UKUPNO + PDV", "", "", numberFormat(totalWithPdv)], {
        bg: [214, 221, 230],
        bold: true,
      });

      y += 3;

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text("FAZA I", margin + 3, y + 5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      writeWrappedLimited(checklist.phase1Description || DEFAULT_PHASE_1_TEXT, margin + 3, y + 10, contentWidth - 6, 3.4, 4);

      y += 26;

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text("FAZA II", margin + 3, y + 5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      writeWrappedLimited(checklist.phase2Description || DEFAULT_PHASE_2_TEXT, margin + 3, y + 10, contentWidth - 6, 3.4, 4);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(sanitizePdfText(`Podgorica, ${formatDisplayDate(offer.date)}.`), margin, 282);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("AVM architects d.o.o.", 145, 282);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      pdf.text("Andrija Vuksanovic", 145, 287);
      pdf.text("spec.Sci.arh. konzervator", 145, 291);

      const fileName = `Ponuda_${project.projectCode.replace(/[^\w.-]+/g, "_")}.pdf`;

      if (isDesktopAvailable() && window.desktopAPI?.savePdf) {
        try {
          const bytes = Array.from(new Uint8Array(pdf.output("arraybuffer")));
          const result = await window.desktopAPI.savePdf({
            folderPath: project.folderPath || buildProjectFolderPath(baseFolderPath, project),
            fileName,
            bytes,
          });
          if (result?.ok) {
            setPdfStatus(`PDF je sačuvan: ${result.outputPath}`);
            return;
          }
          pdf.save(fileName);
          setPdfStatus("PDF je preuzet lokalno jer desktop snimanje nije uspjelo.");
          return;
        } catch (error) {
          console.error(error);
          pdf.save(fileName);
          setPdfStatus("PDF je preuzet lokalno.");
          return;
        }
      }

      pdf.save(fileName);
      setPdfStatus("PDF je preuzet lokalno.");
    } catch (error) {
      console.error(error);
      setPdfStatus("Greška pri kreiranju PDF-a.");
    }
  }

  function updateChecklistField(field, value) {
    if (!selectedProject) return;
    updateSelectedProject((project) => ({
      ...project,
      checklist: recalcChecklist({ ...project.checklist, [field]: value }),
    }));
  }

  function exportChecklistCsv() {
    const rows = [
      [
        "Br projekta",
        "Naziv predmeta",
        "Investitor",
        "Projektant",
        "Vrsta radova",
        "Status",
        "Stadijum",
        "Ponuda br",
        "Ponuda datum",
        "Analiza zavrsena",
        "Analiza placena",
        "Pozitivno misljenje",
        "Projekat zavrsen",
        "Projekat placen",
        "Saglasnost",
        "Ukupno bez PDV",
        "Faza I",
        "Faza II",
        "Ostvarena naplata",
        "Ukupno sa PDV",
        "Godina",
        "Folder",
      ],
      ...projects.map((project) => [
        project.projectCode,
        project.nazivPredmeta,
        project.investitor,
        project.projektant,
        project.vrstaRadova,
        project.status,
        project.stage,
        project.checklist.ponudaBroj,
        project.checklist.ponudaDatum,
        project.checklist.analizaZavrsena,
        project.checklist.analizaPlacena,
        project.checklist.pozitivnoMisljenje,
        project.checklist.projekatZavrsen,
        project.checklist.projekatPlacen,
        project.checklist.saglasnostNaProjekat,
        project.checklist.ukupnaPonudaBezPdv,
        project.checklist.faza1,
        project.checklist.faza2,
        project.checklist.ostvarenaNaplata,
        project.checklist.ukupnoSaPdv,
        project.projectYear,
        project.folderPath || "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checklista_${ACTIVE_YEAR}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isAdmin = userRole === "admin" && accessMode === "admin";

  async function saveNow() {
    try {
      const normalizedProjects = projects.map(normalizeProject);
      const now = new Date().toISOString();

      setSyncStatus("Ručno čuvanje u toku...");

      if (session?.user?.id && userRole === "admin") {
        const rows = normalizedProjects.map((project) => ({
          id: project.id,
          owner_id: session.user.id,
          data: project,
          updated_at: now,
        }));

        const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedProjects));
      }

      setSyncStatus("Sačuvano.");
      showPopup("Podaci su ručno sačuvani.");
    } catch (error) {
      console.error(error);
      setSyncStatus("Greška pri ručnom čuvanju.");
      showPopup("Greška pri čuvanju podataka.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return <div style={styles.loginPage}>Učitavanje...</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div style={styles.page}>
      <PopupCenter notifications={notifications} />
      <div style={isMobile ? styles.shellMobile : styles.shell}>
        <aside style={isMobile ? styles.sidebarMobile : styles.sidebar}>
          <div style={styles.brandBox}>
            <div style={styles.brandLogoWrap}>
              <img src={logoUrl} alt="AVM logo" style={styles.brandLogo} />
            </div>
            <div style={styles.brandSubtitle}>Evidencija projekata</div>
          </div>

          {userRole === "admin" && (
            <button style={page === "main" ? styles.navActive : styles.navButton} onClick={() => setPage("main")}>
              <ShieldCheck size={18} /> MAIN page
            </button>
          )}

          {userRole === "admin" && (
            <button style={page === "offers" ? styles.navActive : styles.navButton} onClick={() => setPage("offers")}>
              <FileText size={18} /> Ponude
            </button>
          )}

          <button style={page === "checklist" ? styles.navActive : styles.navButton} onClick={() => setPage("checklist")}>
            <ClipboardList size={18} /> Checklista
          </button>

          <button style={page === "worker" ? styles.navActive : styles.navButton} onClick={() => setPage("worker")}>
            <User size={18} /> Radnik pogled
          </button>

          <div style={styles.sideSection}>
            <div style={styles.smallTitle}>Pristup</div>
            <div style={styles.row}>
              {userRole === "admin" && (
                <button onClick={() => setAccessMode("admin")} style={accessMode === "admin" ? styles.chipActive : styles.chip}>
                  Admin
                </button>
              )}
              <button onClick={() => setAccessMode("worker")} style={accessMode === "worker" ? styles.chipActive : styles.chip}>
                Radnik
              </button>
            </div>
          </div>

          <div style={styles.sideSection}>
            <div style={styles.smallTitle}>Godina</div>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={styles.input}>
              <option value="all">Sve godine</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div style={styles.sideSection}>
            <div style={styles.smallTitle}>Pretraga</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Traži projekat..." style={styles.input} />
          </div>

          <div style={styles.sideSection}>
            <div style={styles.smallTitle}>Projekti</div>
            <div style={styles.projectList}>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  style={selectedId === project.id ? styles.projectItemActive : styles.projectItem}
                >
                  <div style={styles.projectCode}>{project.projectCode}</div>
                  <div style={styles.projectName}>{project.nazivPredmeta || "Bez naziva"}</div>
                  <div style={styles.projectMetaMini}>{project.investitor || "—"}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main style={isMobile ? styles.mainMobile : styles.main}>
          <div style={isMobile ? styles.headerMobile : styles.header}>
            <div>
              <h1 style={styles.h1}>AVM Evidencija Projekata</h1>
              <div style={styles.subtitle}>
                Evidencija je vezana za tekuću godinu {ACTIVE_YEAR}. Desktop folder logika je uključena.
              </div>
              <div style={styles.syncStatus}>{syncStatus}</div>
            </div>
            <div style={isMobile ? styles.headerButtonsMobile : styles.headerButtons}>
              <div style={styles.userBadge}>
                {userName} ({userRole})
              </div>
              <button onClick={saveNow} style={styles.buttonSoft}>
                Sačuvaj
              </button>
              <button onClick={logout} style={styles.buttonSoft}>
                Odjavi se
              </button>
              {isAdmin && (
                <button onClick={exportChecklistCsv} style={styles.buttonSoft}>
                  <FileText size={16} /> Export checkliste
                </button>
              )}
            </div>
          </div>

          {page === "main" && (
            <div style={styles.gridMain}>
              <section style={styles.card}>
                <div style={styles.cardTitle}>
                  <Plus size={18} /> Novi predmet
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.metaCard}>
                    <div style={styles.metaLabel}>Br. projekta</div>
                    <div style={styles.metaValue}>{nextProjectCode}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                    <input
                      value={baseFolderPath}
                      onChange={(e) => setBaseFolderPath(e.target.value)}
                      placeholder="Bazna lokacija foldera, npr. C:/AVM/Projekti"
                      style={styles.input}
                    />
                    <button onClick={selectBaseFolder} style={styles.button}>
                      <FolderOpen size={16} /> Izaberi folder
                    </button>
                  </div>

                  <div style={styles.metaCard}>
                    <div style={styles.metaLabel}>Preview foldera projekta</div>
                    <div style={{ ...styles.metaValue, fontSize: 13, wordBreak: "break-word" }}>
                      {nextProjectFolderPreview || "—"}
                    </div>
                  </div>

                  <Input label="Godina evidencije" type="number" value={newProject.projectYear} onChange={(e) => {
                    const year = Number(e.target.value || ACTIVE_YEAR);
                    const suggested = projects.filter((project) => Number(project.projectYear || ACTIVE_YEAR) === year).length + 1;
                    setNewProject((p) => ({ ...p, projectYear: year, projectSequence: suggested }));
                  }} />
                  <Input label="Redni broj u godini" type="number" value={newProject.projectSequence} onChange={(e) => setNewProject((p) => ({ ...p, projectSequence: Number(e.target.value || 1) }))} />
                  <Input label="Naziv predmeta" value={newProject.nazivPredmeta} onChange={(e) => setNewProject((p) => ({ ...p, nazivPredmeta: e.target.value }))} />
                  <Input label="Investitor" value={newProject.investitor} onChange={(e) => setNewProject((p) => ({ ...p, investitor: e.target.value }))} />
                  <Input label="Projektant" value={newProject.projektant} onChange={(e) => setNewProject((p) => ({ ...p, projektant: e.target.value }))} />
                  <Input label="Vrsta radova" placeholder="npr. izgradnja, rekonstrukcija, sanacija" value={newProject.vrstaRadova} onChange={(e) => setNewProject((p) => ({ ...p, vrstaRadova: e.target.value }))} />
                  <Input label="Katastarska parcela" value={newProject.parcela} onChange={(e) => setNewProject((p) => ({ ...p, parcela: e.target.value }))} />
                  <Input label="Katastarska opština" value={newProject.katastarskaOpstina} onChange={(e) => setNewProject((p) => ({ ...p, katastarskaOpstina: e.target.value }))} />
                  <Input label="Urbanistička parcela" value={newProject.urbanistickaParcela} onChange={(e) => setNewProject((p) => ({ ...p, urbanistickaParcela: e.target.value }))} />
                  <Input label="Opština" value={newProject.opstina} onChange={(e) => setNewProject((p) => ({ ...p, opstina: e.target.value }))} />
                  <Input label="Planski dokument" value={newProject.planskiDokument} onChange={(e) => setNewProject((p) => ({ ...p, planskiDokument: e.target.value }))} />
                  <Input label="Datum početka" type="date" value={newProject.startDate} onChange={(e) => setNewProject((p) => ({ ...p, startDate: e.target.value }))} />
                  <Input label="Google Maps link / lokacija" value={newProject.googleMapsLink} onChange={(e) => setNewProject((p) => ({ ...p, googleMapsLink: e.target.value }))} />
                  <TextArea label="Opis" rows={4} value={newProject.opis} onChange={(e) => setNewProject((p) => ({ ...p, opis: e.target.value }))} />
                </div>

                <button onClick={addProject} style={styles.buttonPrimary}>
                  <Plus size={16} /> Dodaj predmet
                </button>
              </section>

              <section style={styles.card}>
                <div style={styles.cardTitle}>
                  <ShieldCheck size={18} /> Detalji i izmjena predmeta
                </div>

                {selectedProject ? (
                  <>
                    <div style={styles.infoGrid}>
                      <MetaCard label="Br. projekta" value={selectedProject.projectCode} />
                      <MetaCard label="Godina" value={selectedProject.projectYear} />
                      <MetaCard label="Vrsta radova" value={selectedProject.vrstaRadova} />
                      <MetaCard label="Folder projekta" value={selectedProject.folderPath || buildProjectFolderName(selectedProject)} />
                      <MetaCard label="Status" value={selectedProject.status} />
                    </div>

                    <div style={styles.cardInset}>
                      <div style={styles.cardTitleSmall}>
                        <Pencil size={16} /> Uredi odabrani predmet
                      </div>

                      <div style={styles.formGrid}>
                        <Input label="Godina evidencije" type="number" value={selectedProject.projectYear} onChange={(e) => updateSelectedProjectField("projectYear", Number(e.target.value || ACTIVE_YEAR))} />
                        <Input label="Redni broj u godini" type="number" value={selectedProject.projectSequence} onChange={(e) => updateSelectedProjectField("projectSequence", Number(e.target.value || 1))} />
                        <Input label="Naziv predmeta" value={selectedProject.nazivPredmeta} onChange={(e) => updateSelectedProjectField("nazivPredmeta", e.target.value)} />
                        <Input label="Investitor" value={selectedProject.investitor} onChange={(e) => updateSelectedProjectField("investitor", e.target.value)} />
                        <Input label="Projektant" value={selectedProject.projektant} onChange={(e) => updateSelectedProjectField("projektant", e.target.value)} />
                        <Input label="Vrsta radova" value={selectedProject.vrstaRadova} onChange={(e) => updateSelectedProjectField("vrstaRadova", e.target.value)} />
                        <Input label="Katastarska parcela" value={selectedProject.parcela} onChange={(e) => updateSelectedProjectField("parcela", e.target.value)} />
                        <Input label="Katastarska opština" value={selectedProject.katastarskaOpstina} onChange={(e) => updateSelectedProjectField("katastarskaOpstina", e.target.value)} />
                        <Input label="Urbanistička parcela" value={selectedProject.urbanistickaParcela} onChange={(e) => updateSelectedProjectField("urbanistickaParcela", e.target.value)} />
                        <Input label="Opština" value={selectedProject.opstina} onChange={(e) => updateSelectedProjectField("opstina", e.target.value)} />
                        <Input label="Planski dokument" value={selectedProject.planskiDokument} onChange={(e) => updateSelectedProjectField("planskiDokument", e.target.value)} />
                        <Input label="Datum početka" type="date" value={selectedProject.startDate} onChange={(e) => updateSelectedProjectField("startDate", e.target.value)} />
                        <Input label="Google Maps link / lokacija" value={selectedProject.googleMapsLink} onChange={(e) => updateSelectedProjectField("googleMapsLink", e.target.value)} />
                        <TextArea label="Opis" rows={4} value={selectedProject.opis} onChange={(e) => updateSelectedProjectField("opis", e.target.value)} />
                      </div>

                      <div style={styles.rowWrap}>
                        <button onClick={saveSelectedProjectEdits} style={styles.buttonPrimary}>
                          <Save size={16} /> Sačuvaj izmjene
                        </button>
                      </div>

                      <div style={styles.pdfStatus}>{saveMessage || "Izmjene se čuvaju lokalno u aplikaciji."}</div>
                    </div>

                    <div style={styles.cardInset}>
                      <div style={styles.cardTitleSmall}>
                        <MapPin size={16} /> Mini mapa lokacije
                      </div>
                      <MapPreview value={selectedProject.googleMapsLink} />
                    </div>

                    <div style={styles.rowWrap}>
                      <button onClick={() => openProjectFolder(selectedProject)} style={styles.button}>
                        <FolderOpen size={16} /> Otvori folder projekta
                      </button>
                      {isAdmin && (
                        <button onClick={() => deleteProject(selectedProject.id)} style={styles.buttonDanger}>
                          <Trash2 size={16} /> Obriši predmet
                        </button>
                      )}
                    </div>

                    <div style={styles.cardInset}>
                      <div style={styles.smallTitle}>Promjena statusa</div>
                      <div style={styles.rowWrap}>
                        <Select label="Status projekta" value={selectedProject.status} onChange={(e) => updateSelectedProjectField("status", e.target.value)}>
                          <option>U toku</option>
                          <option>Čeka investitora</option>
                          <option>Završeno</option>
                          <option>Na čekanju</option>
                        </Select>

                        <Select label="Stadijum projekta" value={selectedProject.stage} onChange={(e) => updateSelectedProjectField("stage", e.target.value)}>
                          <option>Pokrenuto</option>
                          <option>Konzervatorska analiza</option>
                          <option>Konzervatorski projekat</option>
                          <option>Predato</option>
                        </Select>
                      </div>
                    </div>

                    <NotesPanel newNote={newNote} setNewNote={setNewNote} addNote={addNote} selectedProject={selectedProject} />
                  </>
                ) : (
                  <div style={styles.emptyText}>Dodaj prvi predmet.</div>
                )}
              </section>
            </div>
          )}

          {page === "offers" && isAdmin && (
            <OffersPage
              selectedProject={selectedProject}
              updateChecklistField={updateChecklistField}
              updateSelectedOfferItem={updateSelectedOfferItem}
              removeOfferItem={removeOfferItem}
              addOfferItem={addOfferItem}
              addOfferToProject={addOfferToProject}
              exportOfferPdf={exportOfferPdf}
              pdfStatus={pdfStatus}
            />
          )}

          {page === "checklist" && (
            <ChecklistPage projects={projects} isAdmin={isAdmin} accessMode={accessMode} setSelectedId={setSelectedId} setPage={setPage} />
          )}

          {page === "worker" && (
            <WorkerPage
              selectedProject={selectedProject}
              isAdmin={isAdmin}
              newNote={newNote}
              setNewNote={setNewNote}
              addNote={addNote}
              updateSelectedProjectField={updateSelectedProjectField}
              updateChecklistField={updateChecklistField}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function PopupCenter({ notifications }) {
  if (!notifications.length) return null;

  return (
    <div style={styles.popupCenter}>
      {notifications.map((item) => (
        <div key={item.id} style={styles.popupItem}>
          <div style={styles.popupTitle}>Obavještenje</div>
          <div style={styles.popupMessage}>{item.message}</div>
          <div style={styles.popupTime}>{item.createdAt}</div>
        </div>
      ))}
    </div>
  );
}

function NotesPanel({ newNote, setNewNote, addNote, selectedProject }) {
  return (
    <div style={styles.cardInset}>
      <div style={styles.cardTitleSmall}>
        <StickyNote size={16} /> Bilješke
      </div>
      <TextArea label="Nova bilješka" rows={4} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
      <button onClick={addNote} style={styles.button}>
        <Plus size={16} /> Dodaj bilješku
      </button>
      <div style={styles.notesList}>
        {selectedProject.notes.length ? (
          selectedProject.notes.map((note) => (
            <div key={note.id} style={styles.noteItem}>
              <div style={styles.noteMeta}>{note.author} · {note.createdAt}</div>
              <div>{note.text}</div>
            </div>
          ))
        ) : (
          <div style={styles.emptyText}>Još nema bilješki.</div>
        )}
      </div>
    </div>
  );
}

function OffersPage({
  selectedProject,
  updateChecklistField,
  updateSelectedOfferItem,
  removeOfferItem,
  addOfferItem,
  addOfferToProject,
  exportOfferPdf,
  pdfStatus,
}) {
  return (
    <div style={styles.gridMain}>
      <section style={styles.card}>
        <div style={styles.cardTitle}>
          <FileText size={18} /> Ponuda za odabrani projekat
        </div>

        {selectedProject ? (
          <>
            <div style={styles.infoGrid}>
              <MetaCard label="Br. projekta" value={selectedProject.projectCode} />
              <MetaCard label="Naziv predmeta" value={selectedProject.nazivPredmeta} />
              <MetaCard label="Investitor" value={selectedProject.investitor} />
              <MetaCard label="Vrsta radova" value={selectedProject.vrstaRadova} />
            </div>

            <div style={styles.cardInset}>
              <div style={styles.cardTitleSmall}>
                <FileText size={16} /> Osnovni podaci ponude
              </div>
              <div style={styles.formGrid}>
                <Input label="Broj ponude" value={selectedProject.checklist.ponudaBroj} onChange={(e) => updateChecklistField("ponudaBroj", e.target.value)} />
                <Input label="Datum ponude" type="date" value={selectedProject.checklist.ponudaDatum} onChange={(e) => updateChecklistField("ponudaDatum", e.target.value)} />
                <TextArea label="Opis ponude" rows={3} value={selectedProject.checklist.offerOpis || ""} onChange={(e) => updateChecklistField("offerOpis", e.target.value)} />
                <Input label="PDV stopa (%)" type="number" value={selectedProject.checklist.pdvStopa} onChange={(e) => updateChecklistField("pdvStopa", Number(e.target.value || 0))} />
              </div>
            </div>

            <div style={styles.cardInset}>
              <div style={styles.cardTitleSmall}>
                <ClipboardList size={16} /> Stavke obračuna
              </div>
              <div style={styles.offerItemsList}>
                {(selectedProject.checklist.offerItems || []).map((item, index) => {
                  const rowTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                  return (
                    <div key={item.id} style={styles.offerItemCard}>
                      <div style={styles.offerItemHeader}>
                        <div style={styles.offerItemTitle}>Stavka {index + 1}</div>
                        <button onClick={() => removeOfferItem(item.id)} style={styles.deleteButton}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={styles.offerItemGrid}>
                        <Input label="Opis stavke" value={item.description} onChange={(e) => updateSelectedOfferItem(item.id, "description", e.target.value)} />
                        <Input label="Kvadratura / količina" type="number" value={item.quantity} onChange={(e) => updateSelectedOfferItem(item.id, "quantity", e.target.value)} />
                        <Input label="Jedinica" value={item.unitLabel} onChange={(e) => updateSelectedOfferItem(item.id, "unitLabel", e.target.value)} />
                        <Input label="Jedinična cijena" type="number" value={item.unitPrice} onChange={(e) => updateSelectedOfferItem(item.id, "unitPrice", e.target.value)} />
                        <MetaCard label="Ukupno za stavku" value={currency(rowTotal)} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={addOfferItem} style={styles.button}>
                <Plus size={16} /> Dodaj novu stavku
              </button>
            </div>

            <div style={styles.cardInset}>
              <div style={styles.cardTitleSmall}>
                <FileText size={16} /> Opis faza
              </div>
              <TextArea label="FAZA I opis" rows={5} value={selectedProject.checklist.phase1Description || ""} onChange={(e) => updateChecklistField("phase1Description", e.target.value)} />
              <TextArea label="FAZA II opis" rows={5} value={selectedProject.checklist.phase2Description || ""} onChange={(e) => updateChecklistField("phase2Description", e.target.value)} />
            </div>

            <div style={styles.cardInset}>
              <div style={styles.cardTitleSmall}>
                <ClipboardList size={16} /> Automatski obračun
              </div>
              <div style={styles.infoGrid}>
                <MetaCard label="Ukupno bez PDV" value={currency(selectedProject.checklist.ukupnaPonudaBezPdv)} />
                <MetaCard label="FAZA I 60%" value={currency(selectedProject.checklist.faza1)} />
                <MetaCard label="FAZA II 40%" value={currency(selectedProject.checklist.faza2)} />
                <MetaCard label="Ukupno + PDV" value={currency(selectedProject.checklist.ukupnoSaPdv)} />
              </div>
            </div>

            <div style={styles.rowWrap}>
              <button onClick={addOfferToProject} style={styles.button}>
                <FileText size={16} /> Kreiraj ponudu
              </button>
              <button onClick={() => exportOfferPdf(selectedProject)} style={styles.buttonPrimary}>
                <FileText size={16} /> Izvezi ponudu kao PDF
              </button>
            </div>

            <div style={styles.pdfStatus}>{pdfStatus || "Ovdje će se prikazivati status kreiranja i izvoza ponude."}</div>
          </>
        ) : (
          <div style={styles.emptyText}>Nema odabranog projekta.</div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.cardTitle}>
          <ClipboardList size={18} /> Pregled ponude u checklisti
        </div>
        {selectedProject ? (
          <div style={styles.infoGrid}>
            <MetaCard label="Ponuda broj" value={selectedProject.checklist.ponudaBroj} />
            <MetaCard label="Ponuda datum" value={formatDisplayDate(selectedProject.checklist.ponudaDatum)} />
            <MetaCard label="Opis ponude" value={selectedProject.checklist.offerOpis} />
            <MetaCard label="Ukupno bez PDV" value={currency(selectedProject.checklist.ukupnaPonudaBezPdv)} />
            <MetaCard label="FAZA I 60%" value={currency(selectedProject.checklist.faza1)} />
            <MetaCard label="FAZA II 40%" value={currency(selectedProject.checklist.faza2)} />
          </div>
        ) : (
          <div style={styles.emptyText}>Nema odabranog projekta.</div>
        )}
      </section>
    </div>
  );
}

function ChecklistPage({ projects, isAdmin, accessMode, setSelectedId, setPage }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardTitle}>
        <ClipboardList size={18} /> Checklista svih projekata
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Br projekta</th>
              <th>Godina</th>
              <th>Naziv</th>
              <th>Vrsta radova</th>
              <th>Status</th>
              <th>Stadijum</th>
              {isAdmin && <th>Ponuda</th>}
              <th>Analiza završena</th>
              <th>Projekat završen</th>
              {isAdmin && <th>Bez PDV</th>}
              {isAdmin && <th>Faza I</th>}
              {isAdmin && <th>Faza II</th>}
              {isAdmin && <th>Naplata</th>}
              {isAdmin && <th>+ PDV</th>}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedId(project.id);
                  setPage(accessMode === "worker" ? "worker" : "main");
                }}
              >
                <td>{project.projectCode}</td>
                <td>{project.projectYear || ACTIVE_YEAR}</td>
                <td>{project.nazivPredmeta}</td>
                <td>{project.vrstaRadova || "—"}</td>
                <td>{project.status}</td>
                <td>{project.stage}</td>
                {isAdmin && (
                  <td>
                    {project.checklist.ponudaBroj
                      ? `${project.checklist.ponudaBroj} / ${formatDisplayDate(project.checklist.ponudaDatum) || ""}`
                      : "—"}
                  </td>
                )}
                <td>{project.checklist.analizaZavrsena || "—"}</td>
                <td>{project.checklist.projekatZavrsen || "—"}</td>
                {isAdmin && <td>{currency(project.checklist.ukupnaPonudaBezPdv)}</td>}
                {isAdmin && <td>{currency(project.checklist.faza1)}</td>}
                {isAdmin && <td>{currency(project.checklist.faza2)}</td>}
                {isAdmin && <td>{currency(project.checklist.ostvarenaNaplata)}</td>}
                {isAdmin && <td>{currency(project.checklist.ukupnoSaPdv)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkerPage({ selectedProject, isAdmin, newNote, setNewNote, addNote, updateSelectedProjectField, updateChecklistField }) {
  return (
    <div style={styles.gridMain}>
      <section style={styles.card}>
        <div style={styles.cardTitle}>
          <User size={18} /> Radnički pogled
        </div>
        {selectedProject ? (
          <>
            <div style={styles.infoGrid}>
              <MetaCard label="Br. projekta" value={selectedProject.projectCode} />
              <MetaCard label="Naziv predmeta" value={selectedProject.nazivPredmeta} />
              <MetaCard label="Investitor" value={selectedProject.investitor} />
              <MetaCard label="Vrsta radova" value={selectedProject.vrstaRadova} />
              <MetaCard label="Status" value={selectedProject.status} />
              <MetaCard label="Stadijum" value={selectedProject.stage} />
            </div>

            <div style={styles.cardInset}>
              <div style={styles.cardTitleSmall}>
                <MapPin size={16} /> Mini mapa lokacije
              </div>
              <MapPreview value={selectedProject.googleMapsLink} />
            </div>

            <div style={styles.rowWrap}>
              <Select label="Status projekta" value={selectedProject.status} onChange={(e) => updateSelectedProjectField("status", e.target.value)}>
                <option>U toku</option>
                <option>Čeka investitora</option>
                <option>Završeno</option>
                <option>Na čekanju</option>
              </Select>
              <Select label="Stadijum projekta" value={selectedProject.stage} onChange={(e) => updateSelectedProjectField("stage", e.target.value)}>
                <option>Pokrenuto</option>
                <option>Konzervatorska analiza</option>
                <option>Konzervatorski projekat</option>
                <option>Predato</option>
              </Select>
            </div>

            <NotesPanel newNote={newNote} setNewNote={setNewNote} addNote={addNote} selectedProject={selectedProject} />
          </>
        ) : (
          <div style={styles.emptyText}>Nema odabranog projekta.</div>
        )}
      </section>

      {selectedProject && isAdmin && (
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            <ClipboardList size={18} /> Checklista odabranog projekta
          </div>
          <div style={styles.formGrid}>
            <Input label="Ponuda broj" value={selectedProject.checklist.ponudaBroj} onChange={(e) => updateChecklistField("ponudaBroj", e.target.value)} />
            <Input label="Ponuda datum" type="date" value={selectedProject.checklist.ponudaDatum} onChange={(e) => updateChecklistField("ponudaDatum", e.target.value)} />
            <Input label="Analiza završena" type="date" value={selectedProject.checklist.analizaZavrsena} onChange={(e) => updateChecklistField("analizaZavrsena", e.target.value)} />
            <Input label="Analiza plaćena" type="date" value={selectedProject.checklist.analizaPlacena} onChange={(e) => updateChecklistField("analizaPlacena", e.target.value)} />
            <Input label="Pozitivno mišljenje" type="date" value={selectedProject.checklist.pozitivnoMisljenje} onChange={(e) => updateChecklistField("pozitivnoMisljenje", e.target.value)} />
            <Input label="Projekat završen" type="date" value={selectedProject.checklist.projekatZavrsen} onChange={(e) => updateChecklistField("projekatZavrsen", e.target.value)} />
            <Input label="Projekat plaćen" type="date" value={selectedProject.checklist.projekatPlacen} onChange={(e) => updateChecklistField("projekatPlacen", e.target.value)} />
            <Input label="Saglasnost na projekat" type="date" value={selectedProject.checklist.saglasnostNaProjekat} onChange={(e) => updateChecklistField("saglasnostNaProjekat", e.target.value)} />
            <Input label="Ukupno bez PDV" type="number" value={selectedProject.checklist.ukupnaPonudaBezPdv} onChange={(e) => updateChecklistField("ukupnaPonudaBezPdv", Number(e.target.value || 0))} />
            <Input label="FAZA I 60%" type="number" value={selectedProject.checklist.faza1} onChange={(e) => updateChecklistField("faza1", Number(e.target.value || 0))} />
            <Input label="FAZA II 40%" type="number" value={selectedProject.checklist.faza2} onChange={(e) => updateChecklistField("faza2", Number(e.target.value || 0))} />
            <Input label="Ostvarena naplata" type="number" value={selectedProject.checklist.ostvarenaNaplata} onChange={(e) => updateChecklistField("ostvarenaNaplata", Number(e.target.value || 0))} />
            <Input label="Ukupno + PDV" type="number" value={selectedProject.checklist.ukupnoSaPdv} onChange={(e) => updateChecklistField("ukupnoSaPdv", Number(e.target.value || 0))} />
          </div>
        </section>
      )}
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    color: "#0f172a",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  loginLogo: {
    width: 150,
    height: "auto",
    objectFit: "contain",
    alignSelf: "center",
    marginBottom: 8,
  },
  loginTitle: {
    margin: 0,
    textAlign: "center",
    fontSize: 28,
    fontWeight: 900,
  },
  loginSubtitle: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    marginBottom: 8,
  },
  loginMessage: {
    color: "#b91c1c",
    background: "#fff1f2",
    border: "1px solid #fecaca",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
  },
  userBadge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
  },
  syncStatus: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    color: "#0f172a",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", minHeight: "100vh" },
  shellMobile: { display: "flex", flexDirection: "column", minHeight: "100vh" },
  sidebar: {
    background: "#0f172a",
    color: "#e2e8f0",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    borderRight: "1px solid #1e293b",
  },
  sidebarMobile: {
    background: "#0f172a",
    color: "#e2e8f0",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderBottom: "1px solid #1e293b",
  },
  brandBox: {
    padding: 18,
    borderRadius: 20,
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    border: "1px solid #334155",
  },
  brandLogoWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 },
  brandLogo: { maxWidth: "100%", maxHeight: 110, objectFit: "contain", display: "block" },
  brandSubtitle: { fontSize: 14, marginTop: 8, color: "#94a3b8", textAlign: "center" },
  navButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #334155",
    background: "transparent",
    color: "#e2e8f0",
    padding: "12px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 600,
  },
  navActive: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #cbd5e1",
    background: "#e2e8f0",
    color: "#0f172a",
    padding: "12px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
  },
  sideSection: { display: "flex", flexDirection: "column", gap: 10 },
  smallTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", fontWeight: 700 },
  row: { display: "flex", gap: 8 },
  chip: { border: "1px solid #334155", background: "transparent", color: "#e2e8f0", padding: "8px 12px", borderRadius: 999, cursor: "pointer" },
  chipActive: { border: "1px solid #cbd5e1", background: "#e2e8f0", color: "#0f172a", padding: "8px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 700 },
  projectList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: "45vh", overflowY: "auto" },
  projectItem: { textAlign: "left", padding: 12, borderRadius: 14, border: "1px solid #334155", background: "#111827", color: "#e2e8f0", cursor: "pointer" },
  projectItemActive: { textAlign: "left", padding: 12, borderRadius: 14, border: "1px solid #93c5fd", background: "#172554", color: "#eff6ff", cursor: "pointer" },
  projectCode: { fontSize: 12, fontWeight: 800, color: "#93c5fd" },
  projectName: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  projectMetaMini: { fontSize: 12, marginTop: 6, color: "#94a3b8" },
  main: { padding: 24, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 },
  mainMobile: { padding: 12, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
  headerMobile: { display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" },
  h1: { margin: 0, fontSize: "clamp(24px, 6vw, 34px)", fontWeight: 900 },
  subtitle: { marginTop: 8, color: "#475569", fontSize: 14 },
  headerButtons: { display: "flex", gap: 10, flexWrap: "wrap" },
  headerButtonsMobile: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" },
  gridMain: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
    gap: 20,
    alignItems: "start",
  },
  card: { background: "#ffffff", borderRadius: 24, padding: "clamp(14px, 3vw, 20px)", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)", border: "1px solid #e2e8f0", minWidth: 0 },
  cardInset: { marginTop: 18, padding: 16, borderRadius: 18, border: "1px solid #e2e8f0", background: "#f8fafc" },
  cardTitle: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18, marginBottom: 16 },
  cardTitleSmall: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 15, marginBottom: 10 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 700, color: "#334155" },
  input: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 14, padding: "12px 14px", fontSize: 14, outline: "none", background: "#ffffff", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 110, border: "1px solid #cbd5e1", borderRadius: 14, padding: "12px 14px", fontSize: 14, outline: "none", resize: "vertical", background: "#ffffff", boxSizing: "border-box" },
  button: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontWeight: 700 },
  buttonSoft: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontWeight: 700 },
  buttonPrimary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #0f172a", background: "#0f172a", color: "#ffffff", borderRadius: 14, padding: "12px 16px", cursor: "pointer", fontWeight: 800, marginTop: 14 },
  deleteButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", borderRadius: 12, padding: 8, cursor: "pointer" },
  buttonDanger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #fecaca",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 14,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 },
  metaCard: { border: "1px solid #e2e8f0", borderRadius: 18, padding: 14, background: "#ffffff" },
  metaLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b", fontWeight: 800 },
  metaValue: { marginTop: 8, fontSize: 15, fontWeight: 700, color: "#0f172a" },
  rowWrap: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 },
  pdfStatus: { marginTop: 14, fontSize: 13, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px" },
  notesList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  noteItem: { border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "#ffffff" },
  noteMeta: { fontSize: 12, color: "#64748b", marginBottom: 6 },
  emptyText: { color: "#64748b", fontSize: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 860 },
  mapWrap: { display: "flex", flexDirection: "column", gap: 10 },
  mapFrame: { width: "100%", height: 260, border: "1px solid #cbd5e1", borderRadius: 16, background: "#ffffff" },
  mapButton: { display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", borderRadius: 14, padding: "10px 12px", width: "fit-content", fontWeight: 700 },
  mapEmpty: { border: "1px dashed #cbd5e1", borderRadius: 16, padding: 16, color: "#64748b", background: "#ffffff", lineHeight: 1.6 },
  mapCoords: { fontSize: 13, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px" },
  offerItemsList: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 },
  offerItemCard: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, background: "#ffffff" },
  offerItemHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  offerItemTitle: { fontWeight: 800, fontSize: 14 },
  offerItemGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 },
  popupCenter: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 340,
    maxWidth: "calc(100vw - 36px)",
  },
  popupItem: {
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: 18,
    padding: "14px 16px",
    boxShadow: "0 14px 35px rgba(15, 23, 42, 0.25)",
    border: "1px solid #334155",
  },
  popupTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#93c5fd",
    fontWeight: 900,
    marginBottom: 5,
  },
  popupMessage: {
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  popupTime: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 6,
  },
};

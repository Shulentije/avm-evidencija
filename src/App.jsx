import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import { createClient } from "@supabase/supabase-js";
import {
  FolderOpen, FileText, Plus, ClipboardList, StickyNote,
  ShieldCheck, User, MapPin, Trash2, ExternalLink, Pencil, Save,
  LayoutGrid, BarChart3, Table, ChevronRight, X, Download,
  LogOut, Search, Calendar, Users, Activity, Clock, Check,
  CheckSquare, Square, ListTodo, Circle, ChevronDown, Edit3,
} from "lucide-react";

/* ═══════════════════════════════════════════
   KONSTANTE & SUPABASE
   ═══════════════════════════════════════════ */
const STORAGE_BASE_KEY = "avm-evidencija-projekata";
const ACTIVE_YEAR = new Date().getFullYear();
const LEGACY_STORAGE_KEY = `${STORAGE_BASE_KEY}-${ACTIVE_YEAR}`;
const STORAGE_KEY = `${STORAGE_BASE_KEY}-all-years`;
const SETTINGS_KEY = `${STORAGE_BASE_KEY}-settings`;
const TASKS_KEY = `${STORAGE_BASE_KEY}-tasks`;
const CUSTOM_DATA_KEY = `${STORAGE_BASE_KEY}-custom-data`;

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ═══════════════════════════════════════════
   INK & MOSS PALETA
   ═══════════════════════════════════════════ */
const INK    = "#0e0e0e";
const MOSS   = "#0e0e0e";
const SAGE   = "#888888";
const LINEN  = "#fafafa";
const PAPER  = "#ffffff";
const RULE   = "#e0e0e0";
const MUTED  = "#999999";
const CREAM  = "#f5f5f5";
const DANGER = "#9b2c2c";
const DANGER_BG = "#fef2f2";
const DANGER_BORDER = "#e8c4c4";

const STATUS_COLORS = {
  "U toku": "#3d7a3d",
  "Čeka investitora": "#c4882d",
  "Na čekanju": "#8a8a8a",
  "Završeno": "#2d6bc4",
};

/* ═══════════════════════════════════════════
   PIPELINE FAZE
   ═══════════════════════════════════════════ */
const PIPELINE_STAGES = [
  "Ponuda",
  "Analiza lokacije",
  "Elaborat vizuelnog uticaja",
  "Konzervatorska analiza",
  "Čeka UZKD",
  "KP Glavni",
  "Završeno",
];

const STAGE_MAP_FROM_OLD = {
  "Pokrenuto": "Ponuda",
  "Elaborat VU": "Elaborat vizuelnog uticaja",
  "KP Idejno": "Konzervatorska analiza",
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
   RADNICI
   ═══════════════════════════════════════════ */
const RADNICI = [
  "Andrija Vuksanović",
  "Radnik 2",
  "Radnik 3",
  "Radnik 4",
];

/* ═══════════════════════════════════════════
   OPŠTINE CRNE GORE - Tablice za vozila
   ═══════════════════════════════════════════ */
const OPSTINE_CODES = [
  { name: "Podgorica",     code: "PG" },
  { name: "Nikšić",        code: "NK" },
  { name: "Bar",           code: "BR" },
  { name: "Budva",         code: "BD" },
  { name: "Kotor",         code: "KO" },
  { name: "Herceg Novi",   code: "HN" },
  { name: "Cetinje",       code: "CT" },
  { name: "Bijelo Polje",  code: "BP" },
  { name: "Pljevlja",      code: "PV" },
  { name: "Berane",        code: "BA" },
  { name: "Ulcinj",        code: "UL" },
  { name: "Tivat",         code: "TV" },
  { name: "Danilovgrad",   code: "DG" },
  { name: "Rožaje",        code: "RO" },
  { name: "Kolašin",       code: "KL" },
  { name: "Mojkovac",      code: "MK" },
  { name: "Plav",          code: "PL" },
  { name: "Žabljak",       code: "ŽB" },
  { name: "Šavnik",        code: "ŠA" },
  { name: "Andrijevica",   code: "AN" },
  { name: "Plužine",       code: "PŽ" },
  { name: "Gusinje",       code: "GU" },
  { name: "Tuzi",          code: "TZ" },
  { name: "Zeta",          code: "ZT" },
  { name: "Petnjica",      code: "PT" },
];

/* ═══════════════════════════════════════════
   KATASTARSKE OPŠTINE CRNE GORE
   Dvoslovne skraćenice; troslovna ako poklapanje
   ═══════════════════════════════════════════ */
const KATASTARSKE_OPSTINE = {
  "Podgorica": [
    { name: "Podgorica I", code: "P1" },
    { name: "Podgorica II", code: "P2" },
    { name: "Podgorica III", code: "P3" },
    { name: "Golubovci", code: "GL" },
    { name: "Dajbabe", code: "DA" },
    { name: "Donja Gorica", code: "DG" },
    { name: "Gornja Gorica", code: "GG" },
    { name: "Zagorič", code: "ZA" },
    { name: "Tološi", code: "TL" },
    { name: "Rogami", code: "RG" },
    { name: "Farmaci", code: "FA" },
    { name: "Barutana", code: "BT" },
    { name: "Konik", code: "KN" },
    { name: "Vranj", code: "VR" },
    { name: "Drač", code: "DR" },
    { name: "Mahala", code: "MH" },
    { name: "Botun", code: "BO" },
    { name: "Lješkopolje", code: "LJ" },
    { name: "Mataguži", code: "MT" },
    { name: "Momišići", code: "MM" },
    { name: "Dolovi", code: "DL" },
    { name: "Cijevna", code: "CI" },
    { name: "Bistrice", code: "BI" },
    { name: "Srpska", code: "SR" },
    { name: "Medun", code: "ME" },
    { name: "Ubli", code: "UB" },
    { name: "Bijelo Polje", code: "BP" },
    { name: "Beri", code: "BE" },
    { name: "Ponari", code: "PN" },
    { name: "Vukovci", code: "VU" },
    { name: "Gostilj", code: "GO" },
    { name: "Kakaricka Gora", code: "KG" },
    { name: "Ljajkovići", code: "LK" },
    { name: "Buronji", code: "BU" },
    { name: "Mrke", code: "MR" },
    { name: "Smokovac", code: "SM" },
    { name: "Kurilo", code: "KU" },
    { name: "Balabani", code: "BL" },
    { name: "Dinoša", code: "DN" },
    { name: "Kučke Korita", code: "KK" },
    { name: "Lješta", code: "LS" },
    { name: "Sijovac", code: "SJ" },
    { name: "Pelev Brijeg", code: "PB" },
    { name: "Liješnje", code: "LI" },
    { name: "Raći", code: "RA" },
    { name: "Milješ", code: "MI" },
    { name: "Dubrava", code: "DB" },
    { name: "Šušunja", code: "SU" },
    { name: "Orahovo", code: "OR" },
    { name: "Gornje Selo", code: "GS" },
    { name: "Donje Selo", code: "DS" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Nikšić": [
    { name: "Nikšić", code: "NK" },
    { name: "Kličevo", code: "KL" },
    { name: "Župa", code: "ZU" },
    { name: "Brezovik", code: "BZ" },
    { name: "Vidrovan", code: "VD" },
    { name: "Vir", code: "VI" },
    { name: "Grahovo", code: "GR" },
    { name: "Velimlje", code: "VL" },
    { name: "Dragovoljići", code: "DV" },
    { name: "Jasen", code: "JA" },
    { name: "Kuta", code: "KT" },
    { name: "Lukovo", code: "LU" },
    { name: "Oštrog", code: "OS" },
    { name: "Gornje Polje", code: "GP" },
    { name: "Donje Polje", code: "DP" },
    { name: "Stubica", code: "ST" },
    { name: "Trubjela", code: "TR" },
    { name: "Vilusi", code: "VS" },
    { name: "Ozrinići", code: "OZ" },
    { name: "Rudine", code: "RU" },
    { name: "Golija", code: "GO" },
    { name: "Koprivice", code: "KP" },
    { name: "Povija", code: "PV" },
    { name: "Broćanac", code: "BR" },
    { name: "Trebjesa", code: "TB" },
    { name: "Zaslap", code: "ZS" },
    { name: "Nudo", code: "NU" },
    { name: "Duga", code: "DU" },
    { name: "Miolje Polje", code: "MP" },
    { name: "Okolišta", code: "OK" },
    { name: "Rastovac", code: "RA" },
    { name: "Straševina", code: "SV" },
    { name: "Riječani", code: "RI" },
    { name: "Bogetići", code: "BG" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Bar": [
    { name: "Bar", code: "BA" },
    { name: "Stari Bar", code: "SB" },
    { name: "Sutomore", code: "SU" },
    { name: "Šušanj", code: "SS" },
    { name: "Čanj", code: "CA" },
    { name: "Dobre Vode", code: "DV" },
    { name: "Virpazar", code: "VP" },
    { name: "Polje", code: "PO" },
    { name: "Zaljevo", code: "ZL" },
    { name: "Ostros", code: "OS" },
    { name: "Mrkojevići", code: "MR" },
    { name: "Pecurice", code: "PE" },
    { name: "Tuđemili", code: "TU" },
    { name: "Crmnica", code: "CR" },
    { name: "Boljevići", code: "BO" },
    { name: "Limljani", code: "LI" },
    { name: "Sozina", code: "SO" },
    { name: "Dabezići", code: "DB" },
    { name: "Komansko Selo", code: "KS" },
    { name: "Burtaiši", code: "BU" },
    { name: "Tomba", code: "TO" },
    { name: "Kunje", code: "KU" },
    { name: "Pečurice", code: "PC" },
    { name: "Seoca", code: "SE" },
    { name: "Godinje", code: "GD" },
    { name: "Gleđica", code: "GL" },
    { name: "Gornja Brca", code: "GB" },
    { name: "Donja Brca", code: "DBC" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Budva": [
    { name: "Budva", code: "BD" },
    { name: "Bečići", code: "BC" },
    { name: "Petrovac", code: "PT" },
    { name: "Sveti Stefan", code: "SS" },
    { name: "Reževići", code: "RZ" },
    { name: "Pobori", code: "PB" },
    { name: "Prijevor", code: "PR" },
    { name: "Buljarica", code: "BU" },
    { name: "Pržno", code: "PZ" },
    { name: "Krimovica", code: "KR" },
    { name: "Lapčići", code: "LA" },
    { name: "Kuljače", code: "KU" },
    { name: "Markovići", code: "MK" },
    { name: "Podostrog", code: "PD" },
    { name: "Stanišići", code: "ST" },
    { name: "Dubovica", code: "DB" },
    { name: "Podbabac", code: "PBB" },
    { name: "Režine", code: "RE" },
    { name: "Brajići", code: "BJ" },
    { name: "Miločer", code: "MI" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Kotor": [
    { name: "Kotor I", code: "K1" },
    { name: "Kotor II", code: "K2" },
    { name: "Risan", code: "RI" },
    { name: "Perast", code: "PE" },
    { name: "Dobrota", code: "DO" },
    { name: "Orahovac", code: "OR" },
    { name: "Prčanj", code: "PR" },
    { name: "Stoliv", code: "ST" },
    { name: "Muo", code: "MU" },
    { name: "Škaljari", code: "SK" },
    { name: "Kavač", code: "KA" },
    { name: "Grbalj", code: "GR" },
    { name: "Bigova", code: "BI" },
    { name: "Krivošije", code: "KV" },
    { name: "Ledenice", code: "LE" },
    { name: "Morinj", code: "MO" },
    { name: "Lastva Grbaljska", code: "LG" },
    { name: "Vranovići", code: "VN" },
    { name: "Dub", code: "DU" },
    { name: "Mirac", code: "MI" },
    { name: "Bogdašići", code: "BG" },
    { name: "Gornji Stoliv", code: "GST" },
    { name: "Strp", code: "SP" },
    { name: "Lipci", code: "LI" },
    { name: "Prcanj II", code: "P2" },
    { name: "Kostanjica", code: "KS" },
    { name: "Ljuta", code: "LJ" },
    { name: "Radimno", code: "RA" },
    { name: "Šišići", code: "SI" },
    { name: "Sutvara", code: "SV" },
    { name: "Zalazi", code: "ZA" },
    { name: "Zlatne Njive", code: "ZN" },
    { name: "Kubasi", code: "KB" },
    { name: "Prijeradi", code: "PJ" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Herceg Novi": [
    { name: "Herceg Novi", code: "HN" },
    { name: "Igalo", code: "IG" },
    { name: "Bijela", code: "BI" },
    { name: "Baošići", code: "BS" },
    { name: "Kamenari", code: "KM" },
    { name: "Đenovići", code: "DJ" },
    { name: "Meljine", code: "ML" },
    { name: "Savina", code: "SA" },
    { name: "Topla", code: "TO" },
    { name: "Podi", code: "PD" },
    { name: "Sušćepan", code: "SU" },
    { name: "Kruševice", code: "KR" },
    { name: "Zelenika", code: "ZE" },
    { name: "Njivice", code: "NJ" },
    { name: "Mokrine", code: "MK" },
    { name: "Trebesinj", code: "TR" },
    { name: "Žvinje", code: "ZV" },
    { name: "Jošica", code: "JO" },
    { name: "Kameno", code: "KA" },
    { name: "Ratiševina", code: "RA" },
    { name: "Kutsko Polje", code: "KP" },
    { name: "Sasovići", code: "SS" },
    { name: "Svrčuge", code: "SG" },
    { name: "Mojdež", code: "MO" },
    { name: "Ubla", code: "UB" },
    { name: "Žlijebi", code: "ZL" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Cetinje": [
    { name: "Cetinje", code: "CE" },
    { name: "Njeguši", code: "NJ" },
    { name: "Bajice", code: "BJ" },
    { name: "Dobrsko Selo", code: "DS" },
    { name: "Čevo", code: "CV" },
    { name: "Bjelice", code: "BL" },
    { name: "Cuce", code: "CU" },
    { name: "Ćeklići", code: "CK" },
    { name: "Zaćir", code: "ZC" },
    { name: "Dubovo", code: "DB" },
    { name: "Gornji Ceklin", code: "GC" },
    { name: "Donji Ceklin", code: "DC" },
    { name: "Dragomi Do", code: "DD" },
    { name: "Erakovići", code: "ER" },
    { name: "Građani", code: "GR" },
    { name: "Jankovići", code: "JA" },
    { name: "Kosijeri", code: "KO" },
    { name: "Lipa", code: "LI" },
    { name: "Oćevići", code: "OC" },
    { name: "Ozrinići", code: "OZ" },
    { name: "Pačarađe", code: "PA" },
    { name: "Pejovići", code: "PE" },
    { name: "Prentin Do", code: "PD" },
    { name: "Riječani", code: "RI" },
    { name: "Trnjine", code: "TN" },
    { name: "Uba", code: "UB" },
    { name: "Ugnje", code: "UG" },
    { name: "Velestovo", code: "VE" },
    { name: "Vrba", code: "VB" },
    { name: "Zagrablje", code: "ZG" },
    { name: "Žanjev Do", code: "ZD" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Bijelo Polje": [
    { name: "Bijelo Polje", code: "BP" },
    { name: "Lješnica", code: "LJ" },
    { name: "Tomaševo", code: "TO" },
    { name: "Pavino Polje", code: "PP" },
    { name: "Zaton", code: "ZT" },
    { name: "Sutivan", code: "SU" },
    { name: "Lipnica", code: "LI" },
    { name: "Lozna", code: "LO" },
    { name: "Radojeva", code: "RD" },
    { name: "Rasovo", code: "RS" },
    { name: "Ravna Rijeka", code: "RR" },
    { name: "Ribarevine", code: "RB" },
    { name: "Cerovo", code: "CR" },
    { name: "Čokrlije", code: "CK" },
    { name: "Godijevo", code: "GD" },
    { name: "Gubavač", code: "GB" },
    { name: "Korita", code: "KR" },
    { name: "Kovren", code: "KV" },
    { name: "Kanje", code: "KA" },
    { name: "Majstorovina", code: "MA" },
    { name: "Milovo", code: "MI" },
    { name: "Mojstir", code: "MO" },
    { name: "Mioče", code: "MC" },
    { name: "Nedakusi", code: "ND" },
    { name: "Nikoljac", code: "NI" },
    { name: "Požeginja", code: "PZ" },
    { name: "Sušica", code: "SS" },
    { name: "Sipanje", code: "SP" },
    { name: "Stubo", code: "ST" },
    { name: "Vraneš", code: "VR" },
    { name: "Zatona", code: "ZA" },
    { name: "Bliškovo", code: "BL" },
    { name: "Babića Brijeg", code: "BB" },
    { name: "Laholo", code: "LA" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Pljevlja": [
    { name: "Pljevlja", code: "PL" },
    { name: "Gradac", code: "GR" },
    { name: "Hoćevina", code: "HO" },
    { name: "Brezna", code: "BZ" },
    { name: "Đurđevića Tara", code: "DT" },
    { name: "Kovač", code: "KV" },
    { name: "Boljanić", code: "BL" },
    { name: "Bobovo", code: "BB" },
    { name: "Boščinovići", code: "BO" },
    { name: "Crljenice", code: "CR" },
    { name: "Glibaći", code: "GL" },
    { name: "Gotovuša", code: "GO" },
    { name: "Ilino Brdo", code: "IB" },
    { name: "Jagodnje", code: "JA" },
    { name: "Kalušići", code: "KA" },
    { name: "Kosanica", code: "KS" },
    { name: "Kozica", code: "KO" },
    { name: "Lever Tara", code: "LT" },
    { name: "Maoče", code: "MA" },
    { name: "Mataruge", code: "MT" },
    { name: "Obarde", code: "OB" },
    { name: "Odžak", code: "OD" },
    { name: "Premćani", code: "PR" },
    { name: "Rabitlje", code: "RA" },
    { name: "Šljivansko", code: "SL" },
    { name: "Trnovice", code: "TR" },
    { name: "Zabrđe", code: "ZB" },
    { name: "Vrulja", code: "VR" },
    { name: "Vidre", code: "VD" },
    { name: "Warrino", code: "VA" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Berane": [
    { name: "Berane", code: "BE" },
    { name: "Donje Luge", code: "DL" },
    { name: "Gornje Luge", code: "GL" },
    { name: "Budimlja", code: "BU" },
    { name: "Dolac", code: "DO" },
    { name: "Buče", code: "BC" },
    { name: "Dapsiće", code: "DA" },
    { name: "Goražde", code: "GR" },
    { name: "Haremi", code: "HR" },
    { name: "Lužac", code: "LU" },
    { name: "Mašte", code: "MS" },
    { name: "Petnjik", code: "PT" },
    { name: "Polica", code: "PO" },
    { name: "Praćevac", code: "PR" },
    { name: "Rovca", code: "RV" },
    { name: "Štitari", code: "ST" },
    { name: "Vinicka", code: "VI" },
    { name: "Zagorje", code: "ZG" },
    { name: "Lubnice", code: "LB" },
    { name: "Pešca", code: "PE" },
    { name: "Kalica", code: "KA" },
    { name: "Mokra", code: "MK" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Ulcinj": [
    { name: "Ulcinj", code: "UL" },
    { name: "Donji Štoj", code: "DS" },
    { name: "Gornji Štoj", code: "GS" },
    { name: "Vladimir", code: "VL" },
    { name: "Kruče", code: "KR" },
    { name: "Zoganje", code: "ZO" },
    { name: "Štodra", code: "ST" },
    { name: "Brajša", code: "BR" },
    { name: "Pistula", code: "PI" },
    { name: "Mide", code: "MI" },
    { name: "Salč", code: "SA" },
    { name: "Pinješ", code: "PN" },
    { name: "Sutjel", code: "SJ" },
    { name: "Kodra", code: "KD" },
    { name: "Ambula", code: "AM" },
    { name: "Čurke", code: "CU" },
    { name: "Darza", code: "DA" },
    { name: "Kaliman", code: "KM" },
    { name: "Kolomza", code: "KO" },
    { name: "Mala Gorana", code: "MG" },
    { name: "Velika Gorana", code: "VG" },
    { name: "Možura", code: "MO" },
    { name: "Bijela Gora", code: "BG" },
    { name: "Ćurke", code: "CR" },
    { name: "Rastiš", code: "RS" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Tivat": [
    { name: "Tivat", code: "TV" },
    { name: "Donja Lastva", code: "DL" },
    { name: "Gornja Lastva", code: "GL" },
    { name: "Krtoli", code: "KR" },
    { name: "Lepetane", code: "LE" },
    { name: "Đuraševići", code: "DJ" },
    { name: "Krašići", code: "KS" },
    { name: "Bogišići", code: "BO" },
    { name: "Mrčevac", code: "MR" },
    { name: "Milovići", code: "MI" },
    { name: "Nikovići", code: "NI" },
    { name: "Radovići", code: "RA" },
    { name: "Gradiošnica", code: "GN" },
    { name: "Kavanjin", code: "KA" },
    { name: "Seljanovo", code: "SE" },
    { name: "Dumidran", code: "DM" },
    { name: "Gošići", code: "GO" },
    { name: "Ruljina", code: "RU" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Danilovgrad": [
    { name: "Danilovgrad", code: "DG" },
    { name: "Spuž", code: "SP" },
    { name: "Bjeloši", code: "BJ" },
    { name: "Bogetići", code: "BG" },
    { name: "Ćurilac", code: "CU" },
    { name: "Dolovi", code: "DL" },
    { name: "Frutak", code: "FR" },
    { name: "Gorica", code: "GO" },
    { name: "Gruda", code: "GR" },
    { name: "Jastreb", code: "JA" },
    { name: "Jelenak", code: "JE" },
    { name: "Kopito", code: "KP" },
    { name: "Kosić", code: "KS" },
    { name: "Kujava", code: "KU" },
    { name: "Lazine", code: "LA" },
    { name: "Martinići", code: "MR" },
    { name: "Novo Selo", code: "NS" },
    { name: "Orja Luka", code: "OL" },
    { name: "Petrovići", code: "PE" },
    { name: "Pješivci", code: "PJ" },
    { name: "Podstenje", code: "PO" },
    { name: "Slatina", code: "SL" },
    { name: "Tunjevo", code: "TU" },
    { name: "Viš", code: "VI" },
    { name: "Zagarač", code: "ZG" },
    { name: "Bandići", code: "BA" },
    { name: "Vučica", code: "VU" },
    { name: "Ždrebaonik", code: "ZD" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Rožaje": [
    { name: "Rožaje", code: "RO" },
    { name: "Bandžov", code: "BN" },
    { name: "Bać", code: "BA" },
    { name: "Biševo", code: "BI" },
    { name: "Besnik", code: "BS" },
    { name: "Bogajće", code: "BG" },
    { name: "Crnča", code: "CR" },
    { name: "Čokrlije", code: "CK" },
    { name: "Dračenovac", code: "DR" },
    { name: "Grižice", code: "GR" },
    { name: "Honsi", code: "HO" },
    { name: "Ibarac", code: "IB" },
    { name: "Jablanica", code: "JA" },
    { name: "Kalače", code: "KA" },
    { name: "Klanac", code: "KL" },
    { name: "Lovnička", code: "LO" },
    { name: "Paučina", code: "PA" },
    { name: "Plunce", code: "PL" },
    { name: "Seošnica", code: "SE" },
    { name: "Škrijelj", code: "SK" },
    { name: "Vuča", code: "VU" },
    { name: "Bać", code: "BC" },
    { name: "Đuranovića Luke", code: "DL" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Kolašin": [
    { name: "Kolašin", code: "KO" },
    { name: "Bakovići", code: "BA" },
    { name: "Bare Kraljske", code: "BK" },
    { name: "Drijenak", code: "DR" },
    { name: "Dulovine", code: "DU" },
    { name: "Gornje Lipovo", code: "GL" },
    { name: "Donje Lipovo", code: "DL" },
    { name: "Jasenova", code: "JA" },
    { name: "Mateševo", code: "MT" },
    { name: "Mioska", code: "MI" },
    { name: "Morača", code: "MO" },
    { name: "Osreci", code: "OS" },
    { name: "Padež", code: "PA" },
    { name: "Plana", code: "PL" },
    { name: "Požnja", code: "PO" },
    { name: "Redice", code: "RE" },
    { name: "Sjerogošte", code: "SJ" },
    { name: "Smailagića Polje", code: "SP" },
    { name: "Trmanje", code: "TR" },
    { name: "Trebaljevo", code: "TB" },
    { name: "Uljara", code: "UL" },
    { name: "Vladoš", code: "VL" },
    { name: "Liješnje", code: "LI" },
    { name: "Manastir Morača", code: "MM" },
    { name: "Crkvine", code: "CR" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Mojkovac": [
    { name: "Mojkovac", code: "MK" },
    { name: "Bistrica", code: "BI" },
    { name: "Dobrilovina", code: "DO" },
    { name: "Gojakovići", code: "GJ" },
    { name: "Gornja Polja", code: "GP" },
    { name: "Krstac", code: "KR" },
    { name: "Lepenac", code: "LE" },
    { name: "Podbišće", code: "PB" },
    { name: "Prošćenje", code: "PR" },
    { name: "Štitarica", code: "ST" },
    { name: "Slatina", code: "SL" },
    { name: "Tutići", code: "TU" },
    { name: "Crvena Lokva", code: "CL" },
    { name: "Bjelojevići", code: "BJ" },
    { name: "Jakovići", code: "JK" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Plav": [
    { name: "Plav", code: "PL" },
    { name: "Brezojevice", code: "BZ" },
    { name: "Bogajće", code: "BG" },
    { name: "Hoti", code: "HO" },
    { name: "Komarača", code: "KM" },
    { name: "Kruševo", code: "KR" },
    { name: "Meteh", code: "ME" },
    { name: "Murina", code: "MU" },
    { name: "Nokšiće", code: "NO" },
    { name: "Pepić", code: "PE" },
    { name: "Prnjavor", code: "PR" },
    { name: "Skić", code: "SK" },
    { name: "Velika", code: "VE" },
    { name: "Vusanje", code: "VU" },
    { name: "Gornja Ržanica", code: "GR" },
    { name: "Donja Ržanica", code: "DR" },
    { name: "Jara", code: "JA" },
    { name: "Martinoviće", code: "MR" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Žabljak": [
    { name: "Žabljak", code: "ZB" },
    { name: "Borje", code: "BO" },
    { name: "Bukovica", code: "BU" },
    { name: "Vrela", code: "VR" },
    { name: "Kovačka Dolina", code: "KD" },
    { name: "Mala Crna Gora", code: "MCG" },
    { name: "Tepca", code: "TE" },
    { name: "Virak", code: "VI" },
    { name: "Motički Gaj", code: "MG" },
    { name: "Javorje", code: "JA" },
    { name: "Pirlitor", code: "PI" },
    { name: "Boljane", code: "BL" },
    { name: "Nadgora", code: "NG" },
    { name: "Novakovići", code: "NK" },
    { name: "Šumanovac", code: "SM" },
    { name: "Tušinja", code: "TU" },
    { name: "Palež", code: "PZ" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Šavnik": [
    { name: "Šavnik", code: "SV" },
    { name: "Boan", code: "BO" },
    { name: "Bukovica", code: "BU" },
    { name: "Dubrovsko", code: "DB" },
    { name: "Komarnica", code: "KO" },
    { name: "Krnja Jela", code: "KJ" },
    { name: "Mljetičak", code: "ML" },
    { name: "Petnja", code: "PE" },
    { name: "Pošćenje", code: "PO" },
    { name: "Previš", code: "PR" },
    { name: "Tušina", code: "TU" },
    { name: "Bijela", code: "BI" },
    { name: "Gradina", code: "GR" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Andrijevica": [
    { name: "Andrijevica", code: "AN" },
    { name: "Andželati", code: "AZ" },
    { name: "Bojovići", code: "BJ" },
    { name: "Cecuni", code: "CC" },
    { name: "Đuliće", code: "DU" },
    { name: "Gnjili Potok", code: "GP" },
    { name: "Gornje Luge", code: "GL" },
    { name: "Jošanica", code: "JO" },
    { name: "Konjuhe", code: "KO" },
    { name: "Kralje", code: "KR" },
    { name: "Kutske Korita", code: "KK" },
    { name: "Prisoja", code: "PR" },
    { name: "Seoce", code: "SE" },
    { name: "Trepča", code: "TP" },
    { name: "Zabrđe", code: "ZB" },
    { name: "Trešnjevik", code: "TR" },
    { name: "Rijeka Marsenića", code: "RM" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Plužine": [
    { name: "Plužine", code: "PL" },
    { name: "Bezuje", code: "BZ" },
    { name: "Boričje", code: "BR" },
    { name: "Brljevo", code: "BL" },
    { name: "Crkvičko Polje", code: "CP" },
    { name: "Goransko", code: "GR" },
    { name: "Jezerine", code: "JE" },
    { name: "Mratinje", code: "MR" },
    { name: "Nedajno", code: "NE" },
    { name: "Rudinice", code: "RU" },
    { name: "Seljani", code: "SE" },
    { name: "Smriječno", code: "SM" },
    { name: "Stabna", code: "ST" },
    { name: "Unač", code: "UN" },
    { name: "Zabrđe", code: "ZB" },
    { name: "Stolac", code: "SO" },
    { name: "Šćepan Polje", code: "SP" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Gusinje": [
    { name: "Gusinje", code: "GU" },
    { name: "Dosuđe", code: "DO" },
    { name: "Grnčar", code: "GR" },
    { name: "Kruševo", code: "KR" },
    { name: "Martinović", code: "MR" },
    { name: "Vusanje", code: "VU" },
    { name: "Višnjevo", code: "VI" },
    { name: "Dolja", code: "DL" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Tuzi": [
    { name: "Tuzi", code: "TU" },
    { name: "Vranj", code: "VR" },
    { name: "Dinošo", code: "DN" },
    { name: "Sukuruć", code: "SU" },
    { name: "Kornet", code: "KO" },
    { name: "Hoti", code: "HO" },
    { name: "Milješ", code: "MI" },
    { name: "Vladne", code: "VL" },
    { name: "Dečić", code: "DE" },
    { name: "Skok", code: "SK" },
    { name: "Krnjice", code: "KR" },
    { name: "Vuksanlekići", code: "VK" },
    { name: "Arza", code: "AR" },
    { name: "Traboin", code: "TR" },
    { name: "Zatrijebač", code: "ZT" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Zeta": [
    { name: "Golubovci", code: "GL" },
    { name: "Balabani", code: "BL" },
    { name: "Berislavci", code: "BE" },
    { name: "Goljemadi", code: "GM" },
    { name: "Goričani", code: "GC" },
    { name: "Klopot", code: "KL" },
    { name: "Kurilo", code: "KU" },
    { name: "Mataguži", code: "MT" },
    { name: "Mojanovići", code: "MO" },
    { name: "Ponari", code: "PN" },
    { name: "Srpska", code: "SR" },
    { name: "Vukovci", code: "VU" },
    { name: "Gostilj", code: "GO" },
    { name: "Mahala", code: "MH" },
    { name: "Dajbabe", code: "DA" },
    { name: "Šušunja", code: "SU" },
    { name: "Bistrice", code: "BI" },
    { name: "Lješkopolje", code: "LJ" },
    { name: "Privremeni objekti", code: "PO" },
  ],
  "Petnjica": [
    { name: "Petnjica", code: "PE" },
    { name: "Azane", code: "AZ" },
    { name: "Bor", code: "BR" },
    { name: "Dašča Rijeka", code: "DR" },
    { name: "Godočelje", code: "GO" },
    { name: "Javorova", code: "JA" },
    { name: "Kalica", code: "KA" },
    { name: "Lagator", code: "LA" },
    { name: "Lješnica", code: "LJ" },
    { name: "Murovac", code: "MU" },
    { name: "Radmanci", code: "RA" },
    { name: "Savin Bor", code: "SB" },
    { name: "Trpezi", code: "TP" },
    { name: "Tucanje", code: "TU" },
    { name: "Vrbica", code: "VB" },
    { name: "Privremeni objekti", code: "PO" },
  ],
};

/* ═══════════════════════════════════════════
   PLANSKI DOKUMENTI PO OPŠTINAMA
   ═══════════════════════════════════════════ */
const PLANSKI_DOKUMENTI = {
  "Podgorica": ["PUP Podgorice", "DUP Centar", "DUP Stara Varoš", "DUP Zagorič", "DUP Konik", "DUP Tološi", "DUP Drač", "DUP Momišići", "GUP Podgorice", "PPPPN Podgorica", "LSL Golubovci"],
  "Nikšić": ["PUP Nikšića", "DUP Centar", "DUP Kličevo", "GUP Nikšića", "DUP Humci", "PPPPN Nikšić"],
  "Bar": ["PUP Bara", "DUP Centar", "DUP Sutomore", "DUP Šušanj", "GUP Bara", "DUP Stari Bar", "PPPPN Bar"],
  "Budva": ["PUP Budve", "DUP Centar", "DUP Bečići", "DUP Sveti Stefan", "DUP Petrovac", "GUP Budve", "PPPPN Budva"],
  "Kotor": ["PUP Kotora", "DUP Stari Grad", "DUP Škaljari", "DUP Dobrota", "GUP Kotora", "DUP Risan", "PPPPN Kotor"],
  "Herceg Novi": ["PUP Herceg Novog", "DUP Centar", "DUP Igalo", "DUP Bijela", "GUP Herceg Novog", "DUP Meljine", "PPPPN Herceg Novi"],
  "Cetinje": ["PUP Cetinja", "DUP Centar", "GUP Cetinja", "DUP Njeguši", "PPPPN Cetinje"],
  "Bijelo Polje": ["PUP Bijelog Polja", "DUP Centar", "GUP Bijelog Polja", "PPPPN Bijelo Polje"],
  "Pljevlja": ["PUP Pljevalja", "DUP Centar", "GUP Pljevalja", "PPPPN Pljevlja"],
  "Berane": ["PUP Berana", "DUP Centar", "GUP Berana", "PPPPN Berane"],
  "Ulcinj": ["PUP Ulcinja", "DUP Centar", "DUP Velika Plaža", "GUP Ulcinja", "PPPPN Ulcinj"],
  "Tivat": ["PUP Tivta", "DUP Centar", "DUP Seljanovo", "GUP Tivta", "DUP Radovići", "PPPPN Tivat"],
  "Danilovgrad": ["PUP Danilovgrada", "DUP Centar", "GUP Danilovgrada", "PPPPN Danilovgrad"],
  "Rožaje": ["PUP Rožaja", "DUP Centar", "GUP Rožaja", "PPPPN Rožaje"],
  "Kolašin": ["PUP Kolašina", "DUP Centar", "GUP Kolašina", "PPPPN Kolašin"],
  "Mojkovac": ["PUP Mojkovca", "DUP Centar", "GUP Mojkovca", "PPPPN Mojkovac"],
  "Plav": ["PUP Plava", "DUP Centar", "GUP Plava", "PPPPN Plav"],
  "Žabljak": ["PUP Žabljaka", "DUP Centar", "GUP Žabljaka", "PPPPN Žabljak"],
  "Šavnik": ["PUP Šavnika", "DUP Centar", "GUP Šavnika", "PPPPN Šavnik"],
  "Andrijevica": ["PUP Andrijevice", "DUP Centar", "GUP Andrijevice", "PPPPN Andrijevica"],
  "Plužine": ["PUP Plužina", "DUP Centar", "GUP Plužina", "PPPPN Plužine"],
  "Gusinje": ["PUP Gusinja", "DUP Centar", "GUP Gusinja", "PPPPN Gusinje"],
  "Tuzi": ["PUP Tuzi", "DUP Centar", "GUP Tuzi", "PPPPN Tuzi"],
  "Zeta": ["PUP Zete", "DUP Golubovci", "GUP Zete", "PPPPN Zeta"],
  "Petnjica": ["PUP Petnjice", "DUP Centar", "GUP Petnjice", "PPPPN Petnjica"],
};

/* ═══════════════════════════════════════════
   CUSTOM DATA MANAGEMENT
   Čuva korisničke unose za dropdowne
   ═══════════════════════════════════════════ */
function loadCustomData() { try { const r = localStorage.getItem(CUSTOM_DATA_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveCustomData(d) { localStorage.setItem(CUSTOM_DATA_KEY, JSON.stringify(d)); }
function addCustomItem(category, value) {
  if (!value || !value.trim()) return;
  const d = loadCustomData(); if (!d[category]) d[category] = [];
  if (!d[category].includes(value.trim())) d[category].push(value.trim());
  saveCustomData(d);
}
function removeCustomItem(category, value) {
  const d = loadCustomData(); if (d[category]) d[category] = d[category].filter(v => v !== value); saveCustomData(d);
}
function getCustomItems(category) { return loadCustomData()[category] || []; }
function isCustomItem(category, value) { return getCustomItems(category).includes(value); }
function getMergedRadnici(supabaseNames = []) { return [...new Set([...RADNICI, ...supabaseNames, ...getCustomItems("radnici")])]; }
function getMergedOpstinaNames() { return [...new Set([...OPSTINE_CODES.map(o => o.name), ...getCustomItems("opstine")])]; }
function getMergedKONames(opstina) {
  const defaults = (KATASTARSKE_OPSTINE[opstina] || []).map(k => k.name);
  return [...new Set([...defaults, ...getCustomItems(`ko_${opstina}`)])];
}
function getMergedPlanski(opstina) {
  const defaults = PLANSKI_DOKUMENTI[opstina] || [];
  return [...new Set([...defaults, ...getCustomItems(`planski_${opstina}`)])];
}

/* ═══════════════════════════════════════════
   RIMSKI BROJEVI
   ═══════════════════════════════════════════ */
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function monthToRoman(month) {
  return ROMAN_NUMERALS[Math.max(0, Math.min(11, Number(month) - 1))] || "I";
}

/* ═══════════════════════════════════════════
   UTILITY FUNKCIJE
   ═══════════════════════════════════════════ */
function pad2(v) { return String(v).padStart(2, "0"); }

function getOpstinaCode(opstinaName) {
  const found = OPSTINE_CODES.find((o) => o.name === opstinaName);
  return found ? found.code : "XX";
}

function getKOCode(opstinaName, koName) {
  const koList = KATASTARSKE_OPSTINE[opstinaName];
  if (!koList) return "XX";
  const found = koList.find((k) => k.name === koName);
  return found ? found.code : "XX";
}

function getNextSequenceForKO(projects, koName, year) {
  const existing = projects
    .filter((p) => p.katastarskaOpstina === koName && Number(p.projectYear) === Number(year))
    .map((p) => Number(p.projectSequence) || 0)
    .sort((a, b) => a - b);
  for (let i = 1; i <= existing.length + 1; i++) {
    if (!existing.includes(i)) return i;
  }
  return existing.length + 1;
}

function buildProjectCode(sequence, year, month, koCode, opstinaCode) {
  const yy = String(year || ACTIVE_YEAR).slice(-2);
  const roman = monthToRoman(month || new Date().getMonth() + 1);
  const ss = pad2(sequence || 1);
  const ko = koCode || "XX";
  const op = opstinaCode || "XX";
  return `AVM/${roman}${ss}.${ko}-${op}.${yy}`;
}

function buildProjectFolderCode(sequence, year, month, koCode, opstinaCode) {
  const yy = String(year || ACTIVE_YEAR).slice(-2);
  const roman = monthToRoman(month || new Date().getMonth() + 1);
  const ss = pad2(sequence || 1);
  const ko = koCode || "XX";
  const op = opstinaCode || "XX";
  return `AVM.${roman}${ss}.${ko}-${op}.${yy}`;
}

function sanitizeFolderPart(value) {
  const invalid = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
  let text = String(value || "").trim();
  invalid.forEach((c) => { text = text.split(c).join("-"); });
  text = text.replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  return text.slice(0, 80);
}

function buildProjectFolderPath(basePath, project) {
  const base = String(basePath || "").replace(/[\\/]+$/g, "");
  const year = String(project?.projectYear || ACTIVE_YEAR);
  const opstina = sanitizeFolderPart(project?.opstina || "");
  const ko = sanitizeFolderPart(project?.katastarskaOpstina || "");
  const folderCode = buildProjectFolderCode(
    project?.projectSequence, project?.projectYear, project?.projectMonth,
    getKOCode(project?.opstina, project?.katastarskaOpstina), getOpstinaCode(project?.opstina)
  );
  const parts = [folderCode];
  if (project?.parcela) parts.push(sanitizeFolderPart(project.parcela));
  if (project?.katastarskaOpstina) parts.push(sanitizeFolderPart(project.katastarskaOpstina));
  if (project?.investitor) parts.push(sanitizeFolderPart(project.investitor));
  if (project?.projektant) parts.push(sanitizeFolderPart(project.projektant));
  const folderName = parts.join("_").slice(0, 200);
  if (!base) return folderName;
  return `${base}/${year}/${opstina}/${ko}/${folderName}`;
}

function buildOffersFolderPath(basePath, year) {
  const base = String(basePath || "").replace(/[\\/]+$/g, "");
  return `${base}/${year}/Ponude`;
}

function buildOfferNumber(project) {
  const koCode = getKOCode(project?.opstina, project?.katastarskaOpstina);
  const opCode = getOpstinaCode(project?.opstina);
  return `P-${buildProjectFolderCode(project?.projectSequence, project?.projectYear, project?.projectMonth, koCode, opCode)}`;
}

function buildOfferFileName(project) {
  const folderCode = buildProjectFolderCode(
    project?.projectSequence,
    project?.projectYear,
    project?.projectMonth,
    getKOCode(project?.opstina, project?.katastarskaOpstina),
    getOpstinaCode(project?.opstina)
  );
  return `${folderCode}.pdf`;
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

function loadTasks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
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
function emptyNewProject(projects, year = ACTIVE_YEAR, koName = "", opstinaName = "") {
  const seq = koName ? getNextSequenceForKO(projects, koName, year) : 1;
  return {
    projectSequence: seq,
    projectYear: Number(year || ACTIVE_YEAR),
    projectMonth: new Date().getMonth() + 1,
    startDate: todayIso(),
    nazivPredmeta: "", investitor: "", projektant: "",
    vrstaRadova: "", parcela: "", katastarskaOpstina: koName,
    urbanistickaParcela: "", opstina: opstinaName, planskiDokument: "",
    status: "U toku", stage: "Ponuda", opis: "",
    googleMapsLink: "", assignedTo: "",
    mapLat: "", mapLng: "",
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

  const koCode = getKOCode(project.opstina, project.katastarskaOpstina);
  const opCode = getOpstinaCode(project.opstina);

  const p = {
    id: project.id || `PRJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectCode: project.projectCode || buildProjectCode(seq, year, month, koCode, opCode),
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
    mapLat: project.mapLat || "",
    mapLng: project.mapLng || "",
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
    projectCode: raw.new_code || buildProjectCode(raw.seq, raw.year, raw.month, "XX", "XX"),
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
   GOOGLE MAPS PICKER MODAL
   ═══════════════════════════════════════════ */
function GoogleMapsPicker({ onSelect, onClose, initialLat, initialLng }) {
  const [lat, setLat] = useState(initialLat || 42.4304);
  const [lng, setLng] = useState(initialLng || 19.2594);
  const [searchQuery, setSearchQuery] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const iframeRef = useRef(null);

  const coordMapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  const searchMapUrl = searchQuery.trim()
    ? `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&z=15&output=embed`
    : coordMapUrl;

  function handleSearch() {
    if (!searchQuery.trim()) return;
    setUseSearch(true);
  }

  function handleCoordUpdate() {
    setUseSearch(false);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,14,14,0.3)", zIndex: 3000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "min(92vw, 720px)", height: "min(85vh, 600px)",
        background: PAPER, borderRadius: 12, zIndex: 3001,
        boxShadow: "0 16px 50px rgba(14,14,14,0.18)", fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${RULE}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Odaberi lokaciju na mapi</div>
            <div style={{ fontSize: 11, color: SAGE, marginTop: 2 }}>Pretraži lokaciju ili unesi koordinate</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: SAGE }}><X size={18} /></button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${RULE}`, display: "flex", gap: 6 }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pretraži lokaciju (npr. Kotor stari grad)..."
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            style={{ flex: 1, border: `1px solid ${RULE}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
          />
          <button onClick={handleSearch} style={{ background: MOSS, color: PAPER, border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
            <Search size={14} /> Traži
          </button>
        </div>

        <div style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "flex-end", borderBottom: `1px solid ${RULE}` }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: SAGE, textTransform: "uppercase", letterSpacing: "0.04em" }}>Latitude</span>
            <input type="number" step="0.0001" value={lat} onChange={(e) => { setLat(Number(e.target.value) || 0); handleCoordUpdate(); }}
              style={{ border: `1px solid ${RULE}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", width: "100%", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: SAGE, textTransform: "uppercase", letterSpacing: "0.04em" }}>Longitude</span>
            <input type="number" step="0.0001" value={lng} onChange={(e) => { setLng(Number(e.target.value) || 0); handleCoordUpdate(); }}
              style={{ border: `1px solid ${RULE}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", width: "100%", boxSizing: "border-box" }}
            />
          </label>
          <button onClick={() => {
            onSelect(lat, lng);
            onClose();
          }} style={{
            background: MOSS, color: PAPER, border: "none", borderRadius: 6,
            padding: "8px 16px", fontWeight: 600, fontSize: 12, cursor: "pointer",
            fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
          }}>
            <Check size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Potvrdi
          </button>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <iframe
            ref={iframeRef}
            title="Google Maps Picker"
            src={useSearch ? searchMapUrl : coordMapUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            loading="lazy"
            allowFullScreen
          />
          <div style={{
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
            background: MOSS, color: PAPER, padding: "6px 14px", borderRadius: 20,
            fontSize: 11, fontWeight: 600, boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          }}>
            Nađi lokaciju pretragom, unesi koordinate, pa klikni Potvrdi
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   COMBO INPUT - Dropdown + manual entry + save + delete
   ═══════════════════════════════════════════ */
function ComboInput({ label, value, onChange, options = [], customCategory, placeholder = "" }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef(null);
  const inputVal = value || "";

  const filtered = options.filter(o => !filter || o.toLowerCase().includes(filter.toLowerCase()));
  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    function handleClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e) {
    const v = e.target.value;
    setFilter(v);
    onChange(v);
    if (!open) setOpen(true);
  }

  function selectOption(opt) { onChange(opt); setFilter(""); setOpen(false); }

  function handleBlur() {
    setTimeout(() => {
      if (customCategory && inputVal.trim() && !options.includes(inputVal.trim())) {
        addCustomItem(customCategory, inputVal.trim());
      }
    }, 200);
  }

  function handleDelete(e, opt) {
    e.stopPropagation();
    e.preventDefault();
    if (customCategory && isCustomItem(customCategory, opt)) {
      removeCustomItem(customCategory, opt);
      if (value === opt) onChange("");
    }
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", gap: 0 }}>
        <input value={inputVal} onChange={handleInputChange} onFocus={() => setOpen(true)} onBlur={handleBlur}
          placeholder={placeholder}
          style={{ flex: 1, border: `1px solid ${RULE}`, borderRadius: "6px 0 0 6px", padding: "9px 11px", fontSize: 13, outline: "none", background: PAPER, color: INK, boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }} />
        <button onClick={() => setOpen(!open)} type="button"
          style={{ border: `1px solid ${RULE}`, borderLeft: "none", borderRadius: "0 6px 6px 0", padding: "0 8px", background: PAPER, cursor: "pointer", color: SAGE, display: "flex", alignItems: "center" }}>
          <ChevronDown size={14} />
        </button>
      </div>
      {showDropdown && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: PAPER, border: `1px solid ${RULE}`, borderRadius: 6, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.1)", marginTop: 2 }}>
          {filtered.map((opt, i) => {
            const isCust = customCategory && isCustomItem(customCategory, opt);
            return (
              <div key={`${opt}-${i}`} onMouseDown={() => selectOption(opt)}
                style={{ padding: "8px 10px", cursor: "pointer", fontSize: 12, color: INK, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < filtered.length - 1 ? `1px solid ${RULE}` : "none", background: value === opt ? CREAM : "transparent" }}>
                <span>{opt}</span>
                {isCust && (
                  <button onMouseDown={(e) => handleDelete(e, opt)} style={{ background: "none", border: "none", cursor: "pointer", color: DANGER, padding: 2, display: "flex" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  else if (hovered) { border = `1px solid ${RULE}`; bg = LINEN; color = INK; }

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

function MapPreview({ value, lat, lng }) {
  const openUrl = buildMapOpenUrl(value || (lat && lng ? `${lat},${lng}` : ""));
  const coordsValue = value || (lat && lng ? `${lat},${lng}` : "");
  const osmUrl = buildOsmEmbedUrl(coordsValue);
  const coords = extractCoordinates(coordsValue);

  if (!coordsValue) {
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
function PipelineCard({ project, isSelected, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const borderColor = isSelected ? MOSS : hovered ? SAGE : "transparent";
  const textColor = isSelected || hovered ? INK : SAGE;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: isMobile ? "14px 14px" : "10px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
        border: `1.5px solid ${borderColor}`, background: PAPER, marginBottom: 6,
        minHeight: isMobile ? 44 : "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: isMobile ? 12 : 10, fontWeight: 700, color: MUTED, letterSpacing: "0.04em" }}>{project.projectCode}</div>
        <div title={project.status} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Circle size={8} fill={STATUS_COLORS[project.status] || MUTED} color={STATUS_COLORS[project.status] || MUTED} />
        </div>
      </div>
      <div style={{
        fontSize: isMobile ? 15 : 13, fontWeight: 600, color: textColor, marginTop: 3, transition: "color 0.15s",
        fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {project.nazivPredmeta || "Bez naziva"}
      </div>
      <div style={{ fontSize: isMobile ? 14 : 11, color: MUTED, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {project.investitor || "—"}
      </div>
      {project.assignedTo && (
        <div style={{ fontSize: isMobile ? 12 : 10, color: SAGE, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <User size={isMobile ? 12 : 10} /> {project.assignedTo}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDIT PROJECT MODAL
   ═══════════════════════════════════════════ */
function EditProjectModal({ project, onSave, onClose, isMobile, baseFolderPath, radniciList }) {
  const [form, setForm] = useState({ ...project });
  const koOptions = getMergedKONames(form.opstina);
  const planskiOptions = getMergedPlanski(form.opstina);
  const radniciOptions = radniciList || getMergedRadnici();
  const opstinaOptions = getMergedOpstinaNames();

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function handleSave() {
    const koCode = getKOCode(form.opstina, form.katastarskaOpstina);
    const opCode = getOpstinaCode(form.opstina);
    const updated = { ...form,
      projectCode: buildProjectCode(form.projectSequence, form.projectYear, form.projectMonth, koCode, opCode),
      folderPath: buildProjectFolderPath(baseFolderPath, form),
    };
    onSave(normalizeProject(updated));
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,14,14,0.2)", zIndex: 2000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? "calc(100% - 32px)" : 580, maxHeight: "85vh", overflowY: "auto", background: PAPER, borderRadius: 12, padding: 24, zIndex: 2001, boxShadow: "0 16px 50px rgba(14,14,14,0.12)", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Izmijeni predmet</h2>
          <Btn onClick={onClose} style={{ padding: 4 }}><X size={16} /></Btn>
        </div>
        <div style={{ background: CREAM, borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>Kod projekta</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: MOSS, marginTop: 4 }}>{form.projectCode}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Naziv predmeta" value={form.nazivPredmeta} onChange={(e) => set("nazivPredmeta", e.target.value)} /></div>
          <Input label="Investitor" value={form.investitor} onChange={(e) => set("investitor", e.target.value)} />
          <Input label="Projektant" value={form.projektant} onChange={(e) => set("projektant", e.target.value)} />
          <Input label="Vrsta radova" value={form.vrstaRadova} onChange={(e) => set("vrstaRadova", e.target.value)} />
          <Input label="Katastarska parcela" value={form.parcela} onChange={(e) => set("parcela", e.target.value)} />
          <Input label="Urbanistička parcela" value={form.urbanistickaParcela} onChange={(e) => set("urbanistickaParcela", e.target.value)} />
          <ComboInput label="Opština" value={form.opstina} onChange={(v) => { set("opstina", v); set("katastarskaOpstina", ""); set("planskiDokument", ""); }} options={opstinaOptions} customCategory="opstine" />
          <ComboInput label="Katastarska opština" value={form.katastarskaOpstina} onChange={(v) => set("katastarskaOpstina", v)} options={koOptions} customCategory={form.opstina ? `ko_${form.opstina}` : null} />
          <ComboInput label="Planski dokument" value={form.planskiDokument} onChange={(v) => set("planskiDokument", v)} options={planskiOptions} customCategory={form.opstina ? `planski_${form.opstina}` : null} />
          <ComboInput label="Dodijeljeni radnik" value={form.assignedTo} onChange={(v) => set("assignedTo", v)} options={radniciOptions} customCategory="radnici" />
          <Select label="Faza" value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option>U toku</option><option>Čeka investitora</option><option>Završeno</option><option>Na čekanju</option>
          </Select>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Google Maps link / koordinate" value={form.googleMapsLink} onChange={(e) => set("googleMapsLink", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn primary onClick={handleSave} style={{ flex: 1 }}><Save size={14} /> Sačuvaj izmjene</Btn>
          <Btn onClick={onClose}>Otkaži</Btn>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   PIPELINE BOČNI PANEL
   ═══════════════════════════════════════════ */
function SidePanel({ project, onClose, isAdmin, updateField, updateChecklist, userName, isMobile, tasks, onEdit, radniciList }) {
  const [newNote, setNewNote] = useState("");
  if (!project) return null;

  const projectTasks = (tasks || []).filter((t) => t.projectId === project.id);

  const addNote = () => {
    if (!newNote.trim()) return;
    updateField("notes", [
      { id: `NOTE-${Date.now()}`, text: newNote.trim(), createdAt: new Date().toLocaleString("sr-Latn-ME"), author: userName },
      ...project.notes,
    ]);
    setNewNote("");
  };

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
      background: PAPER, borderLeft: isMobile ? "none" : `1px solid ${RULE}`,
      boxShadow: isMobile ? "none" : "-8px 0 30px rgba(14,14,14,0.08)", zIndex: 1000,
      display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif",
      overflowY: "auto", left: isMobile ? 0 : "auto",
    }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "0" : "16px 20px", borderBottom: `1px solid ${RULE}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: PAPER, zIndex: 1 }}>
        {isMobile ? (
          <button onClick={onClose} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "14px 16px",
            background: "none", border: "none", cursor: "pointer", minHeight: 48,
            fontSize: 15, fontWeight: 600, color: MOSS, fontFamily: "'Inter', sans-serif",
          }}>
            <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} /> Nazad
          </button>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em" }}>{project.projectCode}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 2, fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic" }}>
                {project.nazivPredmeta || "Bez naziva"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {isAdmin && <Btn onClick={onEdit} style={{ padding: 6 }}><Edit3 size={14} /></Btn>}
              <Btn onClick={onClose} style={{ padding: 6 }}><X size={16} /></Btn>
            </div>
          </>
        )}
      </div>

      {/* Mobile project title */}
      {isMobile && (
        <div style={{ padding: "8px 16px 12px", borderBottom: `1px solid ${RULE}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "0.06em" }}>{project.projectCode}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: INK, marginTop: 4, fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic" }}>
              {project.nazivPredmeta || "Bez naziva"}
            </div>
          </div>
          {isAdmin && <Btn onClick={onEdit} style={{ padding: "8px 12px" }}><Edit3 size={14} /> Izmijeni</Btn>}
        </div>
      )}

      <div style={{ padding: isMobile ? "16px 16px 24px" : 20, display: "flex", flexDirection: "column", gap: 20 }}>
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

        {/* Assigned to - ComboInput */}
        <ComboInput label="Dodijeljeni radnik" value={project.assignedTo}
          onChange={(val) => updateField("assignedTo", val)}
          options={radniciList || getMergedRadnici()} customCategory="radnici" />

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

        {/* Project tasks */}
        {projectTasks.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Zadaci projekta</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {projectTasks.map((t) => (
                <div key={t.id} style={{ padding: "8px 10px", background: CREAM, borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  {t.status === "završen" ? <CheckSquare size={14} color={MOSS} /> : <Square size={14} color={MUTED} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: t.status === "završen" ? MUTED : INK, textDecoration: t.status === "završen" ? "line-through" : "none" }}>{t.text}</div>
                    {t.assignedTo && <div style={{ fontSize: 10, color: SAGE, marginTop: 2 }}>{t.assignedTo}{t.dueDate ? ` · ${formatDisplayDate(t.dueDate)}` : ""}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini map */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Lokacija</div>
          <MapPreview value={project.googleMapsLink} lat={project.mapLat} lng={project.mapLng} />
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
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: `2px solid ${RULE}`, marginBottom: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>{stage}</span>
              <span style={{
                background: CREAM, color: MUTED, fontSize: 11, fontWeight: 800,
                padding: "3px 9px", borderRadius: 10, minWidth: 20, textAlign: "center",
              }}>{stageGroups[stage].length}</span>
            </div>
            <div>
              {stageGroups[stage].map((p) => (
                <PipelineCard key={p.id} project={p} isSelected={selectedId === p.id}
                  onClick={() => { setSelectedId(p.id); onOpenPanel(p.id); }} isMobile />
              ))}
              {!stageGroups[stage].length && <div style={{ color: MUTED, fontSize: 14, padding: 16 }}>Nema projekata u ovoj fazi.</div>}
            </div>
          </div>
        ))}
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
function DashboardView({ projects, yearFilter, isMobile }) {
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <MetaCard large label="Ukupno predmeta" value={total} />
        <MetaCard large label="Aktivni" value={active} />
        <MetaCard large label="Završeni" value={finished} />
        <MetaCard large label="Ukupno bez PDV" value={currency(totalBez)} />
        <MetaCard large label="Ukupno sa PDV" value={currency(totalSa)} />
        <MetaCard large label="Naplaćeno" value={currency(paid)} />
        <MetaCard large label="Za naplatu" value={currency(unpaid)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Projekti po fazi</div>
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 110, fontSize: 11, color: INK, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage}</div>
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

        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Projekti po radniku</div>
          {Object.entries(byWorker).sort((a, b) => b[1] - a[1]).map(([worker, count]) => (
            <div key={worker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${RULE}`, fontSize: 13 }}>
              <span style={{ color: INK }}>{worker}</span>
              <strong style={{ color: MOSS }}>{count}</strong>
            </div>
          ))}
        </div>

        <div style={{ background: CREAM, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>Po statusu</div>
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${RULE}`, fontSize: 13 }}>
              <span style={{ color: INK }}>{status}</span>
              <strong style={{ color: MOSS }}>{count}</strong>
            </div>
          ))}
        </div>

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
function ChecklistView({ projects, isAdmin, setSelectedId, onOpenPanel, isMobile }) {
  return (
    <div>
      {isMobile && (
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronRight size={12} /> Povuci horizontalno za više kolona
        </div>
      )}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 14 : 12, minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${RULE}` }}>
              {["Br.", "God.", "Naziv", "Investitor", "Vrsta radova", "Faza", "Status", "Radnik",
                ...(isAdmin ? ["Ponuda", "Analiza", "Projekat završen", "Bez PDV", "Faza I", "Faza II", "Naplata", "+PDV"] : ["Analiza", "Projekat završen"]),
              ].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: isMobile ? "12px 8px" : "8px 6px", fontWeight: 700, color: SAGE, fontSize: isMobile ? 12 : 10, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
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
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", fontWeight: 700, fontSize: isMobile ? 13 : 11, color: MOSS, whiteSpace: "nowrap", minHeight: isMobile ? 44 : "auto" }}>{p.projectCode}</td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: MUTED }}>{p.projectYear}</td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", fontWeight: 600, color: INK, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Spectral', 'Georgia', serif", fontStyle: "italic" }}>{p.nazivPredmeta || "—"}</td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: INK, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.investitor || "—"}</td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE }}>{p.vrstaRadova || "—"}</td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px" }}>
                  <span style={{ fontSize: isMobile ? 12 : 10, fontWeight: 700, background: p.stage === "Završeno" ? "#e8e8e8" : CREAM, color: p.stage === "Završeno" ? INK : INK, padding: "3px 8px", borderRadius: 4 }}>
                    {p.stage}
                  </span>
                </td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Circle size={8} fill={STATUS_COLORS[p.status] || MUTED} color={STATUS_COLORS[p.status] || MUTED} />{p.status}</span></td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE }}>{p.assignedTo || "—"}</td>
                {isAdmin && <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE, whiteSpace: "nowrap" }}>{p.checklist.ponudaBroj ? `${p.checklist.ponudaBroj}` : "—"}</td>}
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE }}>{p.checklist.analizaZavrsena || "—"}</td>
                <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE }}>{p.checklist.projekatZavrsen || "—"}</td>
                {isAdmin && <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{currency(p.checklist.ukupnaPonudaBezPdv)}</td>}
                {isAdmin && <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE, whiteSpace: "nowrap" }}>{currency(p.checklist.faza1)}</td>}
                {isAdmin && <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: SAGE, whiteSpace: "nowrap" }}>{currency(p.checklist.faza2)}</td>}
                {isAdmin && <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", color: MOSS, fontWeight: 600, whiteSpace: "nowrap" }}>{currency(p.checklist.ostvarenaNaplata)}</td>}
                {isAdmin && <td style={{ padding: isMobile ? "12px 8px" : "8px 6px", fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{currency(p.checklist.ukupnoSaPdv)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <MetaCard label="Br. ponude" value={buildOfferNumber(project)} />
      </div>

      <div style={{ background: CREAM, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>Podaci ponude</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Broj ponude" value={project.checklist.ponudaBroj || buildOfferNumber(project)} onChange={(e) => updateChecklistField("ponudaBroj", e.target.value)} />
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
   ZADACI (TODO) POGLED
   ═══════════════════════════════════════════ */
function TasksView({ tasks, setTasks, projects, isAdmin, userName, isMobile, radniciList, onDeleteFromCloud, onSyncTask }) {
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskAssigned, setNewTaskAssigned] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [filterStatus, setFilterStatus] = useState("otvoren");
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [commentText, setCommentText] = useState("");

  const visibleTasks = tasks.filter((t) => {
    if (!isAdmin && t.assignedTo !== userName) return false;
    if (filterStatus === "otvoren") return t.status === "otvoren";
    if (filterStatus === "završen") return t.status === "završen";
    return true;
  });

  function addTask() {
    if (!newTaskText.trim()) return;
    const task = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: newTaskText.trim(),
      assignedTo: newTaskAssigned || userName,
      projectId: newTaskProject || "",
      dueDate: newTaskDue || "",
      status: "otvoren",
      createdAt: new Date().toISOString(),
      createdBy: userName,
      comments: [],
    };
    setTasks((cur) => [task, ...cur]);
    if (onSyncTask) onSyncTask(task);
    setNewTaskText(""); setNewTaskAssigned(""); setNewTaskProject(""); setNewTaskDue("");
  }

  function toggleTask(taskId) {
    let updated = null;
    setTasks((cur) => cur.map((t) => {
      if (t.id !== taskId) return t;
      updated = { ...t, status: t.status === "otvoren" ? "završen" : "otvoren" };
      return updated;
    }));
    setTimeout(() => { if (onSyncTask && updated) onSyncTask(updated); }, 50);
  }

  function deleteTask(taskId) {
    if (!window.confirm("Obriši zadatak?")) return;
    setTasks((cur) => cur.filter((t) => t.id !== taskId));
    if (onDeleteFromCloud) onDeleteFromCloud(taskId);
  }

  function addComment(taskId) {
    if (!commentText.trim()) return;
    const newComment = {
      id: `CMT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: commentText.trim(), author: userName,
      createdAt: new Date().toLocaleString("sr-Latn-ME"),
    };
    let updated = null;
    setTasks((cur) => cur.map((t) => {
      if (t.id !== taskId) return t;
      const comments = Array.isArray(t.comments) ? t.comments : [];
      updated = { ...t, comments: [...comments, newComment] };
      return updated;
    }));
    setTimeout(() => { if (onSyncTask && updated) onSyncTask(updated); }, 50);
    setCommentText("");
  }

  const getProjectName = (pid) => {
    if (!pid) return "";
    const p = projects.find((pr) => pr.id === pid);
    return p ? (p.nazivPredmeta || p.projectCode) : "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: CREAM, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase" }}>Novi zadatak</div>
        <Input label="Tekst zadatka" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Šta treba uraditi..." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
          <ComboInput label="Dodijeljeno" value={newTaskAssigned} onChange={(val) => setNewTaskAssigned(val)} options={radniciList || getMergedRadnici()} customCategory="radnici" placeholder="Ja" />
          <ComboInput label="Vezan za projekat"
            value={newTaskProject ? (() => { const p = projects.find(pr => pr.id === newTaskProject); return p ? `${p.projectCode} — ${p.nazivPredmeta || "Bez naziva"}` : ""; })() : ""}
            onChange={(val) => {
              const found = projects.find(p => `${p.projectCode} — ${p.nazivPredmeta || "Bez naziva"}` === val || p.projectCode === val);
              setNewTaskProject(found ? found.id : "");
            }}
            options={projects.map(p => `${p.projectCode} — ${p.nazivPredmeta || "Bez naziva"}`)}
            placeholder="Pretraži projekat..." />
          <Input label="Rok" type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} />
        </div>
        <Btn primary onClick={addTask} style={{ alignSelf: "flex-start" }}><Plus size={14} /> Dodaj zadatak</Btn>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {["otvoren", "završen", "sve"].map((f) => (
          <Btn key={f} active={filterStatus === f} onClick={() => setFilterStatus(f)} style={{ fontSize: 11, padding: "6px 12px" }}>
            {f === "otvoren" ? "Otvoreni" : f === "završen" ? "Završeni" : "Sve"}
          </Btn>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {!visibleTasks.length && <div style={{ color: MUTED, fontSize: 13, padding: 20, textAlign: "center" }}>Nema zadataka.</div>}
        {visibleTasks.map((t) => {
          const isOverdue = t.dueDate && t.status === "otvoren" && new Date(t.dueDate) < new Date();
          const isExpanded = expandedTaskId === t.id;
          const comments = Array.isArray(t.comments) ? t.comments : [];
          return (
            <div key={t.id} style={{ background: PAPER, borderRadius: 8, border: `1px solid ${isOverdue ? DANGER_BORDER : RULE}`, overflow: "hidden" }}>
              <div style={{ padding: isMobile ? "14px 14px" : "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <button onClick={() => toggleTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, marginTop: 1, color: t.status === "završen" ? MOSS : MUTED, flexShrink: 0 }}>
                  {t.status === "završen" ? <CheckSquare size={isMobile ? 22 : 18} /> : <Square size={isMobile ? 22 : 18} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 15 : 13, fontWeight: 600, color: t.status === "završen" ? MUTED : INK, textDecoration: t.status === "završen" ? "line-through" : "none" }}>{t.text}</div>
                  <div style={{ fontSize: isMobile ? 12 : 11, color: SAGE, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {t.assignedTo && <span><User size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />{t.assignedTo}</span>}
                    {t.projectId && <span style={{ color: MOSS, fontWeight: 600 }}>{getProjectName(t.projectId)}</span>}
                    {t.dueDate && <span style={{ color: isOverdue ? DANGER : SAGE }}><Calendar size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />{formatDisplayDate(t.dueDate)}</span>}
                  </div>
                  <button onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginTop: 4, display: "flex", alignItems: "center", gap: 4, color: isExpanded ? MOSS : SAGE, fontSize: isMobile ? 12 : 11, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                    <StickyNote size={isMobile ? 14 : 12} />
                    {comments.length > 0 ? `Komentari (${comments.length})` : "Komentariši"}
                    <ChevronDown size={12} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                </div>
                {isAdmin && (<button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: MUTED, flexShrink: 0 }}><Trash2 size={14} /></button>)}
              </div>
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${RULE}`, padding: "10px 14px", background: CREAM }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: SAGE, textTransform: "uppercase", marginBottom: 6 }}>Komentari</div>
                  {comments.length === 0 && <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Nema komentara.</div>}
                  {comments.map((c) => (
                    <div key={c.id} style={{ padding: "6px 8px", background: PAPER, borderRadius: 6, borderLeft: `3px solid ${MOSS}`, marginBottom: 4 }}>
                      <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>{c.author} · {c.createdAt}</div>
                      <div style={{ fontSize: 12, color: INK, lineHeight: 1.4 }}>{c.text}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Dodaj komentar..."
                      onKeyDown={(e) => { if (e.key === "Enter") addComment(t.id); }}
                      style={{ flex: 1, border: `1px solid ${RULE}`, borderRadius: 6, padding: isMobile ? "10px 12px" : "7px 10px", fontSize: isMobile ? 14 : 12, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", outline: "none", minHeight: isMobile ? 44 : "auto" }} />
                    <Btn primary onClick={() => addComment(t.id)} style={{ padding: isMobile ? "10px 14px" : "7px 12px", minHeight: isMobile ? 44 : "auto" }}><Plus size={isMobile ? 16 : 13} /></Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   MAIN APP KOMPONENT
   ═══════════════════════════════════════════ */
export default function App() {
  const [projects, setProjects] = useState(() => loadProjects().map(normalizeProject));
  const [tasks, setTasks] = useState(() => loadTasks());
  const [baseFolderPath, setBaseFolderPath] = useState(loadSettings().baseFolderPath);
  const [selectedId, setSelectedId] = useState(() => loadProjects()[0]?.id || null);
  const [page, setPage] = useState("pipeline");
  const [accessMode, setAccessMode] = useState("admin");
  const [newProject, setNewProject] = useState(() => emptyNewProject(loadProjects(), ACTIVE_YEAR));
  const [pdfStatus, setPdfStatus] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState("worker");
  const [userName, setUserName] = useState("Korisnik");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Offline lokalno");
  const [notifications, setNotifications] = useState([]);
  const [panelProjectId, setPanelProjectId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [supabaseRadnici, setSupabaseRadnici] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  // Persist projects to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.map(normalizeProject)));
  }, [projects]);

  // Persist tasks to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

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

  // Load role + all workers
  useEffect(() => {
    async function loadRole() {
      if (!session?.user?.id) { setUserRole("worker"); setUserName("Korisnik"); setAccessMode("worker"); return; }
      const { data } = await supabase.from("profiles").select("role, name").eq("id", session.user.id).maybeSingle();
      const role = data?.role === "admin" ? "admin" : "worker";
      setUserRole(role);
      setUserName(data?.name || session.user.email || "Korisnik");
      setAccessMode(role);
      // Load all workers from profiles
      const { data: allProfiles } = await supabase.from("profiles").select("name, role");
      if (allProfiles) {
        setSupabaseRadnici(allProfiles.map(p => p.name).filter(Boolean));
      }
    }
    loadRole();
  }, [session]);

  // Cloud load projects - SMART MERGE
  async function loadProjectsFromCloud(showLoading = true) {
    if (!session?.user?.id) return;
    if (showLoading) setSyncStatus("Učitavanje...");
    const { data, error } = await supabase.from("projects").select("id, data, updated_at").order("updated_at", { ascending: false });
    if (error) { setSyncStatus("Online učitavanje nije uspjelo."); setCloudLoaded(true); return; }
    const cloud = Array.isArray(data) ? data.map((r) => normalizeProject(r.data || { id: r.id })) : [];
    if (cloud.length) {
      setProjects((localProjects) => {
        const merged = new Map();
        cloud.forEach((p) => merged.set(p.id, p));
        // Dodaj lokalne projekte koji još nisu u cloudu
        localProjects.forEach((p) => {
          if (!merged.has(p.id)) merged.set(p.id, p);
        });
        return Array.from(merged.values());
      });
      setSelectedId((c) => c || cloud[0]?.id || null);
      setSyncStatus("Sinhronizovano.");
    } else { setSyncStatus("Online baza prazna."); }
    setCloudLoaded(true);
  }

  // Cloud load tasks - SMART MERGE (ne prepisuje lokalne promjene)
  async function loadTasksFromCloud() {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase.from("tasks").select("id, data, updated_at").order("updated_at", { ascending: false });
      if (data?.length) {
        const cloud = data.map((r) => r.data || {});
        setTasks((localTasks) => {
          // Merge: za svaki task, uzmi verziju sa više komentara ili novijim updated_at
          const merged = new Map();
          cloud.forEach((t) => merged.set(t.id, t));
          localTasks.forEach((t) => {
            const existing = merged.get(t.id);
            if (!existing) { merged.set(t.id, t); return; }
            const localComments = Array.isArray(t.comments) ? t.comments.length : 0;
            const cloudComments = Array.isArray(existing.comments) ? existing.comments.length : 0;
            if (localComments > cloudComments) merged.set(t.id, t);
          });
          return Array.from(merged.values());
        });
      }
    } catch {}
  }

  // Odmah sync jedan task u cloud (bez debounce)
  async function syncSingleTaskToCloud(task) {
    if (!session?.user?.id) return;
    try {
      const now = new Date().toISOString();
      await supabase.from("tasks").upsert({ id: task.id, owner_id: session.user.id, data: task, updated_at: now }, { onConflict: "id" });
    } catch {}
  }

  useEffect(() => {
    if (session?.user?.id) {
      loadProjectsFromCloud(true);
      loadTasksFromCloud();
    }
  }, [session?.user?.id]);

  // Realtime subscription - projekti
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = supabase.channel("projects-rt").on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => loadProjectsFromCloud(false)).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  // Realtime subscription - zadaci
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = supabase.channel("tasks-rt").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadTasksFromCloud()).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  // Sync projects to cloud
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

  // Sync tasks to cloud - SVI korisnici
  useEffect(() => {
    if (!session?.user?.id || !cloudLoaded) return;
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        const rows = tasks.map((tk) => ({ id: tk.id, owner_id: session.user.id, data: tk, updated_at: now }));
        await supabase.from("tasks").upsert(rows, { onConflict: "id" });
      } catch {}
    }, 1200);
    return () => clearTimeout(t);
  }, [tasks, session?.user?.id, cloudLoaded]);

  // Settings persist
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ baseFolderPath }));
  }, [baseFolderPath]);

  // Responsive
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h(); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
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
  const editingProject = projects.find((p) => p.id === editingProjectId) || null;
  const isAdmin = userRole === "admin" && accessMode === "admin";

  // Actions
  function showPopup(message) {
    const id = `POP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((c) => [{ id, message, createdAt: new Date().toLocaleTimeString("sr-Latn-ME") }, ...c].slice(0, 4));
    setTimeout(() => setNotifications((c) => c.filter((i) => i.id !== id)), 4500);
  }

  function handleSaveEditedProject(updated) {
    setProjects((c) => c.map((p) => p.id === updated.id ? updated : p));
    showPopup(`Izmijenjeno: ${updated.nazivPredmeta || updated.projectCode}`);
  }

  function updateProject(projectId, updater) {
    setProjects((cur) => cur.map((p) => p.id === projectId ? normalizeProject(updater(p)) : p));
  }

  function updateSelectedProject(updater) { if (selectedId) updateProject(selectedId, updater); }

  function updateSelectedProjectField(field, value) {
    if (!selectedProject) return;
    updateSelectedProject((p) => {
      const next = { ...p, [field]: value };
      if (["projectYear", "projectMonth", "projectSequence", "opstina", "katastarskaOpstina"].includes(field)) {
        const koCode = getKOCode(next.opstina, next.katastarskaOpstina);
        const opCode = getOpstinaCode(next.opstina);
        next.projectCode = buildProjectCode(next.projectSequence, next.projectYear, next.projectMonth, koCode, opCode);
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
      number: recalc.ponudaBroj || buildOfferNumber(selectedProject),
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
      number: checklist.ponudaBroj || buildOfferNumber(project),
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
      const pw = 210, margin = 15, cw = pw - margin * 2;
      let y = 15;

      const clamp = (t, mx) => { const s = sanitizePdfText(t || ""); return s.length <= mx ? s : s.slice(0, mx - 3) + "..."; };
      const writeWrap = (t, x, ys, mw, lh, ml) => {
        const lines = pdf.splitTextToSize(sanitizePdfText(t || ""), mw).slice(0, ml);
        if (lines.length === ml) { const li = lines.length - 1; lines[li] = lines[li].slice(0, -3) + "..."; }
        pdf.text(lines, x, ys);
        return ys + lines.length * lh;
      };

      // ═══ MONOCHROME HEADER (per template) ═══
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
      pdf.text("AVM", margin, y + 4);
      const avmW = pdf.getTextWidth("AVM ");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(14);
      pdf.text("ARCHITECTS", margin + avmW, y + 4);
      pdf.setFontSize(8);
      pdf.text("avmarchitects.me", pw - margin, y + 4, { align: "right" });
      y += 7;
      // Horizontal line
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.4);
      pdf.line(margin, y, pw - margin, y);
      y += 4;
      pdf.setFontSize(7); pdf.setTextColor(80, 80, 80);
      pdf.text("arhitektura   konzervacija", margin, y);
      y += 10;

      // ═══ TITLE ═══
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
      pdf.text("PONUDA", margin, y); y += 6;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
      pdf.text("PONUDA", margin, y); y += 10;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
      pdf.text(sanitizePdfText(`br. ${offer.number}`), margin, y); y += 4;
      // Offer description as subtitle
      pdf.setFont("helvetica", "italic"); pdf.setFontSize(8.5);
      y = writeWrap(offer.description || "", margin, y + 2, cw, 4, 3);
      y += 6;

      // ═══ INFO TABLE (simple borders like template) ═══
      const labelW = 42, valW = cw - labelW;
      const rh = 8;
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.2);
      const infoRows = [
        ["PREDMET", sanitizePdfText(project.nazivPredmeta || "-")],
        ["LOKACIJA", sanitizePdfText(`KP ${project.parcela || "-"}, KO ${project.katastarskaOpstina || "-"}, Opstina ${project.opstina || "-"}`)],
        ["INVESTITOR", sanitizePdfText(project.investitor || "-")],
        ["PROJEKTANT", sanitizePdfText(project.projektant || "-")],
        ["NOSILAC IZRADE KP", "AVM architects d.o.o. Podgorica"],
        ["DATUM", sanitizePdfText(`Podgorica, ${formatDisplayDate(offer.date) || "-"}. godine`)],
      ];
      infoRows.forEach(([label, value]) => {
        pdf.rect(margin, y, labelW, rh); pdf.rect(margin + labelW, y, valW, rh);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(0, 0, 0);
        pdf.text(label, margin + 2, y + 5.5);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
        pdf.text(clamp(value, 70), margin + labelW + 2, y + 5.5);
        y += rh;
      });
      y += 8;

      // ═══ ITEMS TABLE (monochrome) ═══
      const c1 = 80, c2 = 24, c3 = 36, c4 = cw - c1 - c2 - c3;
      const trh = 7;
      // Header row
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(0, 0, 0);
      pdf.rect(margin, y, c1, trh); pdf.rect(margin + c1, y, c2, trh);
      pdf.rect(margin + c1 + c2, y, c3, trh); pdf.rect(margin + c1 + c2 + c3, y, c4, trh);
      pdf.text("Opis", margin + 2, y + 4.7);
      pdf.text("Jedinica", margin + c1 + 2, y + 4.7);
      pdf.text("Jed. cijena", margin + c1 + c2 + 2, y + 4.7);
      pdf.text("Ukupno", margin + c1 + c2 + c3 + 2, y + 4.7);
      y += trh;

      // Data rows
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
      (offer.items || []).slice(0, 6).forEach((item) => {
        const tot = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        pdf.rect(margin, y, c1, trh); pdf.rect(margin + c1, y, c2, trh);
        pdf.rect(margin + c1 + c2, y, c3, trh); pdf.rect(margin + c1 + c2 + c3, y, c4, trh);
        pdf.text(clamp(item.description || "", 38), margin + 2, y + 4.7);
        pdf.text(`${numberFormat(item.quantity || 0)} ${item.unitLabel || ""}`.trim(), margin + c1 + 2, y + 4.7);
        pdf.text(`${numberFormat(item.unitPrice || 0)}`, margin + c1 + c2 + 2, y + 4.7);
        pdf.text(numberFormat(tot), margin + c1 + c2 + c3 + 2, y + 4.7);
        y += trh;
      });

      // Summary rows
      const tb = Number(checklist.ukupnaPonudaBezPdv || 0);
      const f1 = Number(checklist.faza1 || 0);
      const f2 = Number(checklist.faza2 || 0);
      const pdvAmt = tb * (Number(checklist.pdvStopa || 21) / 100);
      const ts = Number(checklist.ukupnoSaPdv || 0);

      const drawSummaryRow = (label, val, bold) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(7);
        pdf.rect(margin, y, c1 + c2 + c3, trh); pdf.rect(margin + c1 + c2 + c3, y, c4, trh);
        pdf.text(label, margin + 2, y + 4.7);
        pdf.text(val, margin + c1 + c2 + c3 + 2, y + 4.7);
        y += trh;
      };
      drawSummaryRow("FAZA I - Konzervatorska analiza (60%)", numberFormat(f1), false);
      drawSummaryRow("FAZA II - Konzervatorski projekat (40%)", numberFormat(f2), false);
      drawSummaryRow("UKUPNO BEZ PDV", numberFormat(tb), true);
      drawSummaryRow(`PDV ${checklist.pdvStopa || 21}%`, numberFormat(pdvAmt), false);
      drawSummaryRow("UKUPNO SA PDV", `${numberFormat(ts)} EUR`, true);
      y += 6;

      // ═══ PHASE DESCRIPTIONS ═══
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(0, 0, 0);
      pdf.text("FAZA I - Konzervatorska analiza", margin, y); y += 4;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
      y = writeWrap(checklist.phase1Description || DEFAULT_PHASE_1_TEXT, margin, y, cw, 3.6, 5);
      y += 6;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
      pdf.text("FAZA II - Konzervatorski projekat", margin, y); y += 4;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
      y = writeWrap(checklist.phase2Description || DEFAULT_PHASE_2_TEXT, margin, y, cw, 3.6, 5);

      // ═══ SIGNATURE (bottom) ═══
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
      pdf.text("Mjesto i datum:", margin, 258);
      pdf.text(sanitizePdfText(`Podgorica, ${formatDisplayDate(offer.date)}. godine`), margin, 264);
      pdf.text("Odgovorno lice u okviru pravnog lica", 130, 258);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
      pdf.text("Andrija Vuksanovic spec.sci.arh.", 140, 270);

      // ═══ PAGE FOOTER ═══
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.3);
      pdf.line(margin, 286, pw - margin, 286);
      pdf.setFontSize(7); pdf.setTextColor(80, 80, 80);
      pdf.text("e-mail: avm.arhitektura@gmail.com", margin, 290);
      pdf.text("telefon: 069/555-216", pw / 2, 290, { align: "center" });
      pdf.text("Str. 1 / 1", pw - margin, 290, { align: "right" });

      // Save to Ponude folder
      const fileName = buildOfferFileName(project);
      const offersFolder = buildOffersFolderPath(baseFolderPath, project.projectYear);

      if (isDesktopAvailable() && window.desktopAPI?.savePdf) {
        try {
          const bytes = Array.from(new Uint8Array(pdf.output("arraybuffer")));
          const result = await window.desktopAPI.savePdf({ folderPath: offersFolder, fileName, bytes });
          if (result?.ok) { setPdfStatus(`PDF sačuvan: ${result.outputPath}`); return; }
        } catch {}
      }
      pdf.save(fileName);
      setPdfStatus(`PDF preuzet: ${fileName}`);
    } catch (err) { console.error(err); setPdfStatus("Greška pri PDF-u."); }
  }

  async function addProject() {
    if (userRole !== "admin") { window.alert("Samo admin."); return; }
    const year = Number(newProject.projectYear || ACTIVE_YEAR);
    const month = Number(newProject.projectMonth || new Date().getMonth() + 1);
    const koName = newProject.katastarskaOpstina || "";
    const opstinaName = newProject.opstina || "";
    const seq = getNextSequenceForKO(projects, koName, year);
    const koCode = getKOCode(opstinaName, koName);
    const opCode = getOpstinaCode(opstinaName);
    const code = buildProjectCode(seq, year, month, koCode, opCode);
    const created = normalizeProject({
      id: `PRJ-${Date.now()}`, ...newProject, projectYear: year, projectMonth: month, projectSequence: seq,
      projectCode: code, folderPath: buildProjectFolderPath(baseFolderPath, { ...newProject, projectCode: code, projectSequence: seq, projectYear: year, projectMonth: month }),
      checklist: recalcChecklist({ offerOpis: buildDefaultOfferDescription(newProject), ponudaBroj: buildOfferNumber({ ...newProject, projectSequence: seq, projectYear: year, projectMonth: month }), pdvStopa: 21, phase1Description: DEFAULT_PHASE_1_TEXT, phase2Description: DEFAULT_PHASE_2_TEXT, offerItems: [makeOfferItem(1)] }),
    });
    if (!created.nazivPredmeta || !created.investitor) { window.alert("Unesi naziv predmeta i investitora."); return; }

    // Create folder structure
    if (isDesktopAvailable() && created.folderPath) {
      try {
        await window.desktopAPI.createProjectFolder(created.folderPath);
        // Create subfolders
        const subfolders = ["01_Dokumentacija", "02_Projekat", "03_Fotografije", "04_Izlazni_PDF"];
        for (const sub of subfolders) {
          try { await window.desktopAPI.createProjectFolder(`${created.folderPath}/${sub}`); } catch {}
        }
        // Ensure Ponude folder exists
        const offersFolder = buildOffersFolderPath(baseFolderPath, year);
        try { await window.desktopAPI.createProjectFolder(offersFolder); } catch {}
      } catch {}
    }

    setProjects((c) => [created, ...c]);
    setSelectedId(created.id);
    setShowNewForm(false);
    setNewProject(emptyNewProject([created, ...projects], year));
    showPopup(`Novi predmet: ${created.nazivPredmeta}`);
    // Odmah sync novi projekat u cloud
    try {
      const now = new Date().toISOString();
      await supabase.from("projects").upsert({ id: created.id, owner_id: session?.user?.id, data: created, updated_at: now }, { onConflict: "id" });
    } catch {}
  }

  async function deleteProject(projectId) {
    const p = projects.find((i) => i.id === projectId);
    if (!window.confirm(`Obriši predmet: ${p?.nazivPredmeta || p?.projectCode}?`)) return;
    const rem = projects.filter((i) => i.id !== projectId);
    setProjects(rem);
    setSelectedId(rem[0]?.id || null);
    if (panelProjectId === projectId) setPanelProjectId(null);
    try { await supabase.from("projects").delete().eq("id", projectId); setSyncStatus("Obrisano."); } catch { setSyncStatus("Lokalno obrisano."); }
    showPopup(`Obrisan: ${p?.nazivPredmeta || p?.projectCode}. Redni broj ${p?.projectSequence} je sada slobodan.`);
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
      window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      setSyncStatus("Sačuvano.");
      showPopup("Podaci sačuvani.");
    } catch { setSyncStatus("Greška."); showPopup("Greška pri čuvanju."); }
  }

  async function logout() { await supabase.auth.signOut(); }

  // Dependent KO list for new project form
  const newProjectKOList = getMergedKONames(newProject.opstina);
  const newProjectPlanskiList = getMergedPlanski(newProject.opstina);
  const newProjectRadniciList = getMergedRadnici(supabaseRadnici);
  const newProjectOpstinaList = getMergedOpstinaNames();

  // Current project code preview
  const previewKoCode = getKOCode(newProject.opstina, newProject.katastarskaOpstina);
  const previewOpCode = getOpstinaCode(newProject.opstina);
  const previewSeq = newProject.katastarskaOpstina ? getNextSequenceForKO(projects, newProject.katastarskaOpstina, newProject.projectYear || ACTIVE_YEAR) : 1;
  const previewCode = buildProjectCode(previewSeq, newProject.projectYear || ACTIVE_YEAR, newProject.projectMonth || new Date().getMonth() + 1, previewKoCode, previewOpCode);

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
    { id: "tasks", label: "Zadaci", icon: ListTodo },
  ].filter((n) => !n.adminOnly || isAdmin);

  // ═══════════════ RENDER ═══════════════
  return (
    <div style={{ minHeight: "100vh", background: LINEN, color: INK, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @media (max-width: 768px) {
          input, select, textarea {
            font-size: 14px !important;
            min-height: 44px !important;
            padding: 10px 12px !important;
          }
          textarea {
            min-height: 80px !important;
          }
          button {
            min-height: 44px !important;
          }
          label > div:first-child {
            font-size: 12px !important;
          }
        }
      `}</style>
      <PopupCenter notifications={notifications} />

      {/* Google Maps Picker Modal */}
      {showMapPicker && (
        <GoogleMapsPicker
          initialLat={Number(newProject.mapLat) || 42.4304}
          initialLng={Number(newProject.mapLng) || 19.2594}
          onSelect={(lat, lng) => {
            setNewProject((p) => ({
              ...p,
              mapLat: lat,
              mapLng: lng,
              googleMapsLink: `https://www.google.com/maps?q=${lat},${lng}`,
            }));
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onSave={handleSaveEditedProject}
          onClose={() => { setShowEditModal(false); setEditingProjectId(null); }}
          isMobile={isMobile}
          baseFolderPath={baseFolderPath}
          radniciList={newProjectRadniciList}
        />
      )}

      {/* Side panel overlay */}
      {panelProjectId && (
        <>
          {!isMobile && <div onClick={() => setPanelProjectId(null)} style={{ position: "fixed", inset: 0, background: "rgba(14,14,14,0.15)", zIndex: 999 }} />}
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
            tasks={tasks}
            onEdit={() => { setEditingProjectId(panelProjectId); setShowEditModal(true); }}
            radniciList={newProjectRadniciList}
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
                  <SidebarBtn key={n.id} active={active} onClick={() => setPage(n.id)}>
                    <Icon size={15} /> {n.label}
                  </SidebarBtn>
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
              {isAdmin && <SidebarBtn onClick={() => setShowNewForm(true)}><Plus size={13} /> Novi predmet</SidebarBtn>}
              {isAdmin && selectedId && (
                <SidebarBtn danger onClick={() => deleteProject(selectedId)}>
                  <Trash2 size={13} /> Obriši projekat
                </SidebarBtn>
              )}
              <SidebarBtn onClick={saveNow}><Save size={13} /> Sačuvaj</SidebarBtn>
              {isAdmin && <SidebarBtn onClick={exportChecklistCsv}><Download size={13} /> CSV export</SidebarBtn>}
              {isAdmin && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", fontSize: 11, color: SAGE, cursor: "pointer", fontWeight: 600, borderRadius: 6, border: "1px solid transparent", fontFamily: "'Inter', sans-serif" }}>
                  <FileText size={13} /> Import JSON
                  <input type="file" accept=".json" onChange={handleImportJson} style={{ display: "none" }} />
                </label>
              )}
              <SidebarBtn onClick={logout}><LogOut size={13} /> Odjava</SidebarBtn>
            </div>
          </aside>
        )}

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <main style={{ flex: 1, padding: isMobile ? "12px 14px 90px" : "20px 24px", overflowX: "hidden" }}>
          {/* Mobile top bar */}
          {isMobile && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em" }}>AVM</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: SAGE }}>ARCHITECTS</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={saveNow} style={{ padding: "10px 12px", fontSize: 12, minHeight: 44 }}><Save size={16} /></Btn>
                <Btn onClick={logout} style={{ padding: "10px 12px", fontSize: 12, minHeight: 44 }}><LogOut size={16} /></Btn>
              </div>
            </div>
          )}

          {/* Mobile search */}
          {isMobile && (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 14, color: MUTED }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pretraga..."
                style={{ width: "100%", border: `1px solid ${RULE}`, borderRadius: 8, padding: "12px 12px 12px 36px", fontSize: 14, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", boxSizing: "border-box", minHeight: 44 }}
              />
            </div>
          )}

          {/* Page title */}
          {isMobile && (
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "0.02em", color: INK }}>
                  {navItems.find((n) => n.id === page)?.label || "Pipeline"}
                </h1>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {filteredProjects.length} projekata {yearFilter !== "all" ? `· ${yearFilter}` : "· sve godine"}
                </div>
              </div>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{
                border: `1px solid ${RULE}`, borderRadius: 8, padding: "8px 10px",
                fontSize: 14, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif",
                minHeight: 44,
              }}>
                <option value="all">Sve</option>
                {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

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

          {page === "pipeline" && (
            <PipelineView projects={filteredProjects} selectedId={selectedId} setSelectedId={setSelectedId} onOpenPanel={(id) => setPanelProjectId(id)} isMobile={isMobile} />
          )}

          {page === "dashboard" && isAdmin && (
            <DashboardView projects={projects} yearFilter={yearFilter} isMobile={isMobile} />
          )}

          {page === "checklist" && (
            <ChecklistView projects={filteredProjects} isAdmin={isAdmin} setSelectedId={setSelectedId} onOpenPanel={(id) => setPanelProjectId(id)} isMobile={isMobile} />
          )}

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

          {page === "tasks" && (
            <TasksView tasks={tasks} setTasks={setTasks} projects={projects} isAdmin={isAdmin} userName={userName} isMobile={isMobile} radniciList={newProjectRadniciList} onDeleteFromCloud={async (taskId) => { try { await supabase.from("tasks").delete().eq("id", taskId); } catch {} }} onSyncTask={syncSingleTaskToCloud} />
          )}
        </main>
      </div>

      {/* ═══════════ MOBILE BOTTOM TAB BAR ═══════════ */}
      {isMobile && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: PAPER,
          borderTop: `1px solid ${RULE}`, display: "flex", justifyContent: "space-around",
          padding: "4px 0 env(safe-area-inset-bottom, 6px)", zIndex: 500,
        }}>
          {[
            { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
            { id: "tasks", label: "Zadaci", icon: ListTodo },
            { id: "checklist", label: "Checklista", icon: Table },
            ...(isAdmin ? [{ id: "newproject", label: "Novi", icon: Plus }] : []),
          ].map((n) => {
            const Icon = n.icon;
            const active = n.id === "newproject" ? false : page === n.id;
            return (
              <button key={n.id} onClick={() => {
                if (n.id === "newproject") { setShowNewForm(true); }
                else { setPage(n.id); }
              }} style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 8px", minHeight: 44, minWidth: 56,
                color: active ? MOSS : n.id === "newproject" ? MOSS : MUTED, fontFamily: "'Inter', sans-serif",
                transition: "color 0.12s",
              }}>
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{n.label}</span>
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
            width: isMobile ? "calc(100% - 32px)" : 560, maxHeight: "85vh", overflowY: "auto",
            background: PAPER, borderRadius: 12, padding: 24, zIndex: 2001,
            boxShadow: "0 16px 50px rgba(14,14,14,0.12)", fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Novi predmet</h2>
              <Btn onClick={() => setShowNewForm(false)} style={{ padding: 4 }}><X size={16} /></Btn>
            </div>

            <div style={{ background: CREAM, borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>Kod projekta (preview)</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: MOSS, marginTop: 4 }}>{previewCode}</div>
              <div style={{ fontSize: 10, color: SAGE, marginTop: 2 }}>Ponuda: P-{buildProjectFolderCode(previewSeq, newProject.projectYear || ACTIVE_YEAR, newProject.projectMonth || new Date().getMonth() + 1, previewKoCode, previewOpCode)}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Godina" type="number" value={newProject.projectYear} onChange={(e) => {
                setNewProject((p) => ({ ...p, projectYear: Number(e.target.value || ACTIVE_YEAR) }));
              }} />
              <Select label="Mjesec" value={newProject.projectMonth} onChange={(e) => setNewProject((p) => ({ ...p, projectMonth: Number(e.target.value || 1) }))}>
                {ROMAN_NUMERALS.map((r, i) => <option key={i} value={i + 1}>{r} — {["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"][i]}</option>)}
              </Select>
              <Input label="Datum početka" type="date" value={newProject.startDate} onChange={(e) => setNewProject((p) => ({ ...p, startDate: e.target.value }))} />

              {/* Opština - ComboInput */}
              <ComboInput label="Opština" value={newProject.opstina}
                onChange={(val) => setNewProject((p) => ({ ...p, opstina: val, katastarskaOpstina: "", planskiDokument: "" }))}
                options={newProjectOpstinaList} customCategory="opstine" placeholder="Odaberi ili unesi opštinu" />

              {/* Katastarska opština - ComboInput */}
              <ComboInput label="Katastarska opština" value={newProject.katastarskaOpstina}
                onChange={(val) => setNewProject((p) => ({ ...p, katastarskaOpstina: val }))}
                options={newProjectKOList} customCategory={newProject.opstina ? `ko_${newProject.opstina}` : null} placeholder="Odaberi ili unesi KO" />

              <div style={{ gridColumn: "1/-1" }}><Input label="Naziv predmeta" value={newProject.nazivPredmeta} onChange={(e) => setNewProject((p) => ({ ...p, nazivPredmeta: e.target.value }))} /></div>
              <Input label="Investitor" value={newProject.investitor} onChange={(e) => setNewProject((p) => ({ ...p, investitor: e.target.value }))} />
              <Input label="Projektant" value={newProject.projektant} onChange={(e) => setNewProject((p) => ({ ...p, projektant: e.target.value }))} />
              <Input label="Vrsta radova" value={newProject.vrstaRadova} onChange={(e) => setNewProject((p) => ({ ...p, vrstaRadova: e.target.value }))} placeholder="izgradnja, rekonstrukcija..." />
              <Input label="Katastarska parcela" value={newProject.parcela} onChange={(e) => setNewProject((p) => ({ ...p, parcela: e.target.value }))} />
              <Input label="Urbanistička parcela" value={newProject.urbanistickaParcela} onChange={(e) => setNewProject((p) => ({ ...p, urbanistickaParcela: e.target.value }))} />

              {/* Planski dokument - ComboInput */}
              <ComboInput label="Planski dokument" value={newProject.planskiDokument}
                onChange={(val) => setNewProject((p) => ({ ...p, planskiDokument: val }))}
                options={newProjectPlanskiList} customCategory={newProject.opstina ? `planski_${newProject.opstina}` : null} placeholder="Odaberi ili unesi plan" />

              {/* Radnik - ComboInput */}
              <ComboInput label="Dodijeljeni radnik" value={newProject.assignedTo}
                onChange={(val) => setNewProject((p) => ({ ...p, assignedTo: val }))}
                options={newProjectRadniciList} customCategory="radnici" placeholder="Odaberi ili unesi radnika" />

              {/* Google Maps picker */}
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: SAGE, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>Lokacija</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={newProject.googleMapsLink} onChange={(e) => setNewProject((p) => ({ ...p, googleMapsLink: e.target.value }))} placeholder="Google Maps link ili koordinate"
                    style={{ flex: 1, border: `1px solid ${RULE}`, borderRadius: 6, padding: "9px 11px", fontSize: 13, background: PAPER, color: INK, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
                  />
                  <Btn onClick={() => setShowMapPicker(true)} style={{ padding: "9px 12px" }}>
                    <MapPin size={14} /> Mapa
                  </Btn>
                </div>
                {newProject.mapLat && newProject.mapLng && (
                  <div style={{ fontSize: 11, color: SAGE, marginTop: 4 }}>Koordinate: {newProject.mapLat}, {newProject.mapLng}</div>
                )}
              </div>
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

            <div style={{ background: CREAM, borderRadius: 6, padding: "8px 10px", marginTop: 10, fontSize: 11, color: SAGE }}>
              Folder: {buildProjectFolderPath(baseFolderPath, { ...newProject, projectSequence: previewSeq, projectYear: newProject.projectYear || ACTIVE_YEAR, projectMonth: newProject.projectMonth || new Date().getMonth() + 1 })}
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

/* ═══════════════════════════════════════════
   SIDEBAR BUTTON COMPONENT
   ═══════════════════════════════════════════ */
function SidebarBtn({ children, active, danger, onClick, style: extraStyle }) {
  const [hovered, setHovered] = useState(false);
  let bg = "transparent";
  let color = SAGE;
  let border = "none";

  if (active) { bg = "#ebebeb"; color = INK; }
  else if (danger) { color = DANGER; if (hovered) { bg = DANGER_BG; border = `1px solid ${DANGER_BORDER}`; } }
  else if (hovered) { bg = "#f5f5f5"; color = INK; }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6,
        border, cursor: "pointer", fontSize: 12, fontWeight: 600,
        background: bg, color, transition: "all 0.12s", fontFamily: "'Inter', sans-serif",
        textAlign: "left", ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

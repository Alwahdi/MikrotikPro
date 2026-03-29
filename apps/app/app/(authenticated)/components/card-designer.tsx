"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  UserIcon,
  KeyIcon,
  TagIcon,
  MapPinIcon,
  QrCodeIcon,
  TypeIcon,
  Trash2Icon,
  UploadIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  BoldIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface CardElement {
  id: string;
  type: "username" | "password" | "profile" | "salespoint" | "qrcode" | "custom";
  x: number; // mm from card left
  y: number; // mm from card top (baseline for text)
  fontSize: number; // PDF points
  fontColor: string; // hex
  bold: boolean;
  label: string;
  content?: string; // for custom type text or QR custom text
  qrContent?: "username" | "password" | "username-password" | "custom";
  qrSize?: number; // QR code width/height in mm
}

export interface CardDesign {
  cardWidth: number; // mm
  cardHeight: number; // mm
  columns: number;
  rows: number;
  backgroundImage: string | null; // uploaded image URL
  backgroundTemplate: string | null; // built-in template ID
  backgroundColor: string; // hex
  elements: CardElement[];
}

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

let _nextId = 1;
function genId() {
  return `el-${Date.now()}-${_nextId++}`;
}

const ELEMENT_ICONS: Record<CardElement["type"], React.ComponentType<{ className?: string }>> = {
  username: UserIcon,
  password: KeyIcon,
  profile: TagIcon,
  salespoint: MapPinIcon,
  qrcode: QrCodeIcon,
  custom: TypeIcon,
};

const ELEMENT_LABELS: Record<CardElement["type"], string> = {
  username: "Username",
  password: "Password",
  profile: "Profile",
  salespoint: "Sales Point",
  qrcode: "QR Code",
  custom: "Custom Text",
};

const ELEMENT_DEFAULTS: Record<CardElement["type"], Partial<CardElement>> = {
  username: { fontSize: 12, fontColor: "#000000", bold: true },
  password: { fontSize: 11, fontColor: "#333333", bold: false },
  profile: { fontSize: 10, fontColor: "#555555", bold: false },
  salespoint: { fontSize: 10, fontColor: "#555555", bold: false },
  qrcode: { fontSize: 10, fontColor: "#000000", bold: false, qrContent: "username-password", qrSize: 18 },
  custom: { fontSize: 10, fontColor: "#000000", bold: false, content: "Your text here" },
};

export const DEFAULT_CARD_DESIGN: CardDesign = {
  cardWidth: 61,
  cardHeight: 53,
  columns: 3,
  rows: 5,
  backgroundImage: null,
  backgroundTemplate: null,
  backgroundColor: "#ffffff",
  elements: [
    { id: "def-user", type: "username", x: 4, y: 15, fontSize: 12, fontColor: "#000000", bold: true, label: "Username" },
    { id: "def-pass", type: "password", x: 4, y: 23, fontSize: 11, fontColor: "#333333", bold: false, label: "Password" },
  ],
};

// ═══════════════════════════════════════════════════════
// A4 Page Layout Constants & Utilities
// ═══════════════════════════════════════════════════════

export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const PAGE_MARGIN = 10;
export const CARD_GAP = 3;

/** Calculate card dimensions that fill an A4 page evenly for the given grid. */
export function autoFitCardSize(cols: number, rows: number): { cardWidth: number; cardHeight: number } {
  const availW = PAGE_WIDTH - 2 * PAGE_MARGIN;
  const availH = PAGE_HEIGHT - 2 * PAGE_MARGIN;
  return {
    cardWidth: Math.max(Math.floor((availW - Math.max(cols - 1, 0) * CARD_GAP) / cols), 25),
    cardHeight: Math.max(Math.floor((availH - Math.max(rows - 1, 0) * CARD_GAP) / rows), 15),
  };
}

// ═══════════════════════════════════════════════════════
// Template Background Generator
// ═══════════════════════════════════════════════════════

export function generateTemplateBackground(templateId: string, w: number, h: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  switch (templateId) {
    case "wifi-blue": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0a1929");
      grad.addColorStop(0.5, "#1a365d");
      grad.addColorStop(1, "#0d47a1");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // WiFi arcs watermark
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(3, w * 0.008);
      const cx = w * 0.82;
      const cy = h * 0.28;
      for (let r = w * 0.04; r <= w * 0.14; r += w * 0.045) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.01, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
      // Bottom accent bar
      const barGrad = ctx.createLinearGradient(0, 0, w, 0);
      barGrad.addColorStop(0, "#42a5f5");
      barGrad.addColorStop(1, "#1565c0");
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, h - Math.max(5, h * 0.03), w, Math.max(5, h * 0.03));
      ctx.fillStyle = "#42a5f5";
      ctx.fillRect(0, 0, w, Math.max(2, h * 0.01));
      break;
    }
    case "hotspot-orange": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#e65100");
      grad.addColorStop(1, "#ff8f00");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Signal bars watermark
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 4; i++) {
        const barH = (i + 1) * (h * 0.08);
        const barW = w * 0.025;
        const bx = w * 0.75 + i * barW * 1.5;
        const by = h * 0.35 - barH;
        ctx.fillRect(bx, by, barW, barH);
      }
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, h - Math.max(5, h * 0.03), w, Math.max(5, h * 0.03));
      break;
    }
    case "minimal-white": {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      const barGrad2 = ctx.createLinearGradient(0, 0, w, 0);
      barGrad2.addColorStop(0, "#6366f1");
      barGrad2.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = barGrad2;
      ctx.fillRect(0, 0, w, Math.max(6, h * 0.035));
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      break;
    }
    case "neon-dark": {
      ctx.fillStyle = "#0f0f0f";
      ctx.fillRect(0, 0, w, h);
      // Green accent line with glow effect
      ctx.strokeStyle = "rgba(0,255,136,0.25)";
      ctx.lineWidth = Math.max(6, h * 0.03);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.15);
      ctx.lineTo(w * 0.4, h * 0.15);
      ctx.stroke();
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = Math.max(2, h * 0.01);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.15);
      ctx.lineTo(w * 0.4, h * 0.15);
      ctx.stroke();
      // Bottom accent
      ctx.fillStyle = "#00ff88";
      ctx.fillRect(0, h - Math.max(3, h * 0.015), w, Math.max(3, h * 0.015));
      // Horizontal lines pattern
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const ly = h * 0.3 + i * h * 0.08;
        const lx = w * 0.5 + (i % 3) * w * 0.1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + w * 0.15, ly);
        ctx.lineTo(lx + w * 0.15, ly + h * 0.06);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }

  return canvas.toDataURL("image/png");
}

// ═══════════════════════════════════════════════════════
// Built-in Templates
// ═══════════════════════════════════════════════════════

interface BuiltinTemplate {
  id: string;
  name: string;
  colors: [string, string]; // gradient for thumbnail
  design: CardDesign;
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "wifi-blue",
    name: "WiFi Premium",
    colors: ["#0a1929", "#0d47a1"],
    design: {
      cardWidth: 61, cardHeight: 53, columns: 3, rows: 5,
      backgroundImage: null, backgroundTemplate: "wifi-blue", backgroundColor: "#0a1929",
      elements: [
        { id: "t", type: "custom", x: 4, y: 10, fontSize: 13, fontColor: "#ffffff", bold: true, label: "Title", content: "WiFi Access Card" },
        { id: "u", type: "username", x: 4, y: 23, fontSize: 12, fontColor: "#ffffff", bold: true, label: "Username" },
        { id: "p", type: "password", x: 4, y: 31, fontSize: 11, fontColor: "#b3d4fc", bold: false, label: "Password" },
        { id: "q", type: "qrcode", x: 40, y: 9, fontSize: 10, fontColor: "#000000", bold: false, label: "QR Code", qrContent: "username-password", qrSize: 15 },
      ],
    },
  },
  {
    id: "hotspot-orange",
    name: "Hotspot Classic",
    colors: ["#e65100", "#ff8f00"],
    design: {
      cardWidth: 61, cardHeight: 53, columns: 3, rows: 5,
      backgroundImage: null, backgroundTemplate: "hotspot-orange", backgroundColor: "#e65100",
      elements: [
        { id: "t", type: "custom", x: 4, y: 10, fontSize: 13, fontColor: "#ffffff", bold: true, label: "Title", content: "Hotspot Voucher" },
        { id: "u", type: "username", x: 4, y: 23, fontSize: 12, fontColor: "#fff3e0", bold: true, label: "Username" },
        { id: "p", type: "password", x: 4, y: 31, fontSize: 11, fontColor: "#ffe0b2", bold: false, label: "Password" },
        { id: "pr", type: "profile", x: 4, y: 39, fontSize: 9, fontColor: "#ffcc80", bold: false, label: "Profile" },
      ],
    },
  },
  {
    id: "minimal-white",
    name: "Modern Minimal",
    colors: ["#ffffff", "#6366f1"],
    design: {
      cardWidth: 61, cardHeight: 53, columns: 3, rows: 5,
      backgroundImage: null, backgroundTemplate: "minimal-white", backgroundColor: "#ffffff",
      elements: [
        { id: "t", type: "custom", x: 4, y: 14, fontSize: 11, fontColor: "#6366f1", bold: true, label: "Title", content: "Internet Access" },
        { id: "u", type: "username", x: 4, y: 26, fontSize: 11, fontColor: "#1f2937", bold: true, label: "Username" },
        { id: "p", type: "password", x: 4, y: 34, fontSize: 10, fontColor: "#4b5563", bold: false, label: "Password" },
        { id: "q", type: "qrcode", x: 40, y: 14, fontSize: 10, fontColor: "#000000", bold: false, label: "QR Code", qrContent: "username", qrSize: 14 },
      ],
    },
  },
  {
    id: "neon-dark",
    name: "Neon Dark",
    colors: ["#0f0f0f", "#00ff88"],
    design: {
      cardWidth: 61, cardHeight: 53, columns: 3, rows: 5,
      backgroundImage: null, backgroundTemplate: "neon-dark", backgroundColor: "#0f0f0f",
      elements: [
        { id: "t", type: "custom", x: 4, y: 9, fontSize: 9, fontColor: "#00ff88", bold: true, label: "Title", content: "ACCESS CARD" },
        { id: "u", type: "username", x: 4, y: 23, fontSize: 13, fontColor: "#ffffff", bold: true, label: "Username" },
        { id: "p", type: "password", x: 4, y: 33, fontSize: 11, fontColor: "#a0a0a0", bold: false, label: "Password" },
        { id: "s", type: "salespoint", x: 4, y: 43, fontSize: 8, fontColor: "#00ff88", bold: false, label: "Sales Point" },
      ],
    },
  },
];

// ═══════════════════════════════════════════════════════
// Migration helper - convert old PrintProfile to CardDesign
// ═══════════════════════════════════════════════════════

export function migrateOldProfile(profile: {
  columns: number;
  rows: number;
  fontSize: number;
  showUsername: boolean;
  showPassword: boolean;
  showProfile: boolean;
  showSalesPoint: boolean;
  imageUrl: string | null;
  userX: number;
  userY: number;
  passX: number;
  passY: number;
  cardWidth: number | null;
  cardHeight: number | null;
  elements?: unknown;
  backgroundTemplate?: string | null;
  backgroundColor?: string | null;
}): CardDesign {
  const defaultSize = autoFitCardSize(profile.columns, profile.rows);

  // New-format profile: has elements array
  if (profile.elements && Array.isArray(profile.elements) && profile.elements.length > 0) {
    return {
      cardWidth: profile.cardWidth || defaultSize.cardWidth,
      cardHeight: profile.cardHeight || defaultSize.cardHeight,
      columns: profile.columns,
      rows: profile.rows,
      backgroundImage: profile.imageUrl,
      backgroundTemplate: profile.backgroundTemplate || null,
      backgroundColor: profile.backgroundColor || "#ffffff",
      elements: profile.elements as CardElement[],
    };
  }

  // Legacy profile: convert old fields to elements
  const elements: CardElement[] = [];
  if (profile.showUsername) {
    elements.push({
      id: genId(), type: "username", x: profile.userX, y: profile.userY,
      fontSize: profile.fontSize, fontColor: "#000000", bold: true, label: "Username",
    });
  }
  if (profile.showPassword) {
    elements.push({
      id: genId(), type: "password", x: profile.passX, y: profile.passY,
      fontSize: profile.fontSize, fontColor: "#333333", bold: false, label: "Password",
    });
  }
  if (profile.showProfile) {
    const baseY = Math.max(profile.userY, profile.passY);
    elements.push({
      id: genId(), type: "profile", x: profile.userX, y: baseY + 7,
      fontSize: profile.fontSize, fontColor: "#555555", bold: false, label: "Profile",
    });
  }
  if (profile.showSalesPoint) {
    const baseY = Math.max(profile.userY, profile.passY);
    elements.push({
      id: genId(), type: "salespoint", x: profile.userX,
      y: baseY + (profile.showProfile ? 14 : 7),
      fontSize: profile.fontSize, fontColor: "#555555", bold: false, label: "Sales Point",
    });
  }

  return {
    cardWidth: profile.cardWidth || defaultSize.cardWidth,
    cardHeight: profile.cardHeight || defaultSize.cardHeight,
    columns: profile.columns,
    rows: profile.rows,
    backgroundImage: profile.imageUrl,
    backgroundTemplate: null,
    backgroundColor: "#ffffff",
    elements,
  };
}

// Helper: element display text for preview
function getElementDisplayText(
  el: CardElement,
  sampleData?: { username: string; password: string; profile?: string },
  salesPointName?: string,
): string {
  switch (el.type) {
    case "username": return sampleData?.username || "user001";
    case "password": return sampleData?.password || "pass001";
    case "profile": return sampleData?.profile || "Profile";
    case "salespoint": return salesPointName || "Sales Point";
    case "custom": return el.content || "Custom text";
    case "qrcode": return "[QR]";
    default: return "";
  }
}

// ═══════════════════════════════════════════════════════
// CardDesigner Component
// ═══════════════════════════════════════════════════════

interface CardDesignerProps {
  design: CardDesign;
  onChange: (design: CardDesign) => void;
  previewData?: { username: string; password: string; profile?: string }[];
  salesPointName?: string;
  onImageUpload: (file: File) => Promise<string>;
  uploading?: boolean;
}

export function CardDesigner({
  design,
  onChange,
  previewData,
  salesPointName,
  onImageUpload,
  uploading = false,
}: CardDesignerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0 });
  const [showTemplates, setShowTemplates] = useState(false);
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});
  const [templateBgUrl, setTemplateBgUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(400);

  // Observe canvas container width for responsive scaling
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setCanvasWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const scale = canvasWidth / design.cardWidth;

  const sampleCard = previewData?.[0] || { username: "user001", password: "pass001", profile: "Default" };

  // Generate QR code preview images
  useEffect(() => {
    const qrElements = design.elements.filter((el) => el.type === "qrcode");
    if (qrElements.length === 0) { setQrPreviews({}); return; }

    let cancelled = false;
    (async () => {
      try {
        const { toDataURL } = await import("qrcode");
        const urls: Record<string, string> = {};
        for (const el of qrElements) {
          let qrText = "";
          switch (el.qrContent || "username") {
            case "username": qrText = sampleCard.username; break;
            case "password": qrText = sampleCard.password || ""; break;
            case "username-password": qrText = `${sampleCard.username}\n${sampleCard.password || ""}`; break;
            case "custom": qrText = el.content || "QR"; break;
          }
          urls[el.id] = await toDataURL(qrText || "test", {
            width: (el.qrSize || 18) * 4,
            margin: 0,
          });
        }
        if (!cancelled) setQrPreviews(urls);
      } catch { /* qrcode not available */ }
    })();
    return () => { cancelled = true; };
  }, [design.elements, sampleCard.username, sampleCard.password]);

  // Generate template background for preview
  useEffect(() => {
    if (!design.backgroundTemplate) { setTemplateBgUrl(null); return; }
    const url = generateTemplateBackground(design.backgroundTemplate, design.cardWidth * 4, design.cardHeight * 4);
    setTemplateBgUrl(url);
  }, [design.backgroundTemplate, design.cardWidth, design.cardHeight]);

  // ─── Element CRUD ──────────────────────────
  const addElement = useCallback((type: CardElement["type"]) => {
    const defaults = ELEMENT_DEFAULTS[type];
    const baseY = 15 + design.elements.length * 8;
    const newEl: CardElement = {
      id: genId(),
      type,
      x: type === "qrcode" ? design.cardWidth - 25 : 5,
      y: Math.min(baseY, design.cardHeight - 5),
      fontSize: defaults.fontSize || 10,
      fontColor: defaults.fontColor || "#000000",
      bold: defaults.bold || false,
      label: ELEMENT_LABELS[type],
      content: defaults.content,
      qrContent: defaults.qrContent as CardElement["qrContent"],
      qrSize: defaults.qrSize,
    };
    onChange({ ...design, elements: [...design.elements, newEl] });
    setSelectedId(newEl.id);
  }, [design, onChange]);

  const removeElement = useCallback((id: string) => {
    onChange({ ...design, elements: design.elements.filter((el) => el.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }, [design, onChange, selectedId]);

  const updateElement = useCallback((id: string, updates: Partial<CardElement>) => {
    onChange({
      ...design,
      elements: design.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    });
  }, [design, onChange]);

  // ─── Drag Handlers ─────────────────────────
  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = design.elements.find((el) => el.id === id);
    if (!el) return;
    setDragging(id);
    setSelectedId(id);
    setDragStart({ x: e.clientX, y: e.clientY, elX: el.x, elY: el.y });
  }, [design.elements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    let newX = Math.round((dragStart.elX + dx) * 2) / 2;
    let newY = Math.round((dragStart.elY + dy) * 2) / 2;
    newX = Math.max(0, Math.min(newX, design.cardWidth - 2));
    newY = Math.max(2, Math.min(newY, design.cardHeight - 1));
    updateElement(dragging, { x: newX, y: newY });
  }, [dragging, dragStart, scale, design.cardWidth, design.cardHeight, updateElement]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  // ─── Template Application ──────────────────
  const applyTemplate = useCallback((template: BuiltinTemplate) => {
    onChange({
      ...template.design,
      elements: template.design.elements.map((el) => ({ ...el, id: genId() })),
    });
    setShowTemplates(false);
    setSelectedId(null);
  }, [onChange]);

  // ─── File Upload ───────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await onImageUpload(file);
      onChange({ ...design, backgroundImage: url, backgroundTemplate: null });
    } catch { /* ignore */ }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [design, onChange, onImageUpload]);

  const selectedElement = design.elements.find((el) => el.id === selectedId) || null;
  const backgroundUrl = design.backgroundImage || templateBgUrl;

  // Page layout fit computations (A4 constraints)
  const _availW = PAGE_WIDTH - 2 * PAGE_MARGIN;
  const _availH = PAGE_HEIGHT - 2 * PAGE_MARGIN;
  const _maxCardW = (_availW - Math.max(design.columns - 1, 0) * CARD_GAP) / design.columns;
  const _maxCardH = (_availH - Math.max(design.rows - 1, 0) * CARD_GAP) / design.rows;
  const effectiveW = Math.round(Math.min(design.cardWidth, _maxCardW) * 10) / 10;
  const effectiveH = Math.round(Math.min(design.cardHeight, _maxCardH) * 10) / 10;
  const cardsShrunk = design.cardWidth > _maxCardW || design.cardHeight > _maxCardH;
  const gridOffsetX = PAGE_MARGIN + (_availW - (design.columns * effectiveW + Math.max(design.columns - 1, 0) * CARD_GAP)) / 2;
  const gridOffsetY = PAGE_MARGIN + (_availH - (design.rows * effectiveH + Math.max(design.rows - 1, 0) * CARD_GAP)) / 2;

  return (
    <div className="space-y-3">
      {/* ─── Element Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground me-0.5">Add:</span>
        {(["username", "password", "profile", "salespoint", "qrcode", "custom"] as const).map((type) => {
          const Icon = ELEMENT_ICONS[type];
          return (
            <Button key={type} variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-1.5"
              onClick={() => addElement(type)}>
              <Icon className="h-3 w-3" />
              {ELEMENT_LABELS[type]}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-1.5"
          onClick={() => setShowTemplates(true)}>
          <LayoutTemplateIcon className="h-3 w-3" />
          Templates
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-1.5"
          onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <UploadIcon className="h-3 w-3" />
          {uploading ? "Uploading..." : "Background"}
        </Button>
        {(design.backgroundImage || design.backgroundTemplate) && (
          <Button variant="ghost" size="sm" className="h-6 px-1.5"
            onClick={() => onChange({ ...design, backgroundImage: null, backgroundTemplate: null, backgroundColor: "#ffffff" })}>
            <Trash2Icon className="h-3 w-3 text-destructive" />
          </Button>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          <Label className="text-[10px]">BG:</Label>
          <Input type="color" className="h-6 w-8 p-0 border-0 cursor-pointer"
            value={design.backgroundColor}
            onChange={(e) => onChange({ ...design, backgroundColor: e.target.value })} />
        </div>
      </div>

      {/* ─── Visual Canvas ─── */}
      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-lg border-2"
        style={{
          aspectRatio: `${design.cardWidth} / ${design.cardHeight}`,
          backgroundColor: design.backgroundColor,
          cursor: dragging ? "grabbing" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedId(null)}
      >
        {/* Background image */}
        {backgroundUrl && (
          <img
            src={backgroundUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            draggable={false}
          />
        )}

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(128,128,128,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.06) 1px, transparent 1px)",
          backgroundSize: `${10 * scale}px ${10 * scale}px`,
        }} />

        {/* Elements */}
        {design.elements.map((el) => {
          const isQR = el.type === "qrcode";
          const isSelected = selectedId === el.id;
          const displayFontSize = el.fontSize * 0.353 * scale; // pt → mm → px
          const qrDisplaySize = (el.qrSize || 18) * scale;

          return (
            <div
              key={el.id}
              className={`absolute select-none transition-shadow ${
                dragging === el.id ? "cursor-grabbing z-20" : "cursor-grab z-10"
              } ${isSelected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-300"}`}
              style={{
                left: el.x * scale,
                top: isQR ? el.y * scale : (el.y - el.fontSize * 0.28) * scale,
                ...(isQR ? { width: qrDisplaySize, height: qrDisplaySize } : {}),
              }}
              onMouseDown={(e) => handleMouseDown(el.id, e)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
            >
              {isQR ? (
                qrPreviews[el.id] ? (
                  <img src={qrPreviews[el.id]} alt="QR" className="w-full h-full rounded-sm" draggable={false}
                    style={{ background: "#fff" }} />
                ) : (
                  <div className="w-full h-full border border-dashed rounded-sm flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.8)" }}>
                    <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )
              ) : (
                <span
                  style={{
                    fontSize: Math.max(displayFontSize, 8),
                    color: el.fontColor,
                    fontWeight: el.bold ? "bold" : "normal",
                    whiteSpace: "nowrap",
                    fontFamily: "ui-monospace, monospace",
                    lineHeight: 1,
                  }}
                >
                  {getElementDisplayText(el, sampleCard, salesPointName)}
                </span>
              )}

              {/* Selected element badge + delete */}
              {isSelected && (
                <div className="absolute -top-5 start-0 flex items-center gap-0.5">
                  <Badge variant="secondary" className="text-[8px] h-4 px-1">{el.label}</Badge>
                  <button
                    className="h-4 w-4 rounded bg-destructive text-white flex items-center justify-center text-[10px] hover:bg-red-600"
                    onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {design.elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Click "Add" above to place card elements
          </div>
        )}
      </div>

      {/* ─── Properties Panel (selected element) ─── */}
      {selectedElement && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <PaletteIcon className="h-3.5 w-3.5" />
                {selectedElement.label}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] text-destructive px-1.5"
                onClick={() => removeElement(selectedElement.id)}>
                <Trash2Icon className="h-3 w-3 me-0.5" /> Remove
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3 pt-0">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px]">X (mm)</Label>
                <Input type="number" className="h-6 text-[10px]" step="0.5"
                  value={selectedElement.x}
                  onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })} />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Y (mm)</Label>
                <Input type="number" className="h-6 text-[10px]" step="0.5"
                  value={selectedElement.y}
                  onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })} />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Size</Label>
                <Input type="number" className="h-6 text-[10px]" min="6" max="36"
                  value={selectedElement.fontSize}
                  onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Color</Label>
                <Input type="color" className="h-6 w-full p-0 border-0 cursor-pointer"
                  value={selectedElement.fontColor}
                  onChange={(e) => updateElement(selectedElement.id, { fontColor: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                <input type="checkbox" checked={selectedElement.bold}
                  onChange={(e) => updateElement(selectedElement.id, { bold: e.target.checked })} />
                <BoldIcon className="h-3 w-3" /> Bold
              </label>
              <div className="flex items-center gap-1">
                <Label className="text-[10px]">Label:</Label>
                <Input className="h-5 text-[10px] w-24"
                  value={selectedElement.label}
                  onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })} />
              </div>
            </div>

            {/* Custom text content */}
            {selectedElement.type === "custom" && (
              <div className="space-y-0.5">
                <Label className="text-[10px]">Content</Label>
                <Input className="h-6 text-[10px]"
                  value={selectedElement.content || ""}
                  onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} />
              </div>
            )}

            {/* QR Code settings */}
            {selectedElement.type === "qrcode" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">QR Content</Label>
                  <Select value={selectedElement.qrContent || "username"}
                    onValueChange={(v) => updateElement(selectedElement.id, { qrContent: v as CardElement["qrContent"] })}>
                    <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="username">Username</SelectItem>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem value="username-password">User + Pass</SelectItem>
                      <SelectItem value="custom">Custom Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Size (mm)</Label>
                  <Input type="number" className="h-6 text-[10px]" min="8" max="40"
                    value={selectedElement.qrSize || 18}
                    onChange={(e) => updateElement(selectedElement.id, { qrSize: Number(e.target.value) })} />
                </div>
                {selectedElement.qrContent === "custom" && (
                  <div className="col-span-2 space-y-0.5">
                    <Label className="text-[10px]">QR Text</Label>
                    <Input className="h-6 text-[10px]"
                      value={selectedElement.content || ""}
                      onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Page Layout Settings ─── */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Columns</Label>
            <Select value={String(design.columns)}
              onValueChange={(v) => {
                const c = Number(v);
                const fit = autoFitCardSize(c, design.rows);
                onChange({ ...design, columns: c, cardWidth: fit.cardWidth });
              }}>
              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Rows/Page</Label>
            <Input type="number" min="1" max="20" className="h-6 text-[10px]"
              value={design.rows}
              onChange={(e) => {
                const r = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                const fit = autoFitCardSize(design.columns, r);
                onChange({ ...design, rows: r, cardHeight: fit.cardHeight });
              }} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Card W (mm)</Label>
            <Input type="number" min="20" max="190" className="h-6 text-[10px]"
              value={design.cardWidth}
              onChange={(e) => onChange({ ...design, cardWidth: Math.max(20, Number(e.target.value) || 20) })} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Card H (mm)</Label>
            <Input type="number" min="15" max="270" className="h-6 text-[10px]"
              value={design.cardHeight}
              onChange={(e) => onChange({ ...design, cardHeight: Math.max(15, Number(e.target.value) || 15) })} />
          </div>
        </div>

        {/* Page fit indicator + mini A4 preview */}
        <div className="flex items-start gap-3">
          <div className="bg-white dark:bg-gray-950 border rounded shadow-sm flex-shrink-0 relative overflow-hidden"
            style={{ width: "72px", aspectRatio: "210 / 297" }}>
            {Array.from({ length: design.columns * design.rows }).map((_, i) => {
              const col = i % design.columns;
              const row = Math.floor(i / design.columns);
              return (
                <div key={i}
                  className={`absolute rounded-[1px] border ${cardsShrunk ? "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700" : "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700"}`}
                  style={{
                    left: `${((gridOffsetX + col * (effectiveW + CARD_GAP)) / PAGE_WIDTH) * 100}%`,
                    top: `${((gridOffsetY + row * (effectiveH + CARD_GAP)) / PAGE_HEIGHT) * 100}%`,
                    width: `${(effectiveW / PAGE_WIDTH) * 100}%`,
                    height: `${(effectiveH / PAGE_HEIGHT) * 100}%`,
                  }}
                />
              );
            })}
          </div>
          <div className="flex-1 space-y-1.5">
            {cardsShrunk ? (
              <Badge variant="outline" className="text-[9px] h-4 border-amber-400 text-amber-700 dark:text-amber-400">
                ⚠ Auto-shrunk to {effectiveW}×{effectiveH}mm
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] h-4 text-green-700 dark:text-green-400">
                ✓ Fits A4 — {design.cardWidth}×{design.cardHeight}mm
              </Badge>
            )}
            <p className="text-[9px] text-muted-foreground">
              {design.columns * design.rows} cards/page
            </p>
            <Button variant="outline" size="sm" className="h-5 text-[9px] gap-1 px-1.5"
              onClick={() => {
                const fit = autoFitCardSize(design.columns, design.rows);
                onChange({ ...design, ...fit });
              }}>
              Auto-fit to A4
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Template Gallery Dialog ─── */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplateIcon className="h-5 w-5" />
              Card Templates
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="group relative overflow-hidden rounded-lg border-2 p-0 text-start transition-all hover:border-primary hover:shadow-md"
                onClick={() => applyTemplate(t)}
              >
                <div
                  className="w-full"
                  style={{
                    aspectRatio: `${t.design.cardWidth} / ${t.design.cardHeight}`,
                    background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
                  }}
                >
                  <div className="relative h-full w-full">
                    {t.design.elements.map((el) => (
                      <div
                        key={el.id}
                        className="absolute truncate"
                        style={{
                          left: `${(el.x / t.design.cardWidth) * 100}%`,
                          top: `${(el.y / t.design.cardHeight) * 100}%`,
                          color: el.fontColor,
                          fontWeight: el.bold ? "bold" : "normal",
                          fontSize: "9px",
                          fontFamily: "ui-monospace, monospace",
                          lineHeight: 1,
                        }}
                      >
                        {el.type === "qrcode" ? (
                          <div className="w-6 h-6 border border-current rounded-sm flex items-center justify-center">
                            <QrCodeIcon className="h-3 w-3" />
                          </div>
                        ) : (
                          getElementDisplayText(el)
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2 bg-background">
                  <p className="text-xs font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.design.elements.length} elements</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import type { CardDesign } from "./card-designer";
import { generateTemplateBackground, PAGE_WIDTH, PAGE_HEIGHT, PAGE_MARGIN, CARD_GAP } from "./card-designer";

interface CardData {
  username: string;
  password: string;
  profile?: string;
}

interface GenerateOptions {
  salesPointName?: string;
  filename?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Compute actual card layout on an A4 page.
 * Cards are auto-shrunk proportionally if they exceed available space.
 * The grid is centered on the page.
 */
function computePageLayout(design: CardDesign) {
  const cols = design.columns;
  const rows = design.rows;
  const availW = PAGE_WIDTH - 2 * PAGE_MARGIN;
  const availH = PAGE_HEIGHT - 2 * PAGE_MARGIN;

  // Maximum card size that fits the grid
  const maxW = (availW - Math.max(cols - 1, 0) * CARD_GAP) / cols;
  const maxH = (availH - Math.max(rows - 1, 0) * CARD_GAP) / rows;

  // Auto-shrink cards if they exceed page bounds
  const cw = Math.min(design.cardWidth, maxW);
  const ch = Math.min(design.cardHeight, maxH);

  // Scale factor for element positions when card was shrunk
  const scaleX = design.cardWidth > 0 ? cw / design.cardWidth : 1;
  const scaleY = design.cardHeight > 0 ? ch / design.cardHeight : 1;

  // Center the grid on the page
  const totalW = cols * cw + Math.max(cols - 1, 0) * CARD_GAP;
  const totalH = rows * ch + Math.max(rows - 1, 0) * CARD_GAP;
  const offsetX = PAGE_MARGIN + (availW - totalW) / 2;
  const offsetY = PAGE_MARGIN + (availH - totalH) / 2;

  return { cw, ch, scaleX, scaleY, offsetX, offsetY, cols, rows, cardsPerPage: cols * rows };
}

export async function generateCardsPDF(
  cards: CardData[],
  design: CardDesign,
  options?: GenerateOptions,
): Promise<void> {
  if (cards.length === 0) return;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const { cw, ch, scaleX, scaleY, offsetX, offsetY, cols, cardsPerPage } = computePageLayout(design);

  // Pre-generate background image (reused for every card)
  let bgDataUrl: string | null = null;
  if (design.backgroundImage) {
    bgDataUrl = design.backgroundImage;
  } else if (design.backgroundTemplate) {
    bgDataUrl = generateTemplateBackground(
      design.backgroundTemplate,
      Math.round(cw * 10),
      Math.round(ch * 10),
    );
  }

  // Lazy-load QR library only if design has QR elements
  const hasQR = design.elements.some((el) => el.type === "qrcode");
  let qrToDataURL: ((text: string, opts: { width: number; margin: number }) => Promise<string>) | null = null;
  if (hasQR) {
    try {
      const mod = await import("qrcode");
      qrToDataURL = mod.toDataURL;
    } catch { /* not available */ }
  }

  for (let i = 0; i < cards.length; i++) {
    const posOnPage = i % cardsPerPage;
    const row = Math.floor(posOnPage / cols);
    const col = posOnPage % cols;

    if (i > 0 && posOnPage === 0) doc.addPage();

    const x = offsetX + col * (cw + CARD_GAP);
    const y = offsetY + row * (ch + CARD_GAP);

    // ── Card background ──
    if (bgDataUrl) {
      try {
        const fmt = bgDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(bgDataUrl, fmt, x, y, cw, ch);
      } catch {
        doc.setDrawColor(200);
        doc.rect(x, y, cw, ch);
      }
    } else {
      const bg = hexToRgb(design.backgroundColor);
      if (bg && design.backgroundColor !== "#ffffff") {
        doc.setFillColor(bg.r, bg.g, bg.b);
        doc.rect(x, y, cw, ch, "F");
      }
      doc.setDrawColor(200);
      doc.rect(x, y, cw, ch);
    }

    const card = cards[i];
    if (!card) continue;

    // ── Render each element (scaled to actual card size) ──
    for (const el of design.elements) {
      const elX = el.x * scaleX;
      const elY = el.y * scaleY;

      // Skip elements completely outside the card
      if (elX >= cw || elY >= ch) continue;

      if (el.type === "qrcode") {
        if (!qrToDataURL) continue;
        let qrText = "";
        switch (el.qrContent || "username") {
          case "username": qrText = card.username; break;
          case "password": qrText = card.password || ""; break;
          case "username-password": qrText = `${card.username}\n${card.password || ""}`; break;
          case "custom": qrText = el.content || ""; break;
        }
        if (!qrText) qrText = "N/A";
        try {
          const qrUrl = await qrToDataURL(qrText, { width: 300, margin: 1 });
          // Clamp QR size so it doesn't overflow card boundary
          const rawSize = (el.qrSize || 18) * Math.min(scaleX, scaleY);
          const size = Math.min(rawSize, cw - elX, ch - elY);
          if (size > 3) {
            doc.addImage(qrUrl, "PNG", x + elX, y + elY, size, size);
          }
        } catch { /* skip */ }
      } else {
        let text = "";
        switch (el.type) {
          case "username": text = card.username; break;
          case "password": text = card.password || card.username; break;
          case "profile": text = card.profile || ""; break;
          case "salespoint": text = options?.salesPointName || ""; break;
          case "custom": text = el.content || ""; break;
        }
        if (!text) continue;

        const fontSize = Math.max(el.fontSize * Math.min(scaleX, scaleY), 5);
        const color = hexToRgb(el.fontColor) || { r: 0, g: 0, b: 0 };
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", el.bold ? "bold" : "normal");

        // Truncate text that overflows the card boundary
        const maxW = cw - elX - 1;
        if (maxW > 2) {
          let display = text;
          if (doc.getTextWidth(text) > maxW) {
            for (let j = text.length - 1; j > 0; j--) {
              const t = text.slice(0, j) + "\u2026";
              if (doc.getTextWidth(t) <= maxW) { display = t; break; }
            }
            if (display === text) display = text.charAt(0);
          }
          doc.text(display, x + elX, y + elY);
        }
      }
    }

    // Progress callback
    if (options?.onProgress && (i % 5 === 0 || i === cards.length - 1)) {
      options.onProgress(i + 1, cards.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  doc.save(options?.filename || "cards.pdf");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  };
}

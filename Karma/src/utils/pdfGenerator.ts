import { jsPDF } from "jspdf";
import { customPdfFont } from "../assets/customPdfFont";
import {
  defaultSalons,
  type SalonLayout,
  type Seat,
  type Student,
} from "@/utils/seatingAlgorithm";

export interface PdfSettings {
  schoolName: string;
  examName: string;
  examDate: string;
  logoDataUrl: null,
}

const getTodayLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const defaultPdfSettings: PdfSettings = {
  schoolName: "",
  examName: "",
  examDate: getTodayLocal(),
  logoDataUrl: null,
};

function normalizePdfSettings(settings?: Partial<PdfSettings>): PdfSettings {
  return {
    ...defaultPdfSettings,
    ...(settings ?? {}),
  };
}

function getImageFormatFromDataUrl(
  dataUrl: string
): "PNG" | "JPEG" | "WEBP" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (
    dataUrl.startsWith("data:image/jpeg") ||
    dataUrl.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return null;
}

function formatExamDate(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("tr-TR");
}

function deriveSalonsFromSeats(seats: Seat[]): SalonLayout[] {
  const grouped = new Map<number, { rows: number; columns: number }>();

  for (const seat of seats) {
    const current = grouped.get(seat.salon) ?? { rows: 0, columns: 0 };
    current.rows = Math.max(current.rows, seat.row + 1);
    current.columns = Math.max(current.columns, seat.column + 1);
    grouped.set(seat.salon, current);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([id, value]) => ({
      id,
      name: `Salon ${id}`,
      rows: value.rows || 1,
      columns: value.columns || 2,
    }));
}

function isLeftSeat(
  seat: Seat,
  deskColumn: number,
  totalColumns: number
): boolean {
  if (seat.side) {
    return seat.side === "left";
  }

  // Backward compatibility for older history entries without `side`.
  if (totalColumns === 2) {
    return deskColumn === 0 ? seat.isOuter : !seat.isOuter;
  }
  return !seat.isOuter;
}

export function generateSeatingPDF(
  seats: Seat[],
  unassigned: Student[],
  settings?: Partial<PdfSettings>,
  salonLayouts?: SalonLayout[]
) {
  const pdfSettings = normalizePdfSettings(settings);
  const examDateLabel = formatExamDate(pdfSettings.examDate);
  const titlePrefix = pdfSettings.examName.trim() || "SINAV OTURMA PLANI";
  const schoolLabel = pdfSettings.schoolName.trim() || "KURUM ADI BELİRTİLMEDİ";
  const logoFormat = pdfSettings.logoDataUrl
    ? getImageFormatFromDataUrl(pdfSettings.logoDataUrl)
    : null;

  const derivedLayouts = deriveSalonsFromSeats(seats);
  const layouts =
    salonLayouts && salonLayouts.length > 0
      ? salonLayouts
      : derivedLayouts.length > 0
      ? derivedLayouts
      : defaultSalons;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.addFileToVFS("GandhiSans-Bold.ttf", customPdfFont);
  doc.addFont("GandhiSans-Bold.ttf", "GandhiSans", "normal");
  doc.addFont("GandhiSans-Bold.ttf", "GandhiSans", "bold");

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginY = 15;
  const availableWidth = pageWidth - 2 * marginX;

  let isFirstPage = true;

  for (const salon of layouts) {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    // --- Modern Header Section ---
    // Top Accent Line
    doc.setDrawColor(44, 62, 80); // Dark Blue-ish Gray
    doc.setLineWidth(1);
    doc.line(marginX, marginY, pageWidth - marginX, marginY);

    // School Name
    doc.setFontSize(10);
    doc.setFont("GandhiSans", "bold");
    doc.setTextColor(100);
    doc.text(schoolLabel.toUpperCase(), marginX, marginY + 5);

    // Main Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(titlePrefix, marginX, marginY + 12);
    
    // Salon Badge
    doc.setDrawColor(44, 62, 80);
    doc.setFillColor(44, 62, 80);
    doc.roundedRect(pageWidth - marginX - 45, marginY + 6, 45, 10, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.text(salon.name.toUpperCase(), pageWidth - marginX - 22.5, marginY + 12.5, { align: "center" });

    // Meta Info Row
    doc.setTextColor(60);
    doc.setFontSize(9);
    doc.setFont("GandhiSans", "normal");
    doc.text(`Tarih: ${examDateLabel || "---"}`, marginX, marginY + 18);
    doc.text(`Kapasite: ${salon.rows * salon.columns * 2} Koltuk`, marginX + 40, marginY + 18);
    
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(marginX, marginY + 21, pageWidth - marginX, marginY + 21);

    // --- Board Area ---
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200);
    doc.roundedRect(pageWidth / 2 - 25, marginY + 25, 50, 7, 1, 1, "FD");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("GandhiSans", "bold");
    doc.text("YAZI TAHTASI / ÖĞRETMEN MASASI", pageWidth / 2, marginY + 29.5, { align: "center" });

    // --- Seating Grid Layout ---
    const deskGap = salon.columns > 1 ? 10 : 0;
    const totalGap = (salon.columns - 1) * deskGap;
    const deskWidth = (availableWidth - totalGap - 10) / salon.columns; // -10 for row labels
    const seatWidth = deskWidth / 2;
    const seatHeight = 14;
    const rowSpacing = 6;
    const gridStartY = marginY + 40;
    const gridStartX = marginX + 8; // Offset for row labels

    const salonSeats = seats.filter((s) => s.salon === salon.id);
    const assignedStudents: Student[] = [];

    for (let r = 0; r < salon.rows; r++) {
      const currentY = gridStartY + r * (seatHeight + rowSpacing);
      
      // Row Label
      doc.setFontSize(8);
      doc.setTextColor(180);
      doc.text(`${r + 1}. Sıra`, marginX + 5, currentY + seatHeight / 2 + 1, { align: "right" });

      for (let c = 0; c < salon.columns; c++) {
        const deskX = gridStartX + c * (deskWidth + deskGap);

        // Desk Frame
        doc.setDrawColor(200);
        doc.setFillColor(252, 252, 252);
        doc.setLineWidth(0.3);
        doc.roundedRect(deskX, currentY, deskWidth, seatHeight, 1, 1, "FD");
        
        // Mid Divider
        doc.setDrawColor(230);
        doc.line(deskX + seatWidth, currentY, deskX + seatWidth, currentY + seatHeight);

        const deskSeats = salonSeats.filter((s) => s.column === c && s.row === r);

        for (const seat of deskSeats) {
          const left = isLeftSeat(seat, c, salon.columns);
          const txtX = deskX + (left ? seatWidth / 2 : seatWidth + seatWidth / 2);
          const txtY = currentY + seatHeight / 2 + 3;

          // Seat Index Number (Top Right Corner of the individual seat)
          const seatsPerRow = salon.columns * 2;
          const seatIdx = (r * seatsPerRow) + (c * 2) + (left ? 1 : 2);
          doc.setFontSize(5);
          doc.setTextColor(200);
          const idxX = deskX + (left ? seatWidth - 2 : deskWidth - 2);
          doc.text(seatIdx.toString(), idxX, currentY + 3, { align: "right" });

          if (seat.student) {
            assignedStudents.push(seat.student);
            
            // Draw Seat/Student Number
            doc.setFontSize(10);
            doc.setFont("GandhiSans", "bold");
            doc.setTextColor(0);
            doc.text(seat.student.number, txtX, txtY - 2.5, { align: "center" });

            // Draw Student Name
            doc.setFontSize(5.5);
            doc.setFont("GandhiSans", "normal");
            doc.setTextColor(60);
            
            let displayName = seat.student.name;
            if (displayName.length > 17) {
              const parts = displayName.split(' ');
              if (parts.length > 1) {
                const surname = parts.pop()!;
                displayName = `${parts.join(' ')} ${surname.charAt(0)}.`;
              }
            }
            
            doc.text(displayName, txtX, txtY + 2, { align: "center", maxWidth: seatWidth - 1 });
          } else {
            doc.setFontSize(7);
            doc.setFont("GandhiSans", "normal");
            doc.setTextColor(220);
            doc.text("BOŞ", txtX, txtY - 1, { align: "center" });
          }
        }
      }
    }

    // --- Student Index Table at Bottom ---
    const gridBottom = gridStartY + salon.rows * (seatHeight + rowSpacing);
    let listStartY = gridBottom + 12;
    
    // Ensure we don't start too low
    if (listStartY > 260) {
      doc.addPage();
      listStartY = marginY + 10;
    }

    const drawListHeader = (y: number) => {
      doc.setFillColor(248, 249, 250);
      doc.rect(marginX, y, availableWidth, 7, "F");
      doc.setFontSize(10);
      doc.setTextColor(44, 62, 80);
      doc.setFont("GandhiSans", "bold");
      doc.text("ÖĞRENCİ LİSTESİ", marginX + 3, y + 5);

      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text("ÖĞRENCİ (SINIF)", marginX + 3, y + 10);
      doc.text("ÖĞRENCİ (SINIF)", marginX + 3 + (availableWidth / 2), y + 10);
      
      return y + 15;
    };

    let currentIdxY = drawListHeader(listStartY);

    doc.setFontSize(8.5);
    doc.setFont("GandhiSans", "normal");
    doc.setTextColor(60);

    assignedStudents.sort((a, b) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.number.localeCompare(b.number);
    });

    let col = 0;
    const indexColWidth = availableWidth / 2;

    for (const st of assignedStudents) {
      const text = `${st.number} ${st.name}`;
      doc.text(text, marginX + 3 + col * indexColWidth, currentIdxY);
      
      currentIdxY += 7;
      
      if (currentIdxY > pageHeight - 20) {
        if (col < 1) {
          col += 1;
          // Restart Y to 15 below listStart on the same page
          currentIdxY = listStartY + 15;
        } else {
          doc.addPage();
          listStartY = marginY;
          currentIdxY = drawListHeader(listStartY);
          doc.setFontSize(8.5);
          doc.setFont("GandhiSans", "normal");
          doc.setTextColor(60);
          col = 0;
        }
      }
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.setFont("GandhiSans", "normal");
    doc.text("Karma Sınav Düzeni Sistemi tarafından oluşturulmuştur.", pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.text(`${doc.getNumberOfPages()}`, pageWidth - marginX, pageHeight - 8, { align: "right" });
  }

  // --- Unassigned Students Page ---
  if (unassigned.length > 0) {
    doc.addPage();
    doc.setDrawColor(192, 57, 43); // Red accent
    doc.setLineWidth(1);
    doc.line(marginX, marginY, pageWidth - marginX, marginY);

    doc.setFontSize(16);
    doc.setFont("GandhiSans", "bold");
    doc.setTextColor(192, 57, 43);
    doc.text("YERLEŞTİRİLEMEYEN ÖĞRENCİLER", marginX, marginY + 12);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${unassigned.length} öğrenci kapasite yetersizliği nedeniyle yerleştirilemedi.`, marginX, marginY + 18);

    doc.setDrawColor(230);
    doc.line(marginX, marginY + 22, pageWidth - marginX, marginY + 22);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("GandhiSans", "normal");

    let currentIdxY = marginY + 30;
    for (const st of unassigned) {
      const text = `${st.number} - ${st.name}`;
      doc.text(text, marginX, currentIdxY);
      currentIdxY += 7;
      
      if (currentIdxY > pageHeight - 20) {
        doc.addPage();
        currentIdxY = marginY + 20;
      }
    }
  }

  const fileName = `Karma_Plan_${titlePrefix.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

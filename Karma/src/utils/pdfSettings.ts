// Kept separate from pdfGenerator so settings code does not pull jsPDF into the initial bundle.
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

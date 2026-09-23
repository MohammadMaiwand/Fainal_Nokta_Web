export async function exportSheetsToPdf(
  sheets: HTMLElement[],
  fileName: string
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  for (const [index, sheet] of sheets.entries()) {
    const previousStyle = {
      width: sheet.style.width,
      maxWidth: sheet.style.maxWidth,
      aspectRatio: sheet.style.aspectRatio,
      boxShadow: sheet.style.boxShadow
    };
    sheet.style.width = '1122px';
    sheet.style.maxWidth = '1122px';
    sheet.style.aspectRatio = '297 / 210';
    sheet.style.boxShadow = 'none';

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
    } finally {
      sheet.style.width = previousStyle.width;
      sheet.style.maxWidth = previousStyle.maxWidth;
      sheet.style.aspectRatio = previousStyle.aspectRatio;
      sheet.style.boxShadow = previousStyle.boxShadow;
    }

    const image = canvas.toDataURL('image/jpeg', 0.96);
    if (index > 0) pdf.addPage('a4', 'landscape');
    pdf.addImage(image, 'JPEG', 0, 0, 297, 210);
  }

  pdf.save(fileName);
}

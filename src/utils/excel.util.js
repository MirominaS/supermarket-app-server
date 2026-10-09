import XLSX from "xlsx";

export const readExcelSheets = (buffer) => {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
  });

  const result = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    result[sheetName] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      trim: true,
    });
  }

  return result;
};

export const createExcelBuffer = ({ sheets }) => {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
};

import XLSX from "xlsx";

export const parseExcel = (req, res, next) => {
  try {
    //Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required.",
      });
    }

    //Validate file type
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    const isValidMimeType = allowedMimeTypes.includes(req.file.mimetype);

    const originalName = req.file.originalname.toLowerCase();

    const isValidExtension =
      originalName.endsWith(".xlsx") || originalName.endsWith(".xls");

    if (!isValidMimeType && !isValidExtension) {
      return res.status(400).json({
        success: false,
        message: "Only Excel files (.xlsx or .xls) are allowed.",
      });
    }

    //Read workbook
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    //Validate workbook
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel file does not contain any sheets.",
      });
    }

    //Convert ALL sheets to JSON
    const sheets = {};

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        return res.status(400).json({
          success: false,
          message: `Sheet "${sheetName}" could not be read.`,
        });
      }

      sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        raw: true,
        blankrows: true,
      });
    }

    //store parsed data
    req.excelData = sheets;
    next();
  } catch (error) {
    console.error("Excel parsing error:", error);

    return res.status(400).json({
      success: false,
      message: "Failed to parse Excel file.",
      error: error.message,
    });
  }
};

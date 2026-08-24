import { bulkImportProductsAndVariantsService } from "../services/product-bulk.service.js";

export const bulkImportProductsAndVariants = async (req, res) => {
  try {
    // Validate parsed Excel data
    if (!req.excelSheets) {
      return res.status(400).json({
        success: false,
        message: "Excel data was not parsed.",
      });
    }

    const result = await bulkImportProductsAndVariantsService(req.excelSheets);

    if (result.errors && result.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Bulk import failed. Please fix the Excel errors and try again.",
        data: result,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Products and variants imported successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Bulk import products and variants error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import products and variants.",
    });
  }
};

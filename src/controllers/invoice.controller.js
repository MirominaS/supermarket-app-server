import {
  getInvoicesService,
  getInvoiceByIdService,
  getCustomerInvoicesService,
} from "../services/invoice.service.js";
import { generateInvoicePdf } from "../utils/invoice-pdf.util.js";

//admin
export const getInvoices = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      paymentStatus,
      customer,
      fromDate,
      toDate,
    } = req.query;

    const result = await getInvoicesService({
      page,
      limit,
      search,
      status,
      paymentStatus,
      customer,
      fromDate,
      toDate,
    });

    return res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Get invoices error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await getInvoiceByIdService(invoiceId);

    return res.status(200).json({
      success: true,
      message: "Invoice retrieved successfully.",
      data: invoice,
    });
  } catch (error) {
    console.error("Get invoice by ID error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//customer
export const getMyInvoices = async (req, res) => {
  try {
    const customerId = req.user.id;

    const { page, limit } = req.query;

    const result = await getCustomerInvoicesService({
      customerId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Get customer invoices error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getMyInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await getInvoiceByIdService(invoiceId);

    // Security check
    if (invoice.customer._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this invoice.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice retrieved successfully.",
      data: invoice,
    });
  } catch (error) {
    console.error("Get customer invoice error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
//admin
export const downloadInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await getInvoiceByIdService(id);

    const pdfBuffer = await generateInvoicePdf(invoice);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Download invoice PDF error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
//customer
export const downloadMyInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await getInvoiceByIdService(id);

    // Make sure invoice belongs to logged-in customer
    if (
      invoice.customer._id.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this invoice.",
      });
    }

    const pdfBuffer = await generateInvoicePdf(invoice);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Download customer invoice PDF error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
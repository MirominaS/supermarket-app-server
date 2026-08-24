import {
  getOrdersService,
  getOrderByIdService,
  updateOrderStatusService,
  cancelOrderService,
  exportOrdersService,
} from "../services/order.service.js";
import { createSaleFromOrder } from "../services/sales.service.js";
import { createExcelBuffer } from "../utils/excel.util.js";

export const getOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const orders = await getOrdersService({
      status,
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await getOrderByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Order status is required.",
      });
    }

    const order = await updateOrderStatusService(req.params.id, status);

    if (status === "COMPLETED") {
      await createSaleFromOrder(order);
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await cancelOrderService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const exportOrders = async (req, res) => {
  try {
    const { status } = req.query;
    
    const rows = await exportOrdersService({
      status,
    });

    // Create Excel file
    const buffer = createExcelBuffer({
      sheets: [
        {
          name: "Orders",
          data: rows,
        },
      ],
    });

    // Generate filename
       const date = new Date().toISOString().slice(0, 10);

    const filename = status
      ? `orders-${status.toLowerCase()}-${date}.xlsx`
      : `orders-${date}.xlsx`;

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Export orders error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

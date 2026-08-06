import { getDashboardService } from "../services/dashboard.service.js";

export const getDashboard = async (req, res) => {
  try {
    const dashboard = await getDashboardService();

    return res.status(200).json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard.",
    });
  }
};
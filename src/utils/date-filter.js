export const buildDateFilter = ({
  period,
  startDate,
  endDate,
}) => {
  const now = new Date();

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return {
      soldAt: {
        $gte: start,
        $lte: end,
      },
    };
  }

  if (!period) {
    return {};
  }

  let from = new Date();

  switch (period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;

    case "week": {
      const day = from.getDay();
      const diff = day === 0 ? 6 : day - 1;

      from.setDate(from.getDate() - diff);
      from.setHours(0, 0, 0, 0);
      break;
    }

    case "month":
      from = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
      break;

    case "year":
      from = new Date(
        now.getFullYear(),
        0,
        1
      );
      break;

    default:
      throw new Error("Invalid period.");
  }

  return {
    soldAt: {
      $gte: from,
      $lte: now,
    },
  };
};
import PDFDocument from "pdfkit";

export const generateInvoicePdf = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on("error", (error) => {
        reject(error);
      });

      doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", {
        align: "center",
      });

      doc.moveDown(1);

      // Invoice Information
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Invoice Number: ${invoice.invoiceNumber}`);

      doc.text(
        `Invoice Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`,
      );

      doc.text(`Status: ${invoice.status}`);

      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("Bill To");

      doc.moveDown(0.3);

      doc.fontSize(10).font("Helvetica").text(invoice.customerName);

      if (invoice.customerEmail) {
        doc.text(invoice.customerEmail);
      }

      if (invoice.customerPhone) {
        doc.text(invoice.customerPhone);
      }

      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("Delivery Address");

      doc.moveDown(0.3);

      doc.fontSize(10).font("Helvetica").text(invoice.deliveryAddress.address);

      doc.text(`Contact: ${invoice.deliveryAddress.contactName}`);

      doc.text(`Phone: ${invoice.deliveryAddress.contactPhone}`);

      if (invoice.deliveryAddress.instructions) {
        doc.text(`Instructions: ${invoice.deliveryAddress.instructions}`);
      }

      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("Items");

      doc.moveDown(0.5);

      const tableTop = doc.y;

      const columns = {
        item: 50,
        sku: 260,
        quantity: 350,
        price: 410,
        subtotal: 480,
      };

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Item", columns.item, tableTop)
        .text("SKU", columns.sku, tableTop)
        .text("Qty", columns.quantity, tableTop)
        .text("Price", columns.price, tableTop)
        .text("Subtotal", columns.subtotal, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .stroke();

      let currentY = tableTop + 25;

      invoice.items.forEach((item) => {
        const itemName = item.variantName
          ? `${item.productName} - ${item.variantName}`
          : item.productName;

        doc
          .fontSize(9)
          .font("Helvetica")
          .text(itemName, columns.item, currentY, {
            width: 200,
          })
          .text(item.sku || "-", columns.sku, currentY, {
            width: 80,
          })
          .text(String(item.quantity), columns.quantity, currentY)
          .text(Number(item.price).toFixed(2), columns.price, currentY)
          .text(Number(item.subtotal).toFixed(2), columns.subtotal, currentY);

        currentY += 25;

        // New page if necessary
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });

      currentY += 10;

      doc.moveTo(350, currentY).lineTo(545, currentY).stroke();

      currentY += 15;

      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Subtotal:", 380, currentY)
        .text(Number(invoice.subtotal).toFixed(2), 480, currentY);

      currentY += 20;

      doc.text("Discount:", 380, currentY);

      doc.text(Number(invoice.discount || 0).toFixed(2), 480, currentY);

      currentY += 25;

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Total:", 380, currentY)
        .text(Number(invoice.total).toFixed(2), 480, currentY);

      currentY += 25;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(`Payment Method: ${invoice.paymentMethod}`, 50, currentY);

      currentY += 18;

      doc.text(`Payment Status: ${invoice.paymentStatus}`, 50, currentY);

      doc
        .fontSize(9)
        .font("Helvetica")
        .text("Thank you for shopping with us!", 50, 760, {
          align: "center",
          width: 495,
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

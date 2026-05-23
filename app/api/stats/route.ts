import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Item from "@/models/Item";
import Bill from "@/models/Bill";

export async function GET() {
  try {
    await connectDB();

    const [totalItems, totalBills, paidBills, unpaidBills, lowStockItems, items, bills] =
      await Promise.all([
        Item.countDocuments(),
        Bill.countDocuments(),
        Bill.countDocuments({ status: "paid" }),
        Bill.countDocuments({ status: "unpaid" }),
        Item.countDocuments({ stock: { $lte: 5 } }),
        Item.find(),
        Bill.find({ status: "paid" }),
      ]);

    const inventoryValue = items.reduce((acc, item) => acc + item.price * item.stock, 0);
    const totalRevenue = bills.reduce((acc, bill) => acc + bill.total, 0);

    // Last 7 days revenue
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBills = await Bill.find({
      status: "paid",
      createdAt: { $gte: sevenDaysAgo },
    });
    const recentRevenue = recentBills.reduce((acc, bill) => acc + bill.total, 0);

    return NextResponse.json({
      success: true,
      data: {
        totalItems,
        totalBills,
        paidBills,
        unpaidBills,
        lowStockItems,
        inventoryValue,
        totalRevenue,
        recentRevenue,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

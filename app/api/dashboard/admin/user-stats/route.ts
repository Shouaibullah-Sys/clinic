import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // User statistics
    const users = await prisma.user.findMany({
      select: { role: true, active: true, approved: true },
    });

    const userStatsMap = new Map<string, { count: number; active: number; approved: number }>();
    users.forEach((user) => {
      const existing = userStatsMap.get(user.role) || { count: 0, active: 0, approved: 0 };
      existing.count += 1;
      if (user.active) existing.active += 1;
      if (user.approved) existing.approved += 1;
      userStatsMap.set(user.role, existing);
    });

    const userStats = Array.from(userStatsMap.entries()).map(([role, data]) => ({
      role,
      count: data.count,
      active: data.active,
      approved: data.approved,
    }));

    // Recent users
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        approved: true,
        createdAt: true,
      },
    });

    // User activity trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsersByDay = await prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const userActivityMap = new Map<string, number>();
    recentUsersByDay.forEach((u) => {
      const dateStr = u.createdAt.toISOString().split("T")[0];
      userActivityMap.set(dateStr, (userActivityMap.get(dateStr) || 0) + 1);
    });

    const userActivity = Array.from(userActivityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      userStats,
      recentUsers,
      userActivity,
    });
  } catch (error) {
    console.error("User stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
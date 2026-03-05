"use client";

import { Coffee, ArrowRight } from "lucide-react";
import { useOrders } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, timeAgo } from "@/lib/utils";
import { RECENT_ORDERS } from "./constants";

export function RecentOrders() {
  const { data: recentOrders } = useOrders(5);

  const ordersData =
    recentOrders && recentOrders.length > 0
      ? recentOrders.map((o) => ({
          id: o.id?.slice(0, 8) || "ORD-XXXX",
          product: o.items?.[0]?.product_name || "Заказ",
          machine: o.machine_name || o.machine_id || "Unknown",
          total: o.total || 0,
          time: timeAgo(o.created_at),
        }))
      : RECENT_ORDERS;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Последние заказы</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-caramel-dark text-xs"
          >
            Все <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ordersData.map((order) => (
            <div key={order.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-caramel/10">
                <Coffee className="h-4 w-4 text-caramel-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-espresso-dark truncate">
                  {order.product}
                </p>
                <p className="text-xs text-espresso-light">
                  {order.machine} · {order.time}
                </p>
              </div>
              <span className="text-sm font-semibold text-espresso-dark whitespace-nowrap">
                {formatPrice(order.total)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

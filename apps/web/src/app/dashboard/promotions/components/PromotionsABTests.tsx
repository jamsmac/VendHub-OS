"use client";

import { CheckCircle2, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ABTest } from "./types";

interface PromotionsABTestsProps {
  abTests: ABTest[];
}

export function PromotionsABTests({ abTests }: PromotionsABTestsProps) {
  const activeTests = abTests.filter((t) => t.isActive);
  const completedTests = abTests.filter((t) => !t.isActive);

  return (
    <>
      {/* Active tests */}
      <div className="space-y-4">
        {activeTests.map((test) => (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <Badge variant="success">Активный тест</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {[
                  { key: "variantA" as const, label: "Вариант A" },
                  { key: "variantB" as const, label: "Вариант B" },
                ].map(({ key, label }) => {
                  const variant = test[key];
                  const isWinner = test.winner === key.slice(-1).toUpperCase();
                  return (
                    <div
                      key={key}
                      className={`border rounded-lg p-4 ${
                        isWinner
                          ? "ring-2 ring-emerald-500"
                          : "border-espresso/10"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-espresso-dark">
                            {label}
                          </p>
                          <p className="text-xs text-espresso-light mt-0.5">
                            {variant.description}
                          </p>
                        </div>
                        {isWinner && (
                          <Badge variant="success" className="ml-2">
                            Лучший
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-espresso-light">
                              Конверсия
                            </span>
                            <span className="text-sm font-bold text-espresso-dark">
                              {variant.rate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-espresso-50">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: variant.rate * 4 + "%" }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-espresso-50 rounded p-2">
                            <p className="text-espresso-light">Конверсии</p>
                            <p className="font-bold text-espresso-dark">
                              {variant.conversions}
                            </p>
                          </div>
                          <div className="bg-espresso-50 rounded p-2">
                            <p className="text-espresso-light">Пользователей</p>
                            <p className="font-bold text-espresso-dark">
                              {variant.users}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {test.statisticalSignificance && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    📊 Статистическая значимость:{" "}
                    <span className="font-semibold">
                      {test.statisticalSignificance}%
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {completedTests.length > 0 && (
          <>
            <div className="mt-8 pt-8 border-t border-espresso/10">
              <h3 className="text-lg font-semibold text-espresso-dark mb-4">
                Завершённые тесты
              </h3>
              <div className="space-y-4">
                {completedTests.map((test) => (
                  <Card key={test.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        {test.winner && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Победитель:
                            Вариант {test.winner}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="text-espresso-light">
                            Вариант A (текущий)
                          </p>
                          <p className="font-semibold text-espresso-dark">
                            {test.variantA.rate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="w-16 h-8 bg-espresso-50 rounded flex items-center justify-center">
                          <TrendingDown className="h-4 w-4 text-espresso-light" />
                        </div>
                        <div>
                          <p className="text-espresso-light">Вариант B</p>
                          <p className="font-semibold text-espresso-dark">
                            {test.variantB.rate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

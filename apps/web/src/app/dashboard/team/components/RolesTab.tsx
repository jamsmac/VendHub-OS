"use client";

import { Plus, CheckCircle, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROLE_META, PERMISSION_CATEGORIES, hasPermForRole } from "./constants";

interface RolesTabProps {
  onCreateRoleClick: () => void;
}

export function RolesTab({ onCreateRoleClick }: RolesTabProps) {
  return (
    <div className="space-y-4">
      <Card className="coffee-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-espresso-dark">
              Матрица ролей и прав доступа
            </CardTitle>
            <Button
              size="sm"
              className="gap-2 bg-espresso hover:bg-espresso-dark"
              onClick={onCreateRoleClick}
            >
              <Plus className="h-4 w-4" />
              Создать роль
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-espresso-50/50">
                <th className="text-left py-3 px-3 text-xs font-semibold text-espresso-light border border-espresso/10">
                  Роль
                </th>
                {PERMISSION_CATEGORIES.map((cat) => (
                  <th
                    key={cat.id}
                    className="text-center py-3 px-2 text-xs font-semibold text-espresso-light border border-espresso/10"
                  >
                    {cat.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_META).map(([roleKey, roleMeta]) => (
                <tr
                  key={roleKey}
                  className="hover:bg-espresso-50/30 border-b border-espresso/10"
                >
                  <td className="py-3 px-3 font-medium text-espresso-dark border border-espresso/10">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium ${roleMeta.color}`}
                    >
                      <roleMeta.icon className="h-3 w-3" />
                      {roleMeta.label}
                    </span>
                  </td>
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const hasPerm = cat.perms.some((p) =>
                      hasPermForRole(roleKey, p),
                    );
                    return (
                      <td
                        key={`${roleKey}-${cat.id}`}
                        className="text-center py-3 px-2 border border-espresso/10"
                      >
                        {hasPerm ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detailed Permissions */}
      <div className="space-y-4">
        {PERMISSION_CATEGORIES.map((cat) => (
          <Card key={cat.id} className="coffee-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-espresso-dark flex items-center gap-2">
                <cat.icon className="h-5 w-5" />
                {cat.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {cat.perms.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-espresso-50/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-espresso/30"
                    />
                    <span className="text-sm text-espresso-dark">
                      {perm.replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

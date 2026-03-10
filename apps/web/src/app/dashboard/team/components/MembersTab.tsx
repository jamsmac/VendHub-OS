"use client";

import { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  LayoutGrid,
  List,
  GitBranch,
  ChevronRight,
  Star,
  MessageSquare,
  Target,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_META, STATUS_META, DEPARTMENTS } from "./constants";
import type { ExtendedEmployee } from "./types";

interface MembersTabProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  deptFilter: string;
  onDeptFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewMode: "grid" | "list" | "tree";
  onViewModeChange: (mode: "grid" | "list" | "tree") => void;
  filtered: ExtendedEmployee[];
  selectedMembers: string[];
  onMemberSelect: (id: string) => void;
  onSelectAll: () => void;
  expandedDepts: string[];
  onToggleDept: (id: string) => void;
  onPreviewMember: (member: ExtendedEmployee) => void;
}

export function MembersTab({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  deptFilter,
  onDeptFilterChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  filtered,
  selectedMembers,
  onMemberSelect,
  onSelectAll,
  expandedDepts,
  onToggleDept,
  onPreviewMember,
}: MembersTabProps) {
  const t = useTranslations("teamMembers");

  const renderMemberCard = (member: ExtendedEmployee) => {
    const roleMeta = ROLE_META[member.role] || ROLE_META.viewer;
    const statusMeta = STATUS_META[member.status];
    const isSelected = selectedMembers.includes(member.id);
    return (
      <Card
        key={member.id}
        className={`coffee-card cursor-pointer hover:shadow-md transition-all ${isSelected ? "ring-2 ring-espresso" : ""}`}
        onClick={() => onPreviewMember(member)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onMemberSelect(member.id);
              }}
              className="mt-0.5"
            />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-espresso-100 text-sm font-semibold text-espresso shrink-0">
                {member.avatar}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${statusMeta.dot}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-espresso-dark truncate">
                {member.name}
              </p>
              <p className="text-xs text-espresso-light truncate">
                {member.position}
              </p>
              <div className="mt-1.5 flex gap-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleMeta.color}`}
                >
                  {roleMeta.label}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  KPI: 85
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-espresso/10 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs font-semibold text-espresso-dark">
                {member.tasksCompleted}
              </p>
              <p className="text-[10px] text-espresso-light">
                {t("tasksLabel")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-espresso-dark flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {member.rating}
              </p>
              <p className="text-[10px] text-espresso-light">
                {t("ratingLabel")}
              </p>
            </div>
            <div>
              <p className={`text-xs font-semibold ${statusMeta.color}`}>
                {statusMeta.label}
              </p>
              <p className="text-[10px] text-espresso-light">
                {member.lastActive}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMemberRow = (member: ExtendedEmployee) => {
    const roleMeta = ROLE_META[member.role] || ROLE_META.viewer;
    const statusMeta = STATUS_META[member.status];
    const isSelected = selectedMembers.includes(member.id);
    return (
      <TableRow
        key={member.id}
        className={`cursor-pointer hover:bg-espresso-50/50 ${isSelected ? "bg-espresso-50/50" : ""}`}
        onClick={() => onPreviewMember(member)}
      >
        <TableCell>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onMemberSelect(member.id);
            }}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-espresso-100 text-xs font-semibold text-espresso shrink-0">
                {member.avatar}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${statusMeta.dot}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-espresso-dark">
                {member.name}
              </p>
              <p className="text-xs text-espresso-light">{member.position}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${roleMeta.color}`}
          >
            {roleMeta.label}
          </span>
        </TableCell>
        <TableCell className="text-xs text-espresso-light">
          {DEPARTMENTS.find((d) => d.id === member.department)?.name ||
            member.department}
        </TableCell>
        <TableCell className="text-xs text-espresso-light">
          {member.email}
        </TableCell>
        <TableCell>
          <Badge variant="default" className="text-[10px]">
            KPI: 85
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <span className="flex items-center justify-center gap-0.5 text-xs">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {member.rating}
          </span>
        </TableCell>
        <TableCell className="text-center text-xs text-espresso-dark">
          {member.tasksCompleted}
        </TableCell>
        <TableCell>
          <span className={`text-xs ${statusMeta.color}`}>
            {statusMeta.label}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title={t("sendMessage")}
              onClick={() => {
                /* TODO: implement messaging */
              }}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title={t("assignTask")}
              onClick={() => {
                /* TODO: implement task assignment */
              }}
            >
              <Target className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title={t("moreActions")}
              onClick={() => onPreviewMember(member)}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onSearchChange(e.target.value)
              }
              className="border-espresso/20 pl-10"
            />
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-espresso-light" />
          </div>
        </div>
        <select
          value={roleFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onRoleFilterChange(e.target.value)
          }
          className="rounded-lg border border-espresso/20 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-espresso"
        >
          <option value="all">{t("allRoles")}</option>
          {Object.entries(ROLE_META).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
        <select
          value={deptFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onDeptFilterChange(e.target.value)
          }
          className="rounded-lg border border-espresso/20 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-espresso"
        >
          <option value="all">{t("allDepartments")}</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onStatusFilterChange(e.target.value)
          }
          className="rounded-lg border border-espresso/20 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-espresso"
        >
          <option value="all">{t("allStatuses")}</option>
          {Object.entries(STATUS_META).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
        <div className="flex gap-1 border border-espresso/20 rounded-lg p-1 bg-white dark:bg-gray-900">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="h-7 w-7 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "tree" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("tree")}
            className="h-7 w-7 p-0"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(renderMemberCard)}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="coffee-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-espresso/10 bg-espresso-50/50">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedMembers.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={onSelectAll}
                  />
                </TableHead>
                <TableHead>{t("colEmployee")}</TableHead>
                <TableHead>{t("colRole")}</TableHead>
                <TableHead>{t("colDepartment")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>KPI</TableHead>
                <TableHead className="text-center">{t("colRating")}</TableHead>
                <TableHead className="text-center">{t("colTasks")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{filtered.map(renderMemberRow)}</TableBody>
          </Table>
        </Card>
      )}

      {/* Tree View */}
      {viewMode === "tree" && (
        <div className="space-y-2">
          {DEPARTMENTS.map((dept) => {
            const members = filtered.filter((m) => m.department === dept.id);
            const isExpanded = expandedDepts.includes(dept.id);
            return (
              <div key={dept.id}>
                <Button
                  variant="ghost"
                  onClick={() => onToggleDept(dept.id)}
                  className={`w-full flex items-center gap-2 justify-start h-auto py-2.5 ${dept.bgColor}`}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <dept.icon className="h-4 w-4" />
                  <span className="font-medium text-espresso-dark">
                    {dept.name}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {members.length}
                  </Badge>
                </Button>
                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-1 border-l-2 border-espresso/10 pl-4">
                    {members.map((member) => {
                      const roleMeta =
                        ROLE_META[member.role] || ROLE_META.viewer;
                      const statusMeta = STATUS_META[member.status];
                      return (
                        <div
                          key={member.id}
                          onClick={() => onPreviewMember(member)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-espresso-50/50 cursor-pointer transition-all"
                        >
                          <div className="relative">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso-100 text-[10px] font-semibold text-espresso">
                              {member.avatar}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${statusMeta.dot}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-espresso-dark truncate">
                              {member.name}
                            </p>
                            <p className="text-[10px] text-espresso-light">
                              {member.position}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {roleMeta.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

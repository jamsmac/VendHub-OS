"use client";

import { useState, useMemo } from "react";
import {
  useTeamMembers,
  useActivityLog,
  useUpdateUserRole,
  useDeactivateUser,
  useActivateUser,
  useUpdateUserProfile,
  useToggleUserActive,
} from "@/lib/hooks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { UserRole } from "@/types";

import { TeamHeader } from "./components/TeamHeader";
import { TeamStats } from "./components/TeamStats";
import { BulkActionsBar } from "./components/BulkActionsBar";
import { MembersTab } from "./components/MembersTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { ScheduleTab } from "./components/ScheduleTab";
import { SalaryTab } from "./components/SalaryTab";
import { RolesTab } from "./components/RolesTab";
import { ActivityTab } from "./components/ActivityTab";
import { MemberPreview } from "./components/MemberPreview";
import { InviteModal } from "./components/InviteModal";
import { RoleModal } from "./components/RoleModal";
import type {
  ExtendedEmployee,
  TeamStats as TeamStatsType,
  ActivityLog,
} from "./components/types";

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState("members");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "tree">("grid");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const [previewMember, setPreviewMember] = useState<ExtendedEmployee | null>(
    null,
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Supabase hooks with mock fallback
  const { data: dbTeam } = useTeamMembers();
  const { data: dbActivity } = useActivityLog(10);

  // Mutation hooks
  const _updateRoleMutation = useUpdateUserRole();
  const deactivateMutation = useDeactivateUser();
  const _activateMutation = useActivateUser();
  const _updateProfileMutation = useUpdateUserProfile();
  const toggleActiveMutation = useToggleUserActive();

  // Use Supabase data when available, fallback to mocks
  const TEAM: ExtendedEmployee[] = useMemo(() => {
    if (dbTeam && dbTeam.length > 0) {
      return dbTeam.map((u: unknown) => {
        const user = u as {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          role?: string;
          is_active?: boolean;
          updated_at?: string;
          created_at?: string;
          organizationId?: string;
          avatarUrl?: string;
        };
        return {
          id: user.id || "",
          name: user.full_name || user.email || "Без имени",
          email: user.email || null,
          phone: user.phone || null,
          avatar: (user.full_name || "??")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2),
          role: (user.role || "viewer") as UserRole,
          department: "operations",
          position: user.role ? `${user.role} role` : "Сотрудник",
          status: (user.is_active ? "active" : "inactive") as
            | "active"
            | "inactive"
            | "away",
          lastActive: user.updated_at || "",
          joinedAt: user.created_at || "",
          tasksCompleted: 0,
          rating: 0,
          sessions: 0,
          organizationId: user.organizationId || "",
          avatarUrl: user.avatarUrl || null,
          createdAt: user.created_at || "",
          updatedAt: user.updated_at || "",
        };
      });
    }
    return [];
  }, [dbTeam]);

  const ACTIVITY: ActivityLog[] = useMemo(() => {
    if (dbActivity && dbActivity.length > 0) {
      return dbActivity.map((a: unknown) => {
        const activity = a as {
          id?: number;
          user_name?: string;
          action?: string;
          target?: string;
          details?: string;
          created_at?: string;
        };
        return {
          id: activity.id || 0,
          userId: 0,
          userName: activity.user_name || "Система",
          action: (activity.action || "edit") as
            | "edit"
            | "create"
            | "delete"
            | "view",
          target: activity.target || "",
          details: activity.details || "",
          timestamp: activity.created_at || "",
        };
      });
    }
    return [];
  }, [dbActivity]);

  // Filtered members
  const filtered = useMemo(() => {
    return TEAM.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false) ||
        (m.position?.toLowerCase().includes(q) ?? false);
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      const matchDept = deptFilter === "all" || m.department === deptFilter;
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchRole && matchDept && matchStatus;
    });
  }, [search, roleFilter, deptFilter, statusFilter, TEAM]);

  // KPIs
  const stats: TeamStatsType = useMemo(
    () => ({
      total: TEAM.length,
      active: TEAM.filter((m) => m.status === "active").length,
      away: TEAM.filter((m) => m.status === "away").length,
      inactive: TEAM.filter((m) => m.status === "inactive").length,
      avgRating:
        TEAM.length > 0
          ? +(
              TEAM.reduce((s, m) => s + (m.rating ?? 0), 0) / TEAM.length
            ).toFixed(1)
          : 0,
    }),
    [TEAM],
  );

  const toggleDept = (id: string): void => {
    setExpandedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const toggleMember = (id: string): void => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const toggleAllMembers = (): void => {
    if (selectedMembers.length === filtered.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filtered.map((m) => m.id));
    }
  };

  return (
    <div className="space-y-6">
      <TeamHeader onInviteClick={() => setShowInviteModal(true)} />
      <TeamStats stats={stats} />
      <BulkActionsBar
        count={selectedMembers.length}
        onClear={() => setSelectedMembers([])}
      />

      <Tabs
        defaultValue="members"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-6 h-auto bg-white dark:bg-gray-900 border border-espresso/10 rounded-lg p-1">
          <TabsTrigger
            value="members"
            className="rounded data-[state=active]:bg-espresso data-[state=active]:text-white"
          >
            Сотрудники
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded data-[state=active]:bg-espresso data-[state=active]:text-white"
          >
            Аналитика
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="rounded data-[state=active]:bg-espresso data-[state=active]:text-white"
          >
            Расписание
          </TabsTrigger>
          <TabsTrigger
            value="salary"
            className="rounded data-[state=active]:bg-espresso data-[state=active]:text-white"
          >
            Зарплата
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="rounded data-[state=active]:bg-espresso data-[state=active]:text-white"
          >
            Роли & права
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded data-[state=active]:bg-espresso data-[state=active]:text-white"
          >
            История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersTab
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            deptFilter={deptFilter}
            onDeptFilterChange={setDeptFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filtered={filtered}
            selectedMembers={selectedMembers}
            onMemberSelect={toggleMember}
            onSelectAll={toggleAllMembers}
            expandedDepts={expandedDepts}
            onToggleDept={toggleDept}
            onPreviewMember={setPreviewMember}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab />
        </TabsContent>

        <TabsContent value="salary">
          <SalaryTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab onCreateRoleClick={() => setShowRoleModal(true)} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab logs={ACTIVITY} />
        </TabsContent>
      </Tabs>

      <MemberPreview
        member={previewMember}
        open={!!previewMember}
        onClose={() => setPreviewMember(null)}
        isToggleLoading={toggleActiveMutation.isPending}
        isDeactivateLoading={deactivateMutation.isPending}
        onToggleActive={() => {
          if (previewMember) {
            toggleActiveMutation.mutate(
              {
                userId: previewMember.id.toString(),
                isActive: previewMember.status === "inactive",
              },
              {
                onSuccess: () => {
                  setPreviewMember(null);
                },
              },
            );
          }
        }}
        onDeactivate={() => {
          if (previewMember) {
            deactivateMutation.mutate(previewMember.id.toString(), {
              onSuccess: () => {
                setPreviewMember(null);
              },
            });
          }
        }}
      />

      <InviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
      <RoleModal open={showRoleModal} onClose={() => setShowRoleModal(false)} />
    </div>
  );
}

"use client";

import { Mail, Phone, Send, Star, Edit3, Lock, Trash2 } from "lucide-react";
import {
  SlideOver,
  SlideOverBody,
  SlideOverFooter,
} from "@/components/ui/slide-over";
import { Button } from "@/components/ui/button";
import { ROLE_META, STATUS_META, DEPARTMENTS, ZONES } from "./constants";
import type { ExtendedEmployee } from "./types";
import { formatDate } from "@/lib/utils";

interface MemberPreviewProps {
  member: ExtendedEmployee | null;
  open: boolean;
  onClose: () => void;
  isToggleLoading?: boolean;
  isDeactivateLoading?: boolean;
  onToggleActive?: () => void;
  onDeactivate?: () => void;
}

export function MemberPreview({
  member,
  open,
  onClose,
  isToggleLoading = false,
  isDeactivateLoading = false,
  onToggleActive,
  onDeactivate,
}: MemberPreviewProps) {
  if (!member) return null;

  const roleMeta = ROLE_META[member.role] || ROLE_META.viewer;
  const statusMeta = STATUS_META[member.status];

  return (
    <SlideOver open={open} onClose={onClose} title="Карточка сотрудника">
      <SlideOverBody>
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-espresso-100 text-lg font-bold text-espresso">
              {member.avatar}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-3 border-white dark:border-gray-900 ${statusMeta.dot}`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-espresso-dark">
              {member.name}
            </h3>
            <p className="text-sm text-espresso-light">{member.position}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleMeta.color}`}
              >
                {roleMeta.label}
              </span>
              <span className={`text-xs ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold text-espresso-light uppercase tracking-wider">
            Контакты
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-espresso-light" />
              <a
                href={`mailto:${member.email}`}
                className="text-espresso hover:underline"
              >
                {member.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-espresso-light" />
              <span className="text-espresso-dark">{member.phone}</span>
            </div>
            {member.telegramId && (
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-espresso-light" />
                <span className="text-espresso-dark">{member.telegramId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl bg-espresso-50/50 dark:bg-gray-800/50 p-3 text-center">
            <p className="text-xl font-bold text-espresso-dark">
              {member.tasksCompleted}
            </p>
            <p className="text-[10px] text-espresso-light">Задач выполнено</p>
          </div>
          <div className="rounded-xl bg-espresso-50/50 dark:bg-gray-800/50 p-3 text-center">
            <p className="text-xl font-bold text-espresso-dark flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {member.rating}
            </p>
            <p className="text-[10px] text-espresso-light">Рейтинг</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-espresso-light uppercase tracking-wider">
            Информация
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-espresso-light">Отдел</span>
              <span className="text-espresso-dark font-medium">
                {DEPARTMENTS.find((d) => d.id === member.department)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-espresso-light">Зона</span>
              <span className="text-espresso-dark font-medium">{ZONES[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-espresso-light">Дата вступления</span>
              <span className="text-espresso-dark font-medium">
                {member.joinedAt ? formatDate(member.joinedAt) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-espresso-light">Последняя активность</span>
              <span className="text-espresso-dark font-medium">
                {member.lastActive}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-espresso-light">Активных сессий</span>
              <span className="text-espresso-dark font-medium">
                {member.sessions}
              </span>
            </div>
          </div>
        </div>
      </SlideOverBody>
      <SlideOverFooter>
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              // TODO: implement edit profile navigation
            }}
          >
            <Edit3 className="h-4 w-4" />
            Редактировать
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
            disabled={isToggleLoading}
            onClick={onToggleActive}
            title={
              member.status === "inactive" ? "Активировать" : "Деактивировать"
            }
          >
            <Lock
              className={`h-4 w-4 ${isToggleLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            disabled={isDeactivateLoading}
            onClick={onDeactivate}
          >
            <Trash2
              className={`h-4 w-4 ${isDeactivateLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </SlideOverFooter>
    </SlideOver>
  );
}

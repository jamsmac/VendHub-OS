"use client";

import { Button } from "@/components/ui/button";
import { Tab, TabId } from "./types";

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="flex gap-1 border-b border-espresso/10 pb-1 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 rounded-t-lg whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-espresso text-white hover:bg-espresso-dark"
                : "text-espresso-light hover:bg-espresso-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

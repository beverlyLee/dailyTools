import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DashboardConfig, WidgetConfig } from '../types';

const STORAGE_KEY = 'personal-dashboard-layout';

interface LayoutContextType {
  config: DashboardConfig;
  addWidget: (widget: Omit<WidgetConfig, 'position'>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  reorderWidgets: (activeId: string, overId: string) => void;
  resetLayout: () => void;
}

const defaultConfig: DashboardConfig = {
  id: 'default',
  name: '默认仪表板',
  widgets: []
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      console.warn('Failed to load layout from localStorage');
    }
    return defaultConfig;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('Failed to save layout to localStorage:', err);
    }
  }, [config]);

  const addWidget = (widget: Omit<WidgetConfig, 'position'>) => {
    const newWidget: WidgetConfig = {
      ...widget,
      id: widget.id || `widget-${Date.now()}`,
      position: { x: 0, y: config.widgets.length }
    };
    setConfig(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  };

  const removeWidget = (id: string) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== id)
    }));
  };

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === id ? { ...w, ...updates } : w
      )
    }));
  };

  const reorderWidgets = (activeId: string, overId: string) => {
    setConfig(prev => {
      const widgets = [...prev.widgets];
      const activeIndex = widgets.findIndex(w => w.id === activeId);
      const overIndex = widgets.findIndex(w => w.id === overId);

      if (activeIndex === -1 || overIndex === -1) return prev;

      const [activeWidget] = widgets.splice(activeIndex, 1);
      widgets.splice(overIndex, 0, activeWidget);

      return {
        ...prev,
        widgets: widgets.map((w, index) => ({
          ...w,
          position: { ...w.position, y: index }
        }))
      };
    });
  };

  const resetLayout = () => {
    setConfig(defaultConfig);
  };

  return (
    <LayoutContext.Provider
      value={{
        config,
        addWidget,
        removeWidget,
        updateWidget,
        reorderWidgets,
        resetLayout
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

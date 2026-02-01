
import { useState, useEffect, useCallback } from 'react';
import { ApiKeyConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'molecular_api_configs';

export const useApiKey = () => {
  const [configs, setConfigs] = useState<ApiKeyConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  }, [configs]);

  const addConfig = useCallback((name: string, key: string, model: string) => {
    const newConfig: ApiKeyConfig = {
      id: uuidv4(),
      name: name || 'Neural Link',
      key,
      model,
      isActive: configs.length === 0, // Make active if it's the first one
    };
    setConfigs(prev => [...prev, newConfig]);
  }, [configs]);

  const updateConfig = useCallback((id: string, updates: Partial<ApiKeyConfig>) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteConfig = useCallback((id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
  }, []);

  const setActiveConfig = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => ({ ...c, isActive: c.id === id })));
  }, []);

  const activeConfig = configs.find(c => c.isActive) || null;

  return { configs, addConfig, updateConfig, deleteConfig, setActiveConfig, activeConfig };
};

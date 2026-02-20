import { paymeTemplate } from './payme.template';
import { clickTemplate } from './click.template';
import { uzumTemplate } from './uzum.template';
import { multikassaTemplate } from './multikassa.template';
import { PaymentIntegrationConfig, IntegrationCategory } from '../types/integration.types';

export interface TemplateInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  country: string;
  logo: string;
  website: string;
  documentationUrl: string;
  tags: string[];
  config: PaymentIntegrationConfig;
}

// ============================================
// All Available Templates
// ============================================

export const templates: TemplateInfo[] = [
  {
    id: 'payme',
    name: 'payme',
    displayName: 'Payme',
    description: 'Payme - самая популярная платёжная система Узбекистана',
    category: IntegrationCategory.PAYMENT,
    country: 'UZ',
    logo: 'https://cdn.payme.uz/logo.svg',
    website: 'https://payme.uz',
    documentationUrl: 'https://developer.help.paycom.uz/',
    tags: ['payment', 'uzbekistan', 'cards', 'wallet', 'popular'],
    config: paymeTemplate,
  },
  {
    id: 'click',
    name: 'click',
    displayName: 'Click',
    description: 'Click - надёжная платёжная система с широким охватом',
    category: IntegrationCategory.PAYMENT,
    country: 'UZ',
    logo: 'https://click.uz/static/logo.svg',
    website: 'https://click.uz',
    documentationUrl: 'https://docs.click.uz/',
    tags: ['payment', 'uzbekistan', 'cards', 'wallet'],
    config: clickTemplate,
  },
  {
    id: 'uzum',
    name: 'uzum',
    displayName: 'Uzum Bank',
    description: 'Uzum Bank (Apelsin) - современный банк с удобным API',
    category: IntegrationCategory.PAYMENT,
    country: 'UZ',
    logo: 'https://uzumbank.uz/logo.svg',
    website: 'https://uzumbank.uz',
    documentationUrl: 'https://developer.uzumbank.uz/',
    tags: ['payment', 'uzbekistan', 'cards', 'wallet', 'qr', 'installment'],
    config: uzumTemplate,
  },
  {
    id: 'multikassa',
    name: 'multikassa',
    displayName: 'MultiKassa',
    description: 'Виртуальная касса для фискализации чеков в Узбекистане (ГНК)',
    category: IntegrationCategory.FISCAL,
    country: 'UZ',
    logo: 'https://multibank.uz/logo.svg',
    website: 'https://multibank.uz',
    documentationUrl: 'https://docs-virtual-kassa.multibank.uz/',
    tags: ['fiscal', 'uzbekistan', 'receipt', 'kassa', 'gnk', 'tax'],
    config: multikassaTemplate,
  },
];

// ============================================
// Template Helpers
// ============================================

export function getTemplate(id: string): TemplateInfo | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: IntegrationCategory): TemplateInfo[] {
  return templates.filter(t => t.category === category);
}

export function getTemplatesByCountry(country: string): TemplateInfo[] {
  return templates.filter(t => t.country === country);
}

export function searchTemplates(query: string): TemplateInfo[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.displayName.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Export individual templates
export { paymeTemplate } from './payme.template';
export { clickTemplate } from './click.template';
export { uzumTemplate } from './uzum.template';
export { multikassaTemplate } from './multikassa.template';

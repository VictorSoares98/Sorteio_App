export interface UserSettings {
  appearance: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    layout: 'cards' | 'list' | 'compact';
    primaryColor: string;
    secondaryColor: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    sales: boolean;
    raffles: boolean;
    system: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'never';
    emailProvider: 'emailjs' | 'smtp' | 'none';
  };
  security: {
    twoFactorAuth: boolean;
    requirePasswordChange: boolean;
    lastPasswordChange: Date | null;
    inactivityTimeout: number; // em minutos
    confirmSensitiveActions: boolean;
  };
  exportPreferences: {
    format: 'csv' | 'pdf' | 'excel';
    includeDetails: boolean;
    autoExport: boolean;
    dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
    fieldsToExport: string[];
  };
  lastUpdated: Date | null;
}

export const defaultUserSettings: UserSettings = {
  appearance: {
    theme: 'light',
    fontSize: 'medium',
    compactMode: false,
    layout: 'cards',
    primaryColor: '#FF8C00',
    secondaryColor: '#FFC125'
  },
  notifications: {
    email: true,
    push: true,
    sales: true,
    raffles: true,
    system: true,
    frequency: 'weekly',
    emailProvider: 'emailjs'
  },
  security: {
    twoFactorAuth: false,
    requirePasswordChange: false,
    lastPasswordChange: null,
    inactivityTimeout: 30, // 30 minutos
    confirmSensitiveActions: true
  },
  exportPreferences: {
    format: 'pdf',
    includeDetails: true,
    autoExport: false,
    dateFormat: 'dd/MM/yyyy',
    fieldsToExport: ['name', 'email', 'date', 'amount']
  },
  lastUpdated: null
};

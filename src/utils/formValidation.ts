import { z } from 'zod';
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';

// Definir esquema com Zod
export const settingsFormSchema = z.object({
  systemName: z.string().min(3).max(50),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Cor inválida'),
  enableFeatures: z.boolean().default(true),
  // Outros campos...
});

// Tipo inferido automaticamente do esquema
export type SettingsForm = z.infer<typeof settingsFormSchema>;

// Hook para usar em componentes
export function useSettingsForm(initialValues?: Partial<SettingsForm>) {
  return useForm({
    validationSchema: toTypedSchema(settingsFormSchema),
    initialValues
  });
}

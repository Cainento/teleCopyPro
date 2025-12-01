import { z } from 'zod';

/**
 * Schema para criação de job de cópia
 */
export const copyJobSchema = z.object({
  sourceChannel: z
    .string()
    .min(1, 'Canal de origem obrigatório')
    .refine(
      (val) => val.startsWith('@') || val.startsWith('-') || /^\d+$/.test(val),
      'Use @username, -100XXXXXXXXX ou ID numérico'
    ),
  targetChannel: z
    .string()
    .min(1, 'Canal de destino obrigatório')
    .refine(
      (val) => val.startsWith('@') || val.startsWith('-') || /^\d+$/.test(val),
      'Use @username, -100XXXXXXXXX ou ID numérico'
    ),
  realTime: z.boolean(),
  copyMedia: z.boolean(),
});

export type CopyJobFormData = z.infer<typeof copyJobSchema>;

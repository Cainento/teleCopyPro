import { z } from 'zod';

/**
 * Schema para o primeiro passo: telefone e credenciais da API
 */
export const phoneStepSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Número de telefone obrigatório')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Formato inválido. Use +55 seguido do número'),
  apiId: z
    .string()
    .min(1, 'API ID obrigatório')
    .regex(/^\d+$/, 'API ID deve conter apenas números'),
  apiHash: z
    .string()
    .min(1, 'API Hash obrigatório')
    .min(32, 'API Hash deve ter pelo menos 32 caracteres'),
});

// Input type for the form (before transformation)
export type PhoneStepFormInput = z.input<typeof phoneStepSchema>;

// Output type (after transformation)
export type PhoneStepFormData = {
  phoneNumber: string;
  apiId: number;
  apiHash: string;
};

/**
 * Schema para o segundo passo: código de verificação
 */
export const codeStepSchema = z.object({
  code: z
    .string()
    .min(1, 'Código obrigatório')
    .regex(/^\d{5}$/, 'Código deve ter 5 dígitos'),
});

export type CodeStepFormData = z.infer<typeof codeStepSchema>;

/**
 * Schema para o terceiro passo (opcional): senha 2FA
 */
export const twoFactorStepSchema = z.object({
  password: z
    .string()
    .min(1, 'Senha obrigatória')
    .min(1, 'Senha não pode estar vazia'),
});

export type TwoFactorStepFormData = z.infer<typeof twoFactorStepSchema>;

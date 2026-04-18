import { supabase } from '@/integrations/supabase/client';

export const FISCAL_REQUIRED_FIELDS: Record<string, string> = {
  legal_name: 'Razão social / Nome',
  tax_id: 'CNPJ / CPF',
  email: 'E-mail',
  postal_code: 'CEP',
  address_line1: 'Logradouro',
  address_number: 'Número',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'UF',
};

export interface FiscalReadiness {
  ready: boolean;
  missing: string[]; // field keys
  missingLabels: string[];
  hasProfile: boolean;
}

export async function checkFiscalReadiness(adminUserId: string): Promise<FiscalReadiness> {
  const { data } = await supabase
    .from('billing_profiles')
    .select('legal_name, tax_id, email, postal_code, address_line1, address_number, neighborhood, city, state')
    .eq('admin_user_id', adminUserId)
    .maybeSingle();

  if (!data) {
    const missing = Object.keys(FISCAL_REQUIRED_FIELDS);
    return {
      ready: false,
      missing,
      missingLabels: missing.map((k) => FISCAL_REQUIRED_FIELDS[k]),
      hasProfile: false,
    };
  }

  const missing = Object.keys(FISCAL_REQUIRED_FIELDS).filter(
    (k) => !String((data as Record<string, unknown>)[k] || '').trim()
  );
  return {
    ready: missing.length === 0,
    missing,
    missingLabels: missing.map((k) => FISCAL_REQUIRED_FIELDS[k]),
    hasProfile: true,
  };
}

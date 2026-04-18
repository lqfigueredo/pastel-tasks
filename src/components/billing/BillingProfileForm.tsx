import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id?: string;
  entity_type: 'individual' | 'company';
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const empty: Profile = {
  entity_type: 'individual',
  legal_name: '',
  tax_id: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'BR',
};

export default function BillingProfileForm() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('billing_profiles')
      .select('*')
      .eq('admin_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
        else setProfile({ ...empty, email: user.email || '' });
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!profile.legal_name.trim() || !profile.tax_id.trim()) {
      toast.error('Nome e CPF/CNPJ são obrigatórios');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('billing_profiles')
      .upsert({ ...profile, admin_user_id: user.id }, { onConflict: 'admin_user_id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Dados fiscais salvos');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Dados fiscais</CardTitle>
        <CardDescription>Necessários para emissão de nota fiscal e cobrança.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={profile.entity_type}
          onValueChange={(v) => setProfile({ ...profile, entity_type: v as 'individual' | 'company', tax_id: '' })}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="individual" id="ind" />
            <Label htmlFor="ind" className="font-normal cursor-pointer">Pessoa física (CPF)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="company" id="comp" />
            <Label htmlFor="comp" className="font-normal cursor-pointer">Pessoa jurídica (CNPJ)</Label>
          </div>
        </RadioGroup>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{profile.entity_type === 'company' ? 'Razão social' : 'Nome completo'}</Label>
            <Input value={profile.legal_name} onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })} />
          </div>
          <div>
            <Label>{profile.entity_type === 'company' ? 'CNPJ' : 'CPF'}</Label>
            <Input value={profile.tax_id} onChange={(e) => setProfile({ ...profile, tax_id: e.target.value })} />
          </div>
          <div>
            <Label>Email de cobrança</Label>
            <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input value={profile.address_line1} onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })} placeholder="Rua, número" />
          </div>
          <div className="md:col-span-2">
            <Label>Complemento</Label>
            <Input value={profile.address_line2} onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </div>
          <div>
            <Label>UF</Label>
            <Input value={profile.state} maxLength={2} onChange={(e) => setProfile({ ...profile, state: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} />
          </div>
          <div>
            <Label>País</Label>
            <Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value.toUpperCase() })} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar dados fiscais
        </Button>
      </CardContent>
    </Card>
  );
}

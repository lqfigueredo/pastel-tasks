
-- Tabela de documentos legais com histórico de versões
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('terms', 'privacy')),
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);

CREATE INDEX idx_legal_documents_type_version ON public.legal_documents (doc_type, version DESC);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Leitura pública (anon + authenticated)
CREATE POLICY "Anyone can read legal documents"
ON public.legal_documents
FOR SELECT
TO anon, authenticated
USING (true);

-- Apenas solution_admin pode inserir novas versões
CREATE POLICY "Solution admins can insert legal documents"
ON public.legal_documents
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'solution_admin'::app_role));

-- Versões publicadas são imutáveis: sem UPDATE/DELETE policies (negado por padrão)

-- Seed: Termos de Uso v1
INSERT INTO public.legal_documents (doc_type, version, content) VALUES (
  'terms',
  1,
  E'# Termos de Uso\n\n_Última atualização: data da publicação._\n\n> **Aviso:** Este texto é um modelo inicial e deve ser revisado por um profissional jurídico antes do uso em produção.\n\n## 1. Aceitação dos Termos\n\nAo criar uma conta ou utilizar a plataforma NEVVOH ("Serviço"), você ("Usuário") concorda integralmente com estes Termos de Uso. Caso não concorde, não utilize o Serviço.\n\n## 2. Descrição do Serviço\n\nO NEVVOH é uma plataforma SaaS de gestão de tarefas, equipes, reuniões, ideias e conhecimento, oferecida sob assinatura mensal por assento.\n\n## 3. Cadastro e Conta\n\n- O Usuário deve fornecer informações verdadeiras, completas e atualizadas.\n- O Usuário é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta.\n- Contas podem ser suspensas em caso de uso indevido, fraude ou inadimplência.\n\n## 4. Assinatura e Pagamento\n\n- O Serviço é cobrado por assento (usuário ativo), com mínimo de 10 assentos por administrador.\n- Período de teste gratuito (trial) de 14 dias, sem necessidade de cartão de crédito.\n- Após o trial, a continuidade do uso requer assinatura ativa.\n- Atrasos no pagamento podem resultar em suspensão do acesso.\n\n## 5. Uso Aceitável\n\nÉ vedado:\n- Utilizar o Serviço para fins ilícitos.\n- Tentar acessar dados de outros usuários sem autorização.\n- Realizar engenharia reversa, scraping ou ataques ao Serviço.\n- Enviar conteúdo ofensivo, difamatório ou que viole direitos de terceiros.\n\n## 6. Propriedade Intelectual\n\n- O software, marca, design e conteúdo do NEVVOH são de propriedade exclusiva da empresa.\n- O conteúdo gerado pelo Usuário (tarefas, anexos, ideias, etc.) permanece de sua propriedade. O Usuário concede licença limitada à plataforma para armazenar e processar esse conteúdo conforme necessário para a prestação do Serviço.\n\n## 7. Limitação de Responsabilidade\n\nO Serviço é fornecido "no estado em que se encontra". A empresa não se responsabiliza por:\n- Perdas de dados decorrentes de uso indevido.\n- Indisponibilidades causadas por eventos fora de seu controle.\n- Lucros cessantes ou danos indiretos.\n\n## 8. Cancelamento\n\nO Usuário pode cancelar sua assinatura a qualquer momento. O acesso permanece ativo até o final do período já pago. Não há reembolso proporcional.\n\n## 9. Alterações nos Termos\n\nA empresa pode atualizar estes Termos a qualquer momento. Alterações relevantes serão comunicadas por e-mail ou na plataforma.\n\n## 10. Foro\n\nFica eleito o foro da comarca da sede da empresa para dirimir quaisquer questões oriundas destes Termos.\n\n---\n\nDúvidas? Entre em contato pelo suporte da plataforma.'
);

-- Seed: Política de Privacidade v1
INSERT INTO public.legal_documents (doc_type, version, content) VALUES (
  'privacy',
  1,
  E'# Política de Privacidade\n\n_Última atualização: data da publicação._\n\n> **Aviso:** Este texto é um modelo inicial e deve ser revisado por um profissional jurídico antes do uso em produção, especialmente para conformidade com a LGPD (Lei nº 13.709/2018).\n\n## 1. Controlador de Dados\n\nO NEVVOH é o controlador dos dados pessoais coletados pela plataforma, conforme a Lei Geral de Proteção de Dados (LGPD).\n\n## 2. Dados Coletados\n\n**Dados fornecidos pelo Usuário:**\n- Nome, e-mail, senha (armazenada com hash).\n- Dados fiscais (para clientes pagantes): CNPJ/CPF, razão social, endereço.\n- Conteúdo gerado: tarefas, comentários, anexos, ideias, atas de reunião.\n\n**Dados coletados automaticamente:**\n- Endereço IP, tipo de navegador, sistema operacional.\n- Logs de acesso e uso da plataforma.\n- Cookies essenciais para autenticação.\n\n## 3. Finalidade do Tratamento\n\nUtilizamos seus dados para:\n- Prestação do Serviço contratado.\n- Autenticação e segurança da conta.\n- Emissão de notas fiscais e cobrança.\n- Envio de notificações operacionais e comerciais (este último com consentimento).\n- Cumprimento de obrigações legais.\n\n## 4. Base Legal (LGPD)\n\n- **Execução de contrato**: para a maioria das funcionalidades da plataforma.\n- **Consentimento**: para comunicações de marketing.\n- **Obrigação legal**: para retenção de dados fiscais.\n- **Legítimo interesse**: para segurança e prevenção de fraudes.\n\n## 5. Compartilhamento\n\nNão vendemos dados pessoais. Compartilhamos apenas com:\n- Provedores de infraestrutura (hospedagem, e-mail transacional) sob contrato de confidencialidade.\n- Autoridades, quando exigido por lei.\n\n## 6. Armazenamento e Segurança\n\n- Os dados são armazenados em servidores na nuvem com criptografia em trânsito (HTTPS) e em repouso.\n- Aplicamos controle de acesso por papéis (RLS) e isolamento entre clientes.\n- Backups automáticos diários.\n\n## 7. Retenção\n\n- Dados de conta: enquanto a conta estiver ativa.\n- Dados fiscais: pelo prazo exigido pela legislação tributária (mínimo 5 anos).\n- Logs de auditoria: até 24 meses.\n- Após o cancelamento, dados podem ser anonimizados ou excluídos mediante solicitação, respeitando obrigações legais.\n\n## 8. Direitos do Titular (LGPD)\n\nVocê pode, a qualquer momento:\n- Confirmar a existência de tratamento dos seus dados.\n- Acessar, corrigir ou solicitar a exclusão dos seus dados.\n- Revogar consentimentos.\n- Solicitar portabilidade.\n- Apresentar reclamação à ANPD.\n\nPara exercer seus direitos, entre em contato pelo suporte ou e-mail informado abaixo.\n\n## 9. Cookies\n\nUtilizamos apenas cookies essenciais para o funcionamento da plataforma (autenticação). Não utilizamos cookies de rastreamento de terceiros sem consentimento explícito.\n\n## 10. Encarregado (DPO)\n\nPara questões relacionadas à LGPD, entre em contato pelo canal de suporte da plataforma.\n\n## 11. Alterações nesta Política\n\nPodemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas por e-mail ou na plataforma.\n\n---\n\nÚltima revisão: versão inicial.'
);

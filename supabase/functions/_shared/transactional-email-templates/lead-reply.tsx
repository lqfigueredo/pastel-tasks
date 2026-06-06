import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Nevvoh'
const SITE_URL = 'https://nevvoh.com'
const LOGO_URL = 'https://pzhwmxmlozmwvscndirw.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface LeadReplyProps {
  leadName?: string
  message?: string
}

const LeadReplyEmail = ({ leadName, message }: LeadReplyProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Mensagem da equipe {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logo} />
        <Heading style={h1}>
          {leadName ? `Olá, ${leadName}!` : 'Olá!'}
        </Heading>
        <Text style={text}>
          {message || 'Agradecemos pelo seu interesse no Nevvoh! Estamos entrando em contato para informá-lo que você já pode se cadastrar na nossa plataforma.'}
        </Text>
        <Button style={button} href={`${SITE_URL}/financeiro/cadastro`}>
          Cadastre-se agora
        </Button>
        <Text style={footer}>
          Atenciosamente,{'\n'}Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadReplyEmail,
  subject: 'Mensagem da equipe Nevvoh',
  displayName: 'Resposta ao lead',
  previewData: { leadName: 'Maria', message: 'Você já pode se cadastrar no Nevvoh! Acesse o link abaixo para criar sua conta.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logo = { borderRadius: '12px', marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2e2a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 28px', whiteSpace: 'pre-line' as const }
const button = {
  backgroundColor: '#3a9e8f',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginBottom: '28px',
}
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0', whiteSpace: 'pre-line' as const }

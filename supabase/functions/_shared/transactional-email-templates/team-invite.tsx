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

interface TeamInviteProps {
  inviterName?: string
  inviteeName?: string
  teamName?: string
  acceptUrl?: string
  expiresInDays?: number
}

const TeamInviteEmail = ({
  inviterName = 'Sua equipe',
  inviteeName,
  teamName,
  acceptUrl = SITE_URL,
  expiresInDays = 7,
}: TeamInviteProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{inviterName} convidou você para o {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logo} />
        <Heading style={h1}>
          {inviteeName ? `Olá, ${inviteeName}!` : 'Você foi convidado!'}
        </Heading>
        <Text style={text}>
          <strong>{inviterName}</strong> convidou você para colaborar
          {teamName ? ` no time "${teamName}"` : ''} dentro do {SITE_NAME}.
        </Text>
        <Text style={text}>
          Clique no botão abaixo para criar sua conta e começar a usar a plataforma. É rápido — basta definir uma senha.
        </Text>
        <Button style={button} href={acceptUrl}>
          Aceitar convite
        </Button>
        <Text style={smallText}>
          Este convite expira em {expiresInDays} dias. Se você não esperava esta mensagem, pode ignorá-la com segurança.
        </Text>
        <Text style={footer}>
          Atenciosamente,{'\n'}Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: (data: Record<string, any>) =>
    data.inviterName
      ? `${data.inviterName} convidou você para o ${SITE_NAME}`
      : `Você foi convidado para o ${SITE_NAME}`,
  displayName: 'Convite de equipe',
  previewData: {
    inviterName: 'João Silva',
    inviteeName: 'Maria',
    teamName: 'Marketing',
    acceptUrl: `${SITE_URL}/convite/exemplo-token-123`,
    expiresInDays: 7,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logo = { borderRadius: '12px', marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2e2a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 18px' }
const smallText = { fontSize: '13px', color: '#888888', lineHeight: '1.5', margin: '20px 0 0' }
const button = {
  backgroundColor: '#3a9e8f',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginTop: '12px',
  marginBottom: '12px',
}
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0', whiteSpace: 'pre-line' as const }

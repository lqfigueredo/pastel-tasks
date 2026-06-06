import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Nevvoh'
const SITE_URL = 'https://nevvoh.com'
const LOGO_URL = 'https://pzhwmxmlozmwvscndirw.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface PendingTask {
  title: string
  estimatedDeliveryDate: string
  isOverdue: boolean
}

interface PendingMeeting {
  description: string
  dueDate: string
  meetingId: string
  isOverdue: boolean
}

interface DailyPendingSummaryProps {
  userName?: string
  tasks?: PendingTask[]
  meetingPendencies?: PendingMeeting[]
  todayFormatted?: string
}

const DailyPendingSummaryEmail = ({
  userName,
  tasks = [],
  meetingPendencies = [],
  todayFormatted,
}: DailyPendingSummaryProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Resumo de pendências — {todayFormatted || 'Hoje'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logo} />
        <Heading style={h1}>
          {userName ? `Olá, ${userName}!` : 'Olá!'}
        </Heading>
        <Text style={text}>
          Aqui está o resumo das suas pendências para hoje:
        </Text>

        {tasks.length > 0 && (
          <Section>
            <Heading style={h2}>📋 Tarefas ({tasks.length})</Heading>
            {tasks.map((task, i) => (
              <Section key={i} style={itemBox}>
                <Text style={itemTitle}>{task.title}</Text>
                <Text style={itemMeta}>
                  <span style={task.isOverdue ? badgeOverdue : badgeToday}>
                    {task.isOverdue ? 'Atrasada' : 'Vence hoje'}
                  </span>
                  {' '} Prazo: {task.estimatedDeliveryDate}
                </Text>
              </Section>
            ))}
            <Button style={button} href={`${SITE_URL}/tarefas`}>
              Ver tarefas
            </Button>
          </Section>
        )}

        {meetingPendencies.length > 0 && (
          <Section>
            {tasks.length > 0 && <Hr style={divider} />}
            <Heading style={h2}>📝 Pendências de reunião ({meetingPendencies.length})</Heading>
            {meetingPendencies.map((p, i) => (
              <Section key={i} style={itemBox}>
                <Text style={itemTitle}>{p.description}</Text>
                <Text style={itemMeta}>
                  <span style={p.isOverdue ? badgeOverdue : badgeToday}>
                    {p.isOverdue ? 'Atrasada' : 'Vence hoje'}
                  </span>
                  {' '} Prazo: {p.dueDate}
                </Text>
                <Button style={linkBtn} href={`${SITE_URL}/atas/${p.meetingId}`}>
                  Ver pendência →
                </Button>
              </Section>
            ))}
          </Section>
        )}

        <Text style={footer}>
          Atenciosamente,{'\n'}Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyPendingSummaryEmail,
  subject: (data: Record<string, any>) =>
    `Pendências do dia — ${data.todayFormatted || 'Hoje'}`,
  displayName: 'Resumo diário de pendências',
  previewData: {
    userName: 'João',
    todayFormatted: '09/04/2026',
    tasks: [
      { title: 'Finalizar relatório mensal', estimatedDeliveryDate: '09/04/2026', isOverdue: false },
      { title: 'Revisar documentação', estimatedDeliveryDate: '07/04/2026', isOverdue: true },
    ],
    meetingPendencies: [
      { description: 'Enviar proposta para o cliente', dueDate: '09/04/2026', meetingId: 'abc-123', isOverdue: false },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logo = { borderRadius: '12px', marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2e2a', margin: '0 0 20px' }
const h2 = { fontSize: '17px', fontWeight: '600' as const, color: '#1a2e2a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px', whiteSpace: 'pre-line' as const }
const itemBox = { backgroundColor: '#f8fafb', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '8px' }
const itemTitle = { fontSize: '15px', fontWeight: '600' as const, color: '#1a2e2a', margin: '0 0 4px' }
const itemMeta = { fontSize: '13px', color: '#6b7280', margin: '0' }
const badgeOverdue = { backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' as const }
const badgeToday = { backgroundColor: '#f0faf7', color: '#3a9e8f', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' as const }
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
const linkBtn = {
  fontSize: '13px',
  color: '#3a9e8f',
  textDecoration: 'underline',
  marginTop: '4px',
  display: 'inline-block' as const,
  padding: '0',
  background: 'none',
}
const divider = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0', whiteSpace: 'pre-line' as const }

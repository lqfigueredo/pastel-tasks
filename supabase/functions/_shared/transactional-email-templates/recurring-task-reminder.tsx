import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NEVVOH'
const LOGO_URL = 'https://pzhwmxmlozmwvscndirw.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface RecurringTaskReminderProps {
  taskTitle?: string
  userName?: string
  dueDate?: string
}

const RecurringTaskReminderEmail = ({ taskTitle, userName, dueDate }: RecurringTaskReminderProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Tarefa recorrente: {taskTitle || 'Nova tarefa'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logo} />
        <Heading style={h1}>
          {userName ? `Olá, ${userName}!` : 'Olá!'}
        </Heading>
        <Text style={text}>
          Uma nova tarefa recorrente foi criada e atribuída a você:
        </Text>
        <Text style={taskBox}>
          📋 {taskTitle || 'Tarefa sem título'}
        </Text>
        {dueDate && (
          <Text style={dateText}>
            📅 Data: {dueDate}
          </Text>
        )}
        <Text style={text}>
          Acesse o {SITE_NAME} para visualizar os detalhes e acompanhar o progresso.
        </Text>
        <Text style={footer}>
          Atenciosamente,{'\n'}Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RecurringTaskReminderEmail,
  subject: (data: Record<string, any>) => `Tarefa recorrente: ${data.taskTitle || 'Nova tarefa'}`,
  displayName: 'Lembrete de tarefa recorrente',
  previewData: { taskTitle: 'Relatório semanal', userName: 'João', dueDate: '2026-04-10' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logo = { borderRadius: '12px', marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2e2a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px', whiteSpace: 'pre-line' as const }
const taskBox = { fontSize: '16px', fontWeight: '600' as const, color: '#1a2e2a', backgroundColor: '#f0faf7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1ede6', margin: '0 0 12px' }
const dateText = { fontSize: '14px', color: '#3a9e8f', margin: '0 0 20px' }
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0', whiteSpace: 'pre-line' as const }

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as leadReply } from './lead-reply.tsx'
import { template as recurringTaskReminder } from './recurring-task-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'lead-reply': leadReply,
  'recurring-task-reminder': recurringTaskReminder,
}

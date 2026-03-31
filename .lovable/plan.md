

# Correção: Notificação navegando para rota errada (404)

## Problema
No `NotificationBell.tsx`, o clique em notificações de pendência navega para `/meeting-minutes/${id}`, mas a rota correta definida no `App.tsx` é `/atas/${id}`.

## Correção
No arquivo `src/components/NotificationBell.tsx`, linha 87, alterar:
- **De:** `navigate(\`/meeting-minutes/${n.reference_id}\`)`
- **Para:** `navigate(\`/atas/${n.reference_id}\`)`

Além disso, verificar se o `reference_id` salvo nas notificações de pendência corresponde ao `meeting_id` da pendência (necessário para a rota `/atas/:meetingId`), já que a edge function pode estar salvando o ID da pendência em vez do ID da ata.

## Arquivo editado
- `src/components/NotificationBell.tsx`


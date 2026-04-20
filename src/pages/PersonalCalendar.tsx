import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  format, addMonths, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { HelpButton } from '@/components/HelpButton';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_by: string;
  meeting_id: string | null;
}

export default function PersonalCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', format(calStart, 'yyyy-MM-dd'))
      .lte('event_date', format(calEnd, 'yyyy-MM-dd'))
      .order('start_time', { ascending: true, nullsFirst: false });

    setEvents(data || []);
  }, [user, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [days]);

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.event_date + 'T00:00:00'), day));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <HelpButton pageKey="calendar" />
          </div>
          <p className="text-sm text-muted-foreground">Seus compromissos e reuniões</p>
        </div>
        <Button onClick={() => { setSelectedDate(undefined); setCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold capitalize text-foreground">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(d => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {weeks.map((weekDays, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {weekDays.map((day, di) => {
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={di}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[120px] border-b border-r border-border p-1.5 cursor-pointer transition-colors hover:bg-accent/10 ${
                    !inMonth ? 'bg-muted/30' : ''
                  } ${today ? 'bg-accent/20' : ''}`}
                >
                  <span className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                  }`}>
                    {format(day, 'd')}
                  </span>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(event => (
                      <button
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className="flex w-full items-center gap-1 rounded bg-primary/10 border-l-2 border-primary px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-primary/20"
                      >
                        {event.start_time && (
                          <span className="shrink-0 text-muted-foreground">{event.start_time.slice(0, 5)}</span>
                        )}
                        <span className="truncate text-foreground">{event.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block px-1.5 text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchEvents}
        initialDate={selectedDate}
      />

      <EventDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        event={selectedEvent}
        onUpdated={fetchEvents}
      />
    </div>
  );
}

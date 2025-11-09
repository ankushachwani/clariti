'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  tasks: any[];
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const daysInView = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const tasksOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((task) =>
      task.dueDate ? isSameDay(new Date(task.dueDate), selectedDate) : false
    );
  }, [tasks, selectedDate]);

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) =>
      task.dueDate ? isSameDay(new Date(task.dueDate), day) : false
    );
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-sunset-coral';
    if (priority >= 5) return 'bg-clay-orange';
    return 'bg-sunflower-yellow';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 bg-cream-white rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-serif text-forest-green">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-forest-green bg-moss-green/20 hover:bg-moss-green/30 rounded-full transition-all border border-moss-green/30"
            >
              Today
            </button>
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-stone-beige rounded-full transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-forest-green" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-stone-beige rounded-full transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-forest-green" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-bold text-bark-brown py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {daysInView.map((day) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
            const isTodayDay = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  min-h-[80px] p-2 rounded-2xl border-2 transition-all
                  ${isCurrentMonth ? 'bg-stone-beige/30' : 'bg-sage-gray/10'}
                  ${isSelectedDay ? 'ring-2 ring-moss-green border-moss-green' : 'border-sage-gray/30'}
                  ${isTodayDay && !isSelectedDay ? 'ring-2 ring-forest-green/50 border-forest-green/50' : ''}
                  hover:bg-stone-beige hover:shadow-sm
                `}
              >
                <div className="flex flex-col h-full">
                  <span
                    className={`text-sm font-medium mb-1 ${
                      isCurrentMonth
                        ? 'text-forest-green'
                        : 'text-sage-gray'
                    } ${isTodayDay ? 'font-bold text-moss-green' : ''}`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {dayTasks.slice(0, 3).map((task, idx) => (
                        <div
                          key={task.id}
                          className={`w-2 h-2 rounded-full ${getPriorityColor(
                            task.priority
                          )}`}
                          title={task.title}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-xs text-bark-brown font-medium">
                          +{dayTasks.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Tasks */}
      <div className="bg-cream-white rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 p-6 h-fit">
        <h3 className="text-lg font-bold font-serif text-forest-green mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
        </h3>

        {selectedDate && tasksOnSelectedDate.length > 0 ? (
          <div className="space-y-3">
            {tasksOnSelectedDate.map((task) => (
              <div
                key={task.id}
                className="border-2 border-sage-gray/30 rounded-2xl p-3 bg-stone-beige/20 hover:bg-stone-beige/40 transition-all"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(
                      task.priority
                    )}`}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-forest-green">
                      {task.title}
                    </h4>
                    {task.course && (
                      <p className="text-xs text-bark-brown mt-1">
                        {task.course}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-moss-green/20 text-forest-green px-2 py-1 rounded-full font-medium">
                        {task.source}
                      </span>
                      {task.completed && (
                        <span className="text-xs bg-moss-green/30 text-forest-green px-2 py-1 rounded-full font-medium">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : selectedDate ? (
          <p className="text-sm text-bark-brown text-center py-8">
            No tasks on this date
          </p>
        ) : (
          <p className="text-sm text-bark-brown text-center py-8">
            Select a date to view tasks
          </p>
        )}
      </div>
    </div>
  );
}

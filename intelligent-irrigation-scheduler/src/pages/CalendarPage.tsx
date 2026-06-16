import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import {
  Plus,
  X,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Droplets,
  DollarSign,
  Sprout,
  AlertTriangle,
  CheckCircle2,
  Save,
  CloudRain,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type {
  CalendarTask,
  TaskStatus,
  TaskCreateRequest,
} from '../../shared/types';

const STATUS_OPTIONS: { value: TaskStatus; label: string; cls: string }[] = [
  { value: 'pending', label: '待执行', cls: 'badge-info' },
  { value: 'in_progress', label: '进行中', cls: 'badge-warning' },
  { value: 'completed', label: '已完成', cls: 'badge-success' },
  { value: 'cancelled', label: '已取消', cls: 'badge-danger' },
];

const STATUS_BG: Record<TaskStatus, string> = {
  pending: '#4A90B8',
  in_progress: '#E8A838',
  completed: '#2D5A3D',
  cancelled: '#9CA3AF',
};

function taskToEvent(task: CalendarTask) {
  return {
    id: task.id,
    title: task.title,
    start: task.start,
    end: task.end,
    allDay: task.allDay || false,
    backgroundColor: task.backgroundColor || STATUS_BG[task.status],
    borderColor: task.borderColor || STATUS_BG[task.status],
    extendedProps: {
      ...task.extendedProps,
      status: task.status,
    },
  };
}

export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const { tasks, createTask, updateTask, deleteTask, weather, cropParams, userConfig } =
    useAppStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showRainConfirm, setShowRainConfirm] = useState<{
    task: CalendarTask;
    newStart: string;
    newEnd: string;
    rainProb: number;
  } | null>(null);

  const [formData, setFormData] = useState<TaskCreateRequest>({
    title: '',
    start: dayjs().hour(8).minute(0).second(0).toISOString(),
    end: dayjs().hour(9).minute(30).second(0).toISOString(),
    status: 'pending',
    extendedProps: {
      waterAmount: 100,
      durationMinutes: 90,
      estimatedCost: 180,
      cropType: cropParams.cropType,
      cropName: cropParams.cropName,
      area: cropParams.plantingArea || userConfig.plantingArea,
      notes: '',
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [editData, setEditData] = useState<Partial<CalendarTask>>({});

  const events = tasks.map(taskToEvent);

  const checkRainAtTime = (startISO: string): number => {
    if (!weather?.hourly?.length) return 0;
    const target = dayjs(startISO);
    const closest = weather.hourly.reduce(
      (best, h) => {
        const diff = Math.abs(dayjs(h.time).diff(target, 'minute'));
        return diff < best.diff ? { h, diff } : best;
      },
      { h: weather.hourly[0], diff: Infinity }
    );
    return closest.h.precipitationProb;
  };

  const handleEventClick = (info: EventClickArg) => {
    const id = info.event.id;
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setSelectedTask(task);
      setEditData({
        ...task,
        extendedProps: { ...task.extendedProps },
      });
      setIsEditing(false);
    }
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const id = info.event.id;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStart = info.event.startStr;
    const newEnd = info.event.endStr || info.event.startStr;
    const rainProb = checkRainAtTime(newStart);

    if (rainProb >= 60) {
      setShowRainConfirm({ task, newStart, newEnd, rainProb });
      info.revert();
      return;
    }

    await updateTask(id, { start: newStart, end: newEnd });
  };

  const confirmRainDrop = async () => {
    if (!showRainConfirm) return;
    const { task, newStart, newEnd } = showRainConfirm;
    await updateTask(task.id, {
      start: newStart,
      end: newEnd,
      extendedProps: { delayByRain: true },
    });
    setShowRainConfirm(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = '请输入任务标题';
    if (!formData.start) errors.start = '请选择开始时间';
    if (!formData.end) errors.end = '请选择结束时间';
    if (formData.start && formData.end && dayjs(formData.end).isBefore(dayjs(formData.start))) {
      errors.end = '结束时间不能早于开始时间';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTask = async () => {
    if (!validateForm()) return;
    const task = await createTask({
      ...formData,
      extendedProps: {
        ...formData.extendedProps,
        durationMinutes: dayjs(formData.end).diff(dayjs(formData.start), 'minute'),
      },
    });
    if (task) {
      setShowNewModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      start: dayjs().hour(8).minute(0).second(0).toISOString(),
      end: dayjs().hour(9).minute(30).second(0).toISOString(),
      status: 'pending',
      extendedProps: {
        waterAmount: 100,
        durationMinutes: 90,
        estimatedCost: 180,
        cropType: cropParams.cropType,
        cropName: cropParams.cropName,
        area: cropParams.plantingArea || userConfig.plantingArea,
        notes: '',
      },
    });
    setFormErrors({});
  };

  const handleSaveEdit = async () => {
    if (!selectedTask || !editData) return;
    const { id, ...rest } = editData as Partial<CalendarTask> & { id: string };
    const updated = await updateTask(selectedTask.id, {
      title: rest.title,
      start: rest.start,
      end: rest.end,
      status: rest.status,
      extendedProps: rest.extendedProps,
    });
    if (updated) {
      setSelectedTask(updated);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    if (window.confirm('确定要删除此任务吗？')) {
      const ok = await deleteTask(selectedTask.id);
      if (ok) {
        setSelectedTask(null);
      }
    }
  };

  useEffect(() => {
    if (formData.start && formData.end) {
      const dur = dayjs(formData.end).diff(dayjs(formData.start), 'minute');
      setFormData((prev) => ({
        ...prev,
        extendedProps: { ...prev.extendedProps, durationMinutes: Math.max(dur, 0) },
      }));
    }
  }, [formData.start, formData.end]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
            农事日历
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            智能调度灌溉任务，支持拖拽调整与降雨提醒
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建任务
        </button>
      </div>

      <div className="glass-card p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
          }}
          locale="zh-cn"
          buttonText={{
            today: '今天',
            month: '月',
            week: '周',
            day: '日',
            list: '列表',
          }}
          events={events}
          editable={true}
          eventResizableFromStart={true}
          dayMaxEvents={true}
          height="auto"
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={async (info) => {
            const id = info.event.id;
            await updateTask(id, {
              start: info.event.startStr,
              end: info.event.endStr || info.event.startStr,
            });
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_BG[s.value] }}
            />
            <span className="text-gray-600 dark:text-gray-300">{s.label}</span>
          </div>
        ))}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up">
            <div className="sticky top-0 glass-card !rounded-none !p-5 flex items-center justify-between border-b border-white/20 z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary-green" />
                </div>
                <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                  新建灌溉任务
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label-text">任务标题 *</label>
                <input
                  type="text"
                  className={cn(
                    'input-field',
                    formErrors.title && '!border-red-400 !ring-red-400/30'
                  )}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="例：冬小麦返青期灌溉"
                />
                {formErrors.title && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">开始时间 *</label>
                  <input
                    type="datetime-local"
                    className={cn(
                      'input-field',
                      formErrors.start && '!border-red-400 !ring-red-400/30'
                    )}
                    value={dayjs(formData.start).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        start: dayjs(e.target.value).toISOString(),
                      })
                    }
                  />
                  {formErrors.start && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.start}</p>
                  )}
                </div>
                <div>
                  <label className="label-text">结束时间 *</label>
                  <input
                    type="datetime-local"
                    className={cn(
                      'input-field',
                      formErrors.end && '!border-red-400 !ring-red-400/30'
                    )}
                    value={dayjs(formData.end).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        end: dayjs(e.target.value).toISOString(),
                      })
                    }
                  />
                  {formErrors.end && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.end}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-blue" />
                    灌水量（m³）
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.extendedProps.waterAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extendedProps: {
                          ...formData.extendedProps,
                          waterAmount: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label-text flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-soil-brown" />
                    预计成本（元）
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.extendedProps.estimatedCost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extendedProps: {
                          ...formData.extendedProps,
                          estimatedCost: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label-text flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-primary-green" />
                  备注
                </label>
                <textarea
                  className="input-field min-h-[80px] resize-none"
                  value={formData.extendedProps.notes || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      extendedProps: {
                        ...formData.extendedProps,
                        notes: e.target.value,
                      },
                    })
                  }
                  placeholder="灌溉注意事项..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 glass-card !rounded-none !p-4 flex items-center justify-end gap-3 border-t border-white/20">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  resetForm();
                }}
                className="btn-outline text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                创建任务
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 glass-card !rounded-none !p-5 flex items-center justify-between border-b border-white/20 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: STATUS_BG[selectedTask.status] }}
                >
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  {isEditing ? (
                    <input
                      className="input-field !py-1.5 !text-base font-bold !px-3"
                      value={editData.title || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                    />
                  ) : (
                    <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100 truncate">
                      {selectedTask.title}
                    </h3>
                  )}
                  <span
                    className={cn(
                      'badge mt-1',
                      STATUS_OPTIONS.find((s) => s.value === selectedTask.status)?.cls
                    )}
                  >
                    {STATUS_OPTIONS.find((s) => s.value === selectedTask.status)?.label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {isEditing ? (
                  <>
                    <div>
                      <label className="label-text">开始时间</label>
                      <input
                        type="datetime-local"
                        className="input-field"
                        value={dayjs(editData.start).format('YYYY-MM-DDTHH:mm')}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            start: dayjs(e.target.value).toISOString(),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label-text">结束时间</label>
                      <input
                        type="datetime-local"
                        className="input-field"
                        value={dayjs(editData.end).format('YYYY-MM-DDTHH:mm')}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            end: dayjs(e.target.value).toISOString(),
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        开始时间
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-100">
                        {dayjs(selectedTask.start).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        结束时间
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-100">
                        {dayjs(selectedTask.end).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {isEditing && (
                <div>
                  <label className="label-text">任务状态</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setEditData({ ...editData, status: s.value })}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm transition-all',
                          editData.status === s.value
                            ? s.cls + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/60 dark:border-slate-600/30">
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                    <Droplets className="w-3 h-3 text-sky-blue" />
                    灌水量
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      className="input-field !py-1 !px-2 !text-center !text-sm"
                      value={editData.extendedProps?.waterAmount || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          extendedProps: {
                            ...editData.extendedProps!,
                            waterAmount: Number(e.target.value),
                          },
                        })
                      }
                    />
                  ) : (
                    <div className="font-bold text-sky-blue">
                      {selectedTask.extendedProps.waterAmount} m³
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-amber" />
                    时长
                  </div>
                  <div className="font-bold text-amber-dark dark:text-amber-light">
                    {dayjs(selectedTask.end).diff(dayjs(selectedTask.start), 'minute')} 分
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                    <DollarSign className="w-3 h-3 text-soil-brown" />
                    成本
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      className="input-field !py-1 !px-2 !text-center !text-sm"
                      value={editData.extendedProps?.estimatedCost || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          extendedProps: {
                            ...editData.extendedProps!,
                            estimatedCost: Number(e.target.value),
                          },
                        })
                      }
                    />
                  ) : (
                    <div className="font-bold text-soil-brown">
                      ¥{selectedTask.extendedProps.estimatedCost}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary-green/5 border border-primary-green/10 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Sprout className="w-3.5 h-3.5" />
                    作物
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {selectedTask.extendedProps.cropName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">面积</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {selectedTask.extendedProps.area} 亩
                  </span>
                </div>
                {selectedTask.extendedProps.delayByRain && (
                  <div className="flex items-center gap-1 pt-1 text-amber-dark dark:text-amber-light">
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>降雨后调整</span>
                  </div>
                )}
              </div>

              {selectedTask.extendedProps.notes && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/30">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">备注</div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                    {selectedTask.extendedProps.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 glass-card !rounded-none !p-4 flex items-center justify-between gap-3 border-t border-white/20">
              {isEditing ? (
                <>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({ ...selectedTask });
                      }}
                      className="btn-outline text-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="btn-primary text-sm flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showRainConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 animate-slide-up text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber animate-pulse-soft" />
            </div>
            <h3 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-2">
              降雨时段提醒
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
              该时段预报降雨概率为
              <span className="font-bold text-sky-blue mx-1">
                {showRainConfirm.rainProb}%
              </span>
              ，是否确认将任务调整到此时段？
            </p>
            <div className="p-3 rounded-xl bg-sky-blue/10 text-sm text-sky-blue-dark dark:text-sky-blue-light mb-5">
              建议：考虑延后灌溉，利用自然降雨节水
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowRainConfirm(null)}
                className="btn-outline text-sm"
              >
                取消调整
              </button>
              <button
                onClick={confirmRainDrop}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                确认移动
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
